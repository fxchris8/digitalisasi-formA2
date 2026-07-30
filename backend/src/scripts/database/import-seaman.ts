import { readFileSync } from "node:fs"
import { join } from "node:path"
import * as dotenv from "dotenv"
import { expand } from "dotenv-expand"
import { Pool } from "pg"

expand(dotenv.config())

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

const SOURCE_FILE = join(__dirname, "data", "seaman.sql")
const STAGING_TABLE = "seaman_import_staging"

async function importSeaman(): Promise<void> {
  const client = await pool.connect()

  try {
    await client.query("BEGIN")

    const raw = readFileSync(SOURCE_FILE, "utf-8")

    // File sumber mendeklarasikan seafarercode & phone_number_3 sebagai INT,
    // padahal isinya (mis. "6212256562" atau nomor telepon panjang) melebihi
    // batas int4 Postgres — CREATE TABLE aslinya sengaja TIDAK dipakai.
    // Staging table dibuat sendiri dengan semua kolom TEXT (aman untuk nilai
    // apa pun), lalu hanya bagian INSERT dari file yang dijalankan (setelah
    // nama tabelnya di-rename ke staging).
    const insertIdx = raw.indexOf("INSERT INTO")
    if (insertIdx === -1) {
      throw new Error("Tidak ditemukan statement INSERT di seaman.sql")
    }
    const insertsOnly = raw
      .slice(insertIdx)
      .replace(/"seaman"/g, `"${STAGING_TABLE}"`)

    await client.query(`DROP TABLE IF EXISTS "${STAGING_TABLE}"`)
    await client.query(/* sql */ `
      CREATE TABLE "${STAGING_TABLE}" (
        seamancode TEXT, age TEXT, certificate TEXT, day_remains TEXT,
        edu_level TEXT, end_date TEXT, experience TEXT, gender TEXT,
        is_active_employee TEXT, last_location TEXT, last_position TEXT,
        name TEXT, no TEXT,
        phone_number_1 TEXT, phone_number_2 TEXT, phone_number_3 TEXT, phone_number_4 TEXT,
        seafarercode TEXT, start_date TEXT, status TEXT,
        birthdate TEXT, birthplace TEXT, day_elapsed TEXT, fleet TEXT,
        last_vesselid TEXT, pic_crewing TEXT, prevlocation TEXT, prevposition TEXT,
        created_at TEXT, updated_at TEXT, is_talent TEXT
      )
    `)
    await client.query(insertsOnly)

    // Sumber data sekarang sudah lengkap (termasuk last_location = kapal
    // terakhir, status penugasan, dan riwayat sebelumnya), jadi semuanya
    // diimpor — `last_location` inilah yang dipakai untuk mengisi otomatis
    // field "Nama Kapal" di Form CR9.
    const result = await client.query(/* sql */ `
      INSERT INTO seamen (
        seamancode, seafarercode, name, gender, birthdate, birthplace, age,
        edu_level, certificate, experience, fleet, is_active_employee, status,
        start_date, end_date, day_elapsed, day_remains,
        last_position, last_location, last_vesselid,
        prevposition, prevlocation, pic_crewing,
        phone_number_1, phone_number_2, phone_number_3, phone_number_4
      )
      SELECT
        TRIM(seamancode),
        NULLIF(NULLIF(TRIM(seafarercode), ''), '-'),
        name,
        NULLIF(NULLIF(TRIM(gender), ''), '-'),
        NULLIF(NULLIF(TRIM(birthdate), ''), '-'),
        NULLIF(NULLIF(TRIM(birthplace), ''), '-'),
        NULLIF(NULLIF(TRIM(age), ''), '-')::INTEGER,
        NULLIF(NULLIF(TRIM(edu_level), ''), '-'),
        NULLIF(NULLIF(TRIM(certificate), ''), '-'),
        NULLIF(NULLIF(TRIM(experience), ''), '-'),
        NULLIF(NULLIF(TRIM(fleet), ''), '-'),
        NULLIF(NULLIF(TRIM(is_active_employee), ''), '-'),
        NULLIF(NULLIF(TRIM(status), ''), '-'),
        -- Sumber mengirim timestamp penuh ("2026-04-23 00:00:00+00", 25 char)
        -- sedangkan kolomnya VARCHAR(20) dan format aplikasi DD/MM/YYYY
        -- (samakan dengan birthdate). Nilai yang bukan tanggal → NULL.
        CASE
          WHEN TRIM(start_date) ~ '^\\d{4}-\\d{2}-\\d{2}'
          THEN TO_CHAR(TO_DATE(LEFT(TRIM(start_date), 10), 'YYYY-MM-DD'), 'DD/MM/YYYY')
          ELSE NULL
        END,
        CASE
          WHEN TRIM(end_date) ~ '^\\d{4}-\\d{2}-\\d{2}'
          THEN TO_CHAR(TO_DATE(LEFT(TRIM(end_date), 10), 'YYYY-MM-DD'), 'DD/MM/YYYY')
          ELSE NULL
        END,
        NULLIF(NULLIF(TRIM(day_elapsed), ''), '-')::INTEGER,
        NULLIF(NULLIF(TRIM(day_remains), ''), '-')::INTEGER,
        NULLIF(NULLIF(TRIM(last_position), ''), '-'),
        NULLIF(NULLIF(TRIM(last_location), ''), '-'),
        NULLIF(NULLIF(TRIM(last_vesselid), ''), '-'),
        NULLIF(NULLIF(TRIM(prevposition), ''), '-'),
        NULLIF(NULLIF(TRIM(prevlocation), ''), '-'),
        NULLIF(NULLIF(TRIM(pic_crewing), ''), '-'),
        NULLIF(NULLIF(TRIM(phone_number_1), ''), '-'),
        NULLIF(NULLIF(TRIM(phone_number_2), ''), '-'),
        NULLIF(NULLIF(TRIM(phone_number_3), ''), '-'),
        NULLIF(NULLIF(TRIM(phone_number_4), ''), '-')
      FROM "${STAGING_TABLE}"
      WHERE seamancode IS NOT NULL AND TRIM(seamancode) != ''
      ON CONFLICT (seamancode) DO UPDATE SET
        seafarercode = EXCLUDED.seafarercode,
        name = EXCLUDED.name,
        gender = EXCLUDED.gender,
        birthdate = EXCLUDED.birthdate,
        birthplace = EXCLUDED.birthplace,
        age = EXCLUDED.age,
        edu_level = EXCLUDED.edu_level,
        certificate = EXCLUDED.certificate,
        experience = EXCLUDED.experience,
        fleet = EXCLUDED.fleet,
        is_active_employee = EXCLUDED.is_active_employee,
        status = EXCLUDED.status,
        start_date = EXCLUDED.start_date,
        end_date = EXCLUDED.end_date,
        day_elapsed = EXCLUDED.day_elapsed,
        day_remains = EXCLUDED.day_remains,
        last_position = EXCLUDED.last_position,
        last_location = EXCLUDED.last_location,
        last_vesselid = EXCLUDED.last_vesselid,
        prevposition = EXCLUDED.prevposition,
        prevlocation = EXCLUDED.prevlocation,
        pic_crewing = EXCLUDED.pic_crewing,
        phone_number_1 = EXCLUDED.phone_number_1,
        phone_number_2 = EXCLUDED.phone_number_2,
        phone_number_3 = EXCLUDED.phone_number_3,
        phone_number_4 = EXCLUDED.phone_number_4,
        updated_at = NOW()
    `)

    await client.query(`DROP TABLE "${STAGING_TABLE}"`)

    await client.query("COMMIT")
    console.log(
      `[import-seaman] ${result.rowCount} data seaman berhasil diimpor.`,
    )
  } catch (err) {
    await client.query("ROLLBACK")
    console.error("[import-seaman] Gagal:", err)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

importSeaman()
