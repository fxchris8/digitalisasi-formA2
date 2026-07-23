import { readFileSync } from "node:fs"
import { join } from "node:path"
import * as dotenv from "dotenv"
import { expand } from "dotenv-expand"
import { Pool } from "pg"

expand(dotenv.config())

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

const SOURCE_FILE = join(__dirname, "data", "kapal.sql")
const STAGING_TABLE = "kapal_import_staging"

async function importKapal(): Promise<void> {
  const client = await pool.connect()

  try {
    await client.query("BEGIN")

    const raw = readFileSync(SOURCE_FILE, "utf-8")
    // File sumber (export dari Excel) berisi CREATE TABLE + ribuan INSERT yang
    // menyasar tabel "kapal" — di-rename ke tabel staging supaya tidak
    // bentrok dengan skema tabel ships yang asli.
    const staged = raw.replace(/"kapal"/g, `"${STAGING_TABLE}"`)

    await client.query(`DROP TABLE IF EXISTS "${STAGING_TABLE}"`)
    await client.query(staged)

    const result = await client.query(/* sql */ `
      INSERT INTO ships (name)
      SELECT DISTINCT TRIM("Nama Kapal")
      FROM "${STAGING_TABLE}"
      WHERE "Nama Kapal" IS NOT NULL AND TRIM("Nama Kapal") != ''
      ON CONFLICT (name) DO NOTHING
    `)

    await client.query(`DROP TABLE "${STAGING_TABLE}"`)

    await client.query("COMMIT")
    console.log(`[import-kapal] ${result.rowCount} kapal berhasil diimpor.`)
  } catch (err) {
    await client.query("ROLLBACK")
    console.error("[import-kapal] Gagal:", err)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

importKapal()
