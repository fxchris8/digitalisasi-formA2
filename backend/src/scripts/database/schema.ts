import * as dotenv from "dotenv"
import { expand } from "dotenv-expand"
import { Pool } from "pg"

expand(dotenv.config())

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

const isFresh = process.argv.includes("--fresh")

async function schema(): Promise<void> {
  const client = await pool.connect()

  try {
    await client.query("BEGIN")

    // ── DROP (only with --fresh flag)
    if (isFresh) {
      console.log("[db] --fresh: dropping all tables and types...")

      // Drop tables in reverse dependency order (children before parents)
      await client.query(/* sql */ `
        DROP TABLE IF EXISTS
          form_a2_revision,
          form_a2_approval_log,
          form_a2_detail,
          form_a2,
          form_cr9,
          form_number_counter,
          seamen,
          users
        CASCADE
      `)

      await client.query(/* sql */ `
        DROP TYPE IF EXISTS form_status, approval_status, approval_step CASCADE
      `)
    }

    // ── ENUM TYPES ──
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

    // ── TABLES ──
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

    // Data seamen yang disinkronkan dari API eksternal SPM.
    await client.query(/* sql */ `
      CREATE TABLE IF NOT EXISTS seamen (
        seamancode          VARCHAR(50)   PRIMARY KEY,
        seafarercode        VARCHAR(50),
        name                VARCHAR(255)  NOT NULL,
        gender              VARCHAR(20),
        birthdate           VARCHAR(20),            -- format DD/MM/YYYY dari API
        birthplace          VARCHAR(100),
        age                 INTEGER,
        edu_level           VARCHAR(50),
        certificate         VARCHAR(100),
        experience          VARCHAR(50),
        fleet               VARCHAR(10),
        is_active_employee  VARCHAR(5),             -- 'YES' | 'NO'
        status              VARCHAR(100),           -- 'ON BOARD' | dll.
        start_date          VARCHAR(20),            -- format DD/MM/YYYY
        end_date            VARCHAR(20),            -- format DD/MM/YYYY
        day_elapsed         INTEGER,
        day_remains         INTEGER,
        last_position       VARCHAR(100),
        last_location       VARCHAR(255),
        last_vesselid       VARCHAR(50),
        prevposition        VARCHAR(100),
        prevlocation        VARCHAR(255),
        pic_crewing         VARCHAR(255),
        phone_number_1      VARCHAR(30),
        phone_number_2      VARCHAR(30),
        phone_number_3      VARCHAR(30),
        phone_number_4      VARCHAR(30),
        synced_at           TIMESTAMP     NOT NULL DEFAULT NOW(),
        updated_at          TIMESTAMP     NOT NULL DEFAULT NOW()
      )
    `)

    // Counter untuk generate nomor urut form per tipe per cabang per tahun.
    // branch_office diambil langsung dari field branch_office user (cabang) atau dept (SPM dll).
    await client.query(/* sql */ `
      CREATE TABLE IF NOT EXISTS form_number_counter (
        form_type     VARCHAR(20)   NOT NULL,   -- 'CR9' | 'A2'
        branch_office VARCHAR(100)  NOT NULL,   -- e.g. 'Surabaya' | 'Makassar' | 'SPM'
        year          INTEGER       NOT NULL,
        last_seq      INTEGER       NOT NULL DEFAULT 0,
        PRIMARY KEY (form_type, branch_office, year)
      )
    `)

    // Form CR9 adalah form awal yang dibuat oleh cabang / staff SPM.
    await client.query(/* sql */ `
      CREATE TABLE IF NOT EXISTS form_cr9 (
        id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
        created_by    UUID          NOT NULL REFERENCES users(id),
        branch_office VARCHAR(100)  NOT NULL,   -- diambil dari user.branch_office atau dept (SPM, dll)
        seq_number    INTEGER       NOT NULL,
        month         INTEGER       NOT NULL,
        year          INTEGER       NOT NULL,
        form_number   VARCHAR(100)  NOT NULL UNIQUE, -- e.g. CR9/Surabaya/0001/01/2026
        seafarer_code VARCHAR(100)  NOT NULL,
        seaman_code   VARCHAR(100)  NOT NULL,
        seaman_name   VARCHAR(255)  NOT NULL,
        position      VARCHAR(100)  NOT NULL,
        ship          VARCHAR(100)  NOT NULL,
        complaint     VARCHAR(255)  NOT NULL,   -- jenis keluhan / sakit
        cr9_url              VARCHAR(500)  NOT NULL,
        cr9_url_added_by     UUID          REFERENCES users(id),
        cr9_url_added_at     TIMESTAMP,
        receipt_url          VARCHAR(500)  NOT NULL,
        receipt_url_added_by UUID          REFERENCES users(id),
        receipt_url_added_at TIMESTAMP,
        amount        NUMERIC(15,2) NOT NULL,
        status        VARCHAR(50)   NOT NULL DEFAULT 'draft',
        submitted_at  TIMESTAMP,
        created_at    TIMESTAMP     NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMP     NOT NULL DEFAULT NOW()
      )
    `)

    // Form A2 adalah lanjutan dari CR9, memiliki alur approval multi-step.
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
        submitted_to_manager_by UUID            REFERENCES users(id), -- siapa yang mengajukan ke manager
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

    console.log(
      `[db] Schema ${isFresh ? "recreated (fresh)" : "applied"} successfully.`,
    )
  } catch (err) {
    await client.query("ROLLBACK")
    console.error("[db] Failed to create schema:", err)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

schema()
