import pool from "@/config/database"
import type { SafeUser, User } from "@/models/user.model"
import { AppError } from "@/utils/app-error"
import type { RegisterDto } from "@/validations/auth.validation"
import type {
  CreateUserDto,
  ListUsersQuery,
} from "@/validations/user.validation"

export async function findByUserName(userName: string): Promise<User | null> {
  const result = await pool.query<User>(
    "SELECT * FROM users WHERE username = $1 LIMIT 1",
    [userName],
  )
  return result.rows[0] ?? null
}

export async function findByEmail(email: string): Promise<User | null> {
  const result = await pool.query<User>(
    "SELECT * FROM users WHERE email = $1 LIMIT 1",
    [email],
  )
  return result.rows[0] ?? null
}

export async function findById(id: string): Promise<User | null> {
  const result = await pool.query<User>(
    "SELECT * FROM users WHERE id = $1 LIMIT 1",
    [id],
  )
  return result.rows[0] ?? null
}

export async function createUser(
  data: RegisterDto & { hashedPassword: string },
): Promise<SafeUser> {
  const result = await pool.query<SafeUser>(
    `INSERT INTO users (full_name, username, email, password, department, branch_office)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, full_name, username, email, role, department, branch_office, created_at, updated_at`,
    [
      data.full_name,
      data.username,
      data.email,
      data.hashedPassword,
      data.department ?? null,
      data.branch_office ?? null,
    ],
  )
  const row = result.rows[0]
  if (!row)
    throw new AppError(
      "Unexpected database error",
      500,
      "INTERNAL_SERVER_ERROR",
    )
  return row
}

export async function updatePassword(
  id: string,
  hashedPassword: string,
): Promise<void> {
  await pool.query(
    "UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2",
    [hashedPassword, id],
  )
}

export async function findDistinctBranchOffices(): Promise<string[]> {
  const result = await pool.query<{ branch_office: string }>(
    "SELECT DISTINCT branch_office FROM users WHERE branch_office IS NOT NULL ORDER BY branch_office",
  )
  return result.rows.map((r) => r.branch_office)
}

// ── Admin user management ──────────────────────────────────────────────────────

export async function findAll(
  params: Pick<ListUsersQuery, "limit"> & { offset: number; search?: string },
): Promise<{ rows: SafeUser[]; total: number }> {
  const conditions: string[] = []
  const values: unknown[] = []
  let idx = 1

  if (params.search) {
    conditions.push(
      `(full_name ILIKE $${idx} OR username ILIKE $${idx} OR email ILIKE $${idx})`,
    )
    values.push(`%${params.search}%`)
    idx++
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""

  const countRes = await pool.query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM users ${where}`,
    values,
  )
  const total = Number((countRes.rows[0] as { count: string }).count)

  const dataRes = await pool.query<SafeUser>(
    `SELECT id, full_name, username, email, role, department, branch_office, created_at, updated_at
     FROM users ${where}
     ORDER BY created_at DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...values, params.limit, params.offset],
  )

  return { rows: dataRes.rows, total }
}

export async function createByAdmin(
  data: CreateUserDto & { hashedPassword: string },
): Promise<SafeUser> {
  const result = await pool.query<SafeUser>(
    `INSERT INTO users (full_name, username, email, password, role, department, branch_office)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, full_name, username, email, role, department, branch_office, created_at, updated_at`,
    [
      data.full_name,
      data.username,
      data.email,
      data.hashedPassword,
      data.role,
      data.department ?? null,
      data.branch_office ?? null,
    ],
  )
  const row = result.rows[0]
  if (!row)
    throw new AppError(
      "Unexpected database error",
      500,
      "INTERNAL_SERVER_ERROR",
    )
  return row
}

export async function deleteById(id: string): Promise<boolean> {
  const result = await pool.query("DELETE FROM users WHERE id = $1", [id])
  return (result.rowCount ?? 0) > 0
}
