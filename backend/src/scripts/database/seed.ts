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
    username: "staff_spm",
    email: "staff.spm@spil.co.id",
    role: "staff",
    department: "spm",
    branch_office: null,
  },
  {
    full_name: "Manager SPM",
    username: "manager_spm",
    email: "manager.spm@spil.co.id",
    role: "manager",
    department: "spm",
    branch_office: null,
  },

  // ── Manager Nautica ──────────────────────────────────────────────────────
  {
    full_name: "Manager Nautica",
    username: "manager_nautica",
    email: "manager.nautica@spil.co.id",
    role: "manager",
    department: "nautica",
    branch_office: null,
  },

  // ── Finance ──────────────────────────────────────────────────────────────
  {
    full_name: "Staff Finance",
    username: "staff_finance",
    email: "staff.finance@spil.co.id",
    role: "staff",
    department: "finance",
    branch_office: null,
  },

  // ── Cabang ───────────────────────────────────────────────────────────────
  {
    full_name: "Staff Cabang Surabaya",
    username: "cabang_surabaya",
    email: "cabang.surabaya@spil.co.id",
    role: "staff",
    department: "cabang",
    branch_office: "Surabaya",
  },
  {
    full_name: "Staff Cabang Makassar",
    username: "cabang_makassar",
    email: "cabang.makassar@spil.co.id",
    role: "staff",
    department: "cabang",
    branch_office: "Makassar",
  },

  // ── User Biasa ─────────────────────────────────────────────────────────
  {
    full_name: "User Biasa",
    username: "user_biasa",
    email: "user.biasa@spil.co.id",
    role: "user",
    department: null,
    branch_office: null,
  },
]

const branchOffices: { province: string; city: string }[] = [
  { province: "Maluku", city: "Ambon" },
  { province: "Kalimantan Timur", city: "Balikpapan" },
  { province: "Kalimantan Selatan", city: "Banjarmasin" },
  { province: "Kepulauan Riau", city: "Batam" },
  { province: "Kalimantan Selatan", city: "Batulicin" },
  { province: "Sulawesi Tenggara", city: "Bau-Bau" },
  { province: "Kalimantan Timur", city: "Berau" },
  { province: "Papua", city: "Biak" },
  { province: "Sulawesi Utara", city: "Bitung" },
  { province: "Papua Barat", city: "Fak-Fak" },
  { province: "Gorontalo", city: "Gorontalo" },
  { province: "DKI Jakarta", city: "Jakarta" },
  { province: "Papua", city: "Jayapura" },
  { province: "Papua Barat", city: "Kaimana" },
  { province: "Sulawesi Tenggara", city: "Kendari" },
  { province: "Kalimantan Barat", city: "Ketapang" },
  { province: "Sulawesi Tengah", city: "Luwuk" },
  { province: "Sulawesi Selatan", city: "Makassar" },
  { province: "Papua Barat", city: "Manokwari" },
  { province: "Sumatera Utara", city: "Medan" },
  { province: "Papua Selatan", city: "Merauke" },
  { province: "Papua Tengah", city: "Nabire" },
  { province: "Kalimantan Utara", city: "Nunukan" },
  { province: "Sumatera Barat", city: "Padang" },
  { province: "Sulawesi Tengah", city: "Palu" },
  { province: "Riau", city: "Pekanbaru" },
  { province: "Kalimantan Barat", city: "Pontianak" },
  { province: "Kalimantan Timur", city: "Samarinda" },
  { province: "Kalimantan Tengah", city: "Sampit" },
  { province: "Jawa Tengah", city: "Semarang" },
  { province: "Papua", city: "Serui" },
  { province: "Papua Barat Daya", city: "Sorong" },
  { province: "Jawa Timur", city: "Surabaya" },
  { province: "Kalimantan Utara", city: "Tarakan" },
  { province: "Maluku Utara", city: "Ternate" },
  { province: "Papua Tengah", city: "Timika" },
  { province: "Maluku", city: "Tual" },
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

    let branchInserted = 0
    let branchSkipped = 0

    for (const office of branchOffices) {
      const result = await client.query(
        /* sql */ `
          INSERT INTO branch_offices (province, city)
          VALUES ($1, $2)
          ON CONFLICT DO NOTHING
        `,
        [office.province, office.city],
      )

      if (result.rowCount && result.rowCount > 0) {
        branchInserted++
        console.log(`[seed] ✓ Cabang ${office.city} (${office.province})`)
      } else {
        branchSkipped++
        console.log(`[seed] - Cabang ${office.city} sudah ada, dilewati`)
      }
    }

    await client.query("COMMIT")

    console.log(
      `\n[seed] Selesai — ${inserted} user ditambahkan, ${skipped} dilewati.`,
    )
    console.log(
      `[seed] Cabang — ${branchInserted} ditambahkan, ${branchSkipped} dilewati.`,
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
