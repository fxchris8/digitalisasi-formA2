import pool from "@/config/database"
import type { BranchOffice } from "@/models/branch-office.model"

export async function findAll(params: {
  province?: string
  city?: string
  limit: number
  offset: number
}): Promise<{ rows: BranchOffice[]; total: number }> {
  const conditions: string[] = []
  const values: unknown[] = []
  let idx = 1

  if (params.province) {
    conditions.push(`LOWER(province) LIKE $${idx++}`)
    values.push(`%${params.province.toLowerCase()}%`)
  }
  if (params.city) {
    conditions.push(`LOWER(city) LIKE $${idx++}`)
    values.push(`%${params.city.toLowerCase()}%`)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""

  const countRes = await pool.query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM branch_offices ${where}`,
    values,
  )
  const total = Number((countRes.rows[0] as { count: string }).count)

  const dataRes = await pool.query<BranchOffice>(
    /* sql */ `
      SELECT id, province, city, created_at, updated_at
      FROM branch_offices
      ${where}
      ORDER BY province ASC, city ASC
      LIMIT $${idx++} OFFSET $${idx++}
    `,
    [...values, params.limit, params.offset],
  )

  return { rows: dataRes.rows, total }
}

export async function findById(id: string): Promise<BranchOffice | null> {
  const res = await pool.query<BranchOffice>(
    `SELECT id, province, city, created_at, updated_at FROM branch_offices WHERE id = $1`,
    [id],
  )
  return res.rows[0] ?? null
}

export async function create(data: {
  province: string
  city: string
}): Promise<BranchOffice> {
  const res = await pool.query<BranchOffice>(
    /* sql */ `
      INSERT INTO branch_offices (province, city)
      VALUES ($1, $2)
      RETURNING id, province, city, created_at, updated_at
    `,
    [data.province, data.city],
  )
  const row = res.rows[0]
  if (!row) throw new Error("Insert branch_office failed")
  return row
}

export async function update(
  id: string,
  data: { province?: string; city?: string },
): Promise<BranchOffice | null> {
  const sets: string[] = []
  const values: unknown[] = []
  let idx = 1

  if (data.province !== undefined) {
    sets.push(`province = $${idx++}`)
    values.push(data.province)
  }
  if (data.city !== undefined) {
    sets.push(`city = $${idx++}`)
    values.push(data.city)
  }
  if (sets.length === 0) return findById(id)

  sets.push(`updated_at = NOW()`)
  values.push(id)

  const res = await pool.query<BranchOffice>(
    /* sql */ `
      UPDATE branch_offices
      SET ${sets.join(", ")}
      WHERE id = $${idx}
      RETURNING id, province, city, created_at, updated_at
    `,
    values,
  )
  return res.rows[0] ?? null
}

export async function remove(id: string): Promise<boolean> {
  const res = await pool.query(`DELETE FROM branch_offices WHERE id = $1`, [id])
  return (res.rowCount ?? 0) > 0
}
