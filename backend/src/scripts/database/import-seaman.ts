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
        seamancode TEXT, age TEXT, gender TEXT, is_active_employee TEXT,
        last_position TEXT, name TEXT, no TEXT,
        phone_number_1 TEXT, phone_number_2 TEXT, phone_number_3 TEXT, phone_number_4 TEXT,
        seafarercode TEXT, birthdate TEXT, birthplace TEXT, fleet TEXT
      )
    `)
    await client.query(insertsOnly)

    // Kolom yang tidak ada di sumber (edu_level, certificate, experience,
    // status, start_date/end_date, day_elapsed/day_remains, last_location,
    // last_vesselid, prevposition/prevlocation, pic_crewing) tetap NULL —
    // termasuk last_location, jadi auto-fill "Nama Kapal" di Form CR9 belum
    // akan terisi untuk data hasil import manual ini sampai ada sinkronisasi
    // CITRIX yang sesungguhnya.
    const result = await client.query(/* sql */ `
      INSERT INTO seamen (
        seamancode, seafarercode, name, gender, birthdate, birthplace, age,
        fleet, is_active_employee, last_position,
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
        NULLIF(NULLIF(TRIM(fleet), ''), '-'),
        NULLIF(NULLIF(TRIM(is_active_employee), ''), '-'),
        NULLIF(NULLIF(TRIM(last_position), ''), '-'),
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
        fleet = EXCLUDED.fleet,
        is_active_employee = EXCLUDED.is_active_employee,
        last_position = EXCLUDED.last_position,
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
