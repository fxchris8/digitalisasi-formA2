import * as dotenv from "dotenv"
import { expand } from "dotenv-expand"
import { Pool } from "pg"

expand(dotenv.config())

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function createSchema(): Promise<void> {
  const client = await pool.connect()

  try {
    await client.query("BEGIN")

    // ── ENUM TYPES ────────────────────────────────────────────────────────────
    //
    // form_status  : status utama form_a2 selama siklus hidupnya.
    //   'pending'  mencakup semua tahap approval (spm → nautica → finance).
    //   Tahap aktif dilacak via kolom current_step di form_a2.
    //
    // approval_step: nilai-nya sengaja disamakan dengan users.department,
    //   sehingga untuk mencari approver cukup WHERE department = current_step.
    //
    // approval_status: hasil aksi per-baris di form_a2_approval_log.

    await client.query(/* sql */ `
      DO $$ BEGIN
        CREATE TYPE form_status AS ENUM (
          'draft',
          'submitted',
          'pending',
          'revision',
          'rejected',
          'approved'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `)

    await client.query(/* sql */ `
      DO $$ BEGIN
        CREATE TYPE approval_status AS ENUM (
          'pending',
          'approved',
          'revision',
          'rejected'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `)

    await client.query(/* sql */ `
      DO $$ BEGIN
        CREATE TYPE approval_step AS ENUM (
          'spm',
          'nautica',
          'finance'
        );
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `)

    // ── TABLES ────────────────────────────────────────────────────────────────

    await client.query(/* sql */ `
      CREATE TABLE IF NOT EXISTS users (
        id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        full_name     VARCHAR(255)  NOT NULL,
        username      VARCHAR(100)  UNIQUE NOT NULL,
        email         VARCHAR(255)  UNIQUE NOT NULL,
        password      VARCHAR(255)  NOT NULL,
        role          VARCHAR(50)   NOT NULL,
        department    VARCHAR(100),           -- 'spm' | 'nautica' | 'finance' | NULL
        branch_office VARCHAR(100),           -- diisi jika user dari kantor cabang
        created_at    TIMESTAMP     NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMP     NOT NULL DEFAULT NOW()
      )
    `)

    // Counter untuk generate nomor urut form per tipe per tahun.
    await client.query(/* sql */ `
      CREATE TABLE IF NOT EXISTS form_number_counter (
        form_type   VARCHAR(20)   NOT NULL,   -- 'CR9' | 'A2'
        year        INTEGER       NOT NULL,
        last_seq    INTEGER       NOT NULL DEFAULT 0,
        PRIMARY KEY (form_type, year)
      )
    `)

    // Form CR9 adalah form awal yang dibuat oleh cabang / staff SPM.
    await client.query(/* sql */ `
      CREATE TABLE IF NOT EXISTS form_cr9 (
        id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        created_by    UUID          NOT NULL REFERENCES users(id),
        seq_number    INTEGER       NOT NULL,
        month         INTEGER       NOT NULL,
        year          INTEGER       NOT NULL,
        form_number   VARCHAR(50)   NOT NULL,   -- e.g. CR9/0001/01/2024
        seafarer_code VARCHAR(100)  NOT NULL,
        seaman_code   VARCHAR(100)  NOT NULL,
        seaman_name   VARCHAR(255)  NOT NULL,
        position      VARCHAR(100)  NOT NULL,
        ship          VARCHAR(100)  NOT NULL,
        cr9_url       VARCHAR(500)  NOT NULL,
        receipt_url   VARCHAR(500)  NOT NULL,
        amount        NUMERIC(15,2) NOT NULL,
        status        VARCHAR(50)   NOT NULL DEFAULT 'draft',
        submitted_at  TIMESTAMP,
        created_at    TIMESTAMP     NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMP     NOT NULL DEFAULT NOW(),
        UNIQUE (seq_number, month, year)
      )
    `)

    // Form A2 adalah lanjutan dari CR9, memiliki alur approval multi-step.
    //
    // Alur status:
    //   draft
    //     └─ cabang submit ──────────────────────────────────► submitted
    //                                                            └─ staff SPM lengkapi berita acara & submit ke manager
    //                                                                └─ pending (current_step = 'spm')
    //                                                                     ├─ approved ──► pending (current_step = 'nautica')
    //                                                                     ├─ revision ──► revision (current_step = 'spm')
    //                                                                     └─ rejected ──► rejected ✗
    //                                                                  (dst. untuk nautica → finance → approved ✓)
    await client.query(/* sql */ `
      CREATE TABLE IF NOT EXISTS form_a2 (
        id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
        form_cr9_id             UUID            NOT NULL UNIQUE REFERENCES form_cr9(id),
        created_by              UUID            NOT NULL REFERENCES users(id),
        seq_number              INTEGER         NOT NULL,
        month                   INTEGER         NOT NULL,
        year                    INTEGER         NOT NULL,
        form_number             VARCHAR(50)     NOT NULL,   -- e.g. A2/0001/01/2024
        diagnosis               VARCHAR(500)    NOT NULL,
        news_url                VARCHAR(500),               -- dokumen berita acara, diisi staff SPM
        news_added_by           UUID            REFERENCES users(id),
        news_added_at           TIMESTAMP,
        status                  form_status     NOT NULL DEFAULT 'draft',
        current_step            approval_step,              -- NULL jika belum/sudah selesai
        submitted_at            TIMESTAMP,                  -- saat cabang submit (draft → submitted)
        submitted_to_manager_at TIMESTAMP,                  -- saat staff SPM submit (submitted → pending)
        created_at              TIMESTAMP       NOT NULL DEFAULT NOW(),
        updated_at              TIMESTAMP       NOT NULL DEFAULT NOW(),
        UNIQUE (seq_number, month, year)
      )
    `)

    // Detail biaya per uraian sakit dalam satu form A2 (one-to-many).
    await client.query(/* sql */ `
      CREATE TABLE IF NOT EXISTS form_a2_detail (
        id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        form_a2_id        UUID          NOT NULL REFERENCES form_a2(id),
        description       TEXT          NOT NULL,   -- uraian sakit
        hospital_name     VARCHAR(255)  NOT NULL,
        hospital_category VARCHAR(100)  NOT NULL,
        amount            NUMERIC(15,2) NOT NULL,   -- biaya per uraian
        created_at        TIMESTAMP     NOT NULL DEFAULT NOW()
      )
    `)

    // Riwayat setiap aksi approval (immutable audit log).
    await client.query(/* sql */ `
      CREATE TABLE IF NOT EXISTS form_a2_approval_log (
        id          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
        form_a2_id  UUID            NOT NULL REFERENCES form_a2(id),
        step        approval_step   NOT NULL,
        status      approval_status NOT NULL,
        percentage  NUMERIC(5,2),
        notes       TEXT,
        actioned_by UUID            NOT NULL REFERENCES users(id),
        actioned_at TIMESTAMP       NOT NULL DEFAULT NOW()
      )
    `)

    // Permintaan revisi per form A2.
    // Kolom step menunjukkan di tahap mana revisi diminta,
    // sehingga setelah resolved, form kembali ke pending di step yang sama.
    await client.query(/* sql */ `
      CREATE TABLE IF NOT EXISTS form_a2_revision (
        id            UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
        form_a2_id    UUID            NOT NULL REFERENCES form_a2(id),
        step          approval_step   NOT NULL,
        requested_by  UUID            NOT NULL REFERENCES users(id),
        requested_at  TIMESTAMP       NOT NULL DEFAULT NOW(),
        notes         TEXT,
        resolved_by   UUID            REFERENCES users(id),
        resolved_at   TIMESTAMP,
        is_resolved   BOOLEAN         NOT NULL DEFAULT FALSE
      )
    `)

    await client.query("COMMIT")

    console.log("[db] Schema created successfully.")
  } catch (err) {
    await client.query("ROLLBACK")
    console.error("[db] Failed to create schema:", err)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

createSchema()
