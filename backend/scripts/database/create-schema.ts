import * as dotenv from "dotenv"
import { expand } from "dotenv-expand"
import { Pool } from "pg"

expand(dotenv.config())

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function createSchema(): Promise<void> {
  const client = await pool.connect()

  try {
    await client.query("BEGIN")

    await client.query(/* sql */ `
			CREATE TABLE IF NOT EXISTS users (
				id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
				full_name   VARCHAR(255) NOT NULL,
				user_name   VARCHAR(100) UNIQUE NOT NULL,
				email       VARCHAR(255) UNIQUE NOT NULL,
				password    VARCHAR(255) NOT NULL,
				role        VARCHAR(50)  NOT NULL DEFAULT 'user',
        divisi      VARCHAR(100) NOT NULL,
				created_at  TIMESTAMP   NOT NULL DEFAULT NOW(),
				updated_at  TIMESTAMP   NOT NULL DEFAULT NOW()
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
