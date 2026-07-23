import { readFileSync } from "node:fs"
import { join } from "node:path"
import * as dotenv from "dotenv"
import { expand } from "dotenv-expand"
import { Pool } from "pg"

expand(dotenv.config())

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

const SOURCE_FILE = join(__dirname, "data", "hospitals.sql")
const STAGING_TABLE = "hospitals_import_staging"

async function importHospitals(): Promise<void> {
  const client = await pool.connect()

  try {
    await client.query("BEGIN")

    const raw = readFileSync(SOURCE_FILE, "utf-8")
    // File sumber (export dari Excel) berisi CREATE TABLE + ribuan INSERT yang
    // menyasar tabel "hospitals" — di-rename ke tabel staging supaya tidak
    // bentrok dengan skema tabel hospitals yang asli.
    const staged = raw.replace(/"hospitals"/g, `"${STAGING_TABLE}"`)

    await client.query(`DROP TABLE IF EXISTS "${STAGING_TABLE}"`)
    await client.query(staged)

    const result = await client.query(/* sql */ `
      INSERT INTO hospitals (name, province, city, category, owner_type)
      SELECT
        "Rumah Sakit",
        "Provinsi",
        "Kab/Kota",
        LOWER(TRIM("SWASTA/PEMERINTAH")),
        "Pemilik"
      FROM "${STAGING_TABLE}"
      WHERE "Rumah Sakit" IS NOT NULL
        AND "Provinsi" IS NOT NULL
        AND "Kab/Kota" IS NOT NULL
      ON CONFLICT (name, city) DO NOTHING
    `)

    await client.query(`DROP TABLE "${STAGING_TABLE}"`)

    await client.query("COMMIT")
    console.log(
      `[import-hospitals] ${result.rowCount} rumah sakit berhasil diimpor.`,
    )
  } catch (err) {
    await client.query("ROLLBACK")
    console.error("[import-hospitals] Gagal:", err)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

importHospitals()
