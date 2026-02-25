import pool from "@/config/database"
import type { SafeUser, User } from "@/models/user.model"
import { AppError } from "@/utils/app-error"
import type { RegisterDto } from "@/validations/auth.validation"

export async function findByUserName(userName: string): Promise<User | null> {
  const result = await pool.query<User>(
    "SELECT * FROM users WHERE user_name = $1 LIMIT 1",
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
    `INSERT INTO users (full_name, user_name, email, password, divisi)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, full_name, user_name, email, role, divisi, created_at, updated_at`,
    [
      data.full_name,
      data.user_name,
      data.email,
      data.hashedPassword,
      data.divisi,
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
