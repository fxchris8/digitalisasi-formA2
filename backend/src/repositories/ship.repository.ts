import pool from "@/config/database"
import type { Ship } from "@/models/ship.model"

export async function findAll(params: {
  search?: string
  limit: number
  offset: number
}): Promise<{ rows: Ship[]; total: number }> {
  const conditions: string[] = []
  const values: unknown[] = []
  let idx = 1

  if (params.search) {
    conditions.push(`LOWER(name) LIKE $${idx++}`)
    values.push(`%${params.search.toLowerCase()}%`)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""

  const countRes = await pool.query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM ships ${where}`,
    values,
  )
  const total = Number((countRes.rows[0] as { count: string }).count)

  const dataRes = await pool.query<Ship>(
    /* sql */ `
      SELECT id, name, created_at, updated_at
      FROM ships
      ${where}
      ORDER BY name ASC
      LIMIT $${idx++} OFFSET $${idx++}
    `,
    [...values, params.limit, params.offset],
  )

  return { rows: dataRes.rows, total }
}

export async function findById(id: string): Promise<Ship | null> {
  const res = await pool.query<Ship>(
    `SELECT id, name, created_at, updated_at FROM ships WHERE id = $1`,
    [id],
  )
  return res.rows[0] ?? null
}

export async function create(name: string): Promise<Ship> {
  const res = await pool.query<Ship>(
    /* sql */ `
      INSERT INTO ships (name)
      VALUES ($1)
      RETURNING id, name, created_at, updated_at
    `,
    [name],
  )
  const row = res.rows[0]
  if (!row) throw new Error("Insert ship failed")
  return row
}

export async function update(id: string, name: string): Promise<Ship | null> {
  const res = await pool.query<Ship>(
    /* sql */ `
      UPDATE ships
      SET name = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, name, created_at, updated_at
    `,
    [name, id],
  )
  return res.rows[0] ?? null
}

export async function remove(id: string): Promise<boolean> {
  const res = await pool.query(`DELETE FROM ships WHERE id = $1`, [id])
  return (res.rowCount ?? 0) > 0
}
