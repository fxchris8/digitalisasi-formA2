import bcrypt from "bcryptjs"
import * as dotenv from "dotenv"
import { expand } from "dotenv-expand"
import { Pool } from "pg"

expand(dotenv.config())

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

const SALT_ROUNDS = 10
const DEFAULT_PASSWORD = "password123"

interface SeedUser {
  full_name: string
  username: string
  email: string
  password: string
  role: string
  department: string | null
  branch_office: string | null
}

const users: Omit<SeedUser, "password">[] = [
  // ── Admin ────────────────────────────────────────────────────────────────
  {
    full_name: "Administrator",
    username: "admin",
    email: "admin@spil.co.id",
    role: "admin",
    department: null,
    branch_office: null,
  },

  // ── Staff & Manager SPM ──────────────────────────────────────────────────
  {
    full_name: "Staff SPM Satu",
    username: "staff.spm",
    email: "staff.spm@spil.co.id",
    role: "staff",
    department: "spm",
    branch_office: null,
  },
  {
    full_name: "Manager SPM",
    username: "manager.spm",
    email: "manager.spm@spil.co.id",
    role: "manager",
    department: "spm",
    branch_office: null,
  },

  // ── Manager Nautica ──────────────────────────────────────────────────────
  {
    full_name: "Manager Nautica",
    username: "manager.nautica",
    email: "manager.nautica@spil.co.id",
    role: "manager",
    department: "nautica",
    branch_office: null,
  },

  // ── Finance ──────────────────────────────────────────────────────────────
  {
    full_name: "Staff Finance",
    username: "staff.finance",
    email: "staff.finance@spil.co.id",
    role: "staff",
    department: "finance",
    branch_office: null,
  },

  // ── Cabang ───────────────────────────────────────────────────────────────
  {
    full_name: "Staff Cabang Surabaya",
    username: "cabang.surabaya",
    email: "cabang.surabaya@spil.co.id",
    role: "staff",
    department: "cabang",
    branch_office: "Surabaya",
  },
  {
    full_name: "Staff Cabang Makassar",
    username: "cabang.makassar",
    email: "cabang.makassar@spil.co.id",
    role: "staff",
    department: "cabang",
    branch_office: "Makassar",
  },

  // ── User Biasa ─────────────────────────────────────────────────────────
  {
    full_name: "User Biasa",
    username: "user.biasa",
    email: "user.biasa@spil.co.id",
    role: "user",
    department: null,
    branch_office: null,
  },
]

async function seed(): Promise<void> {
  const client = await pool.connect()

  try {
    await client.query("BEGIN")

    const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, SALT_ROUNDS)

    let inserted = 0
    let skipped = 0

    for (const user of users) {
      const result = await client.query(
        /* sql */ `
          INSERT INTO users (full_name, username, email, password, role, department, branch_office)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (username) DO NOTHING
        `,
        [
          user.full_name,
          user.username,
          user.email,
          hashedPassword,
          user.role,
          user.department,
          user.branch_office,
        ],
      )

      if (result.rowCount && result.rowCount > 0) {
        inserted++
        console.log(`[seed] ✓ ${user.username} (${user.role})`)
      } else {
        skipped++
        console.log(`[seed] - ${user.username} sudah ada, dilewati`)
      }
    }

    await client.query("COMMIT")

    console.log(
      `\n[seed] Selesai — ${inserted} ditambahkan, ${skipped} dilewati.`,
    )
    console.log(`[seed] Default password: "${DEFAULT_PASSWORD}"`)
  } catch (err) {
    await client.query("ROLLBACK")
    console.error("[seed] Gagal:", err)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

seed()
