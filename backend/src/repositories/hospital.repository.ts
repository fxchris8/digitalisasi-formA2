import pool from "@/config/database"
import type { Hospital } from "@/models/hospital.model"

export async function findAll(params: {
  search?: string
  category?: string
  limit: number
  offset: number
}): Promise<{ rows: Hospital[]; total: number }> {
  const conditions: string[] = []
  const values: unknown[] = []
  let idx = 1

  if (params.search) {
    conditions.push(
      `(LOWER(name) LIKE $${idx} OR LOWER(city) LIKE $${idx} OR LOWER(province) LIKE $${idx})`,
    )
    values.push(`%${params.search.toLowerCase()}%`)
    idx++
  }
  if (params.category) {
    conditions.push(`category = $${idx++}`)
    values.push(params.category)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""

  const countRes = await pool.query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM hospitals ${where}`,
    values,
  )
  const total = Number((countRes.rows[0] as { count: string }).count)

  const dataRes = await pool.query<Hospital>(
    /* sql */ `
      SELECT id, name, province, city, category, owner_type, created_at, updated_at
      FROM hospitals
      ${where}
      ORDER BY name ASC
      LIMIT $${idx++} OFFSET $${idx++}
    `,
    [...values, params.limit, params.offset],
  )

  return { rows: dataRes.rows, total }
}

export async function findById(id: string): Promise<Hospital | null> {
  const res = await pool.query<Hospital>(
    `SELECT id, name, province, city, category, owner_type, created_at, updated_at FROM hospitals WHERE id = $1`,
    [id],
  )
  return res.rows[0] ?? null
}

export async function create(data: {
  name: string
  province: string
  city: string
  category: string
  owner_type?: string | undefined
}): Promise<Hospital> {
  const res = await pool.query<Hospital>(
    /* sql */ `
      INSERT INTO hospitals (name, province, city, category, owner_type)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, name, province, city, category, owner_type, created_at, updated_at
    `,
    [
      data.name,
      data.province,
      data.city,
      data.category,
      data.owner_type ?? null,
    ],
  )
  const row = res.rows[0]
  if (!row) throw new Error("Insert hospital failed")
  return row
}

export async function update(
  id: string,
  data: {
    name?: string
    province?: string
    city?: string
    category?: string
    owner_type?: string
  },
): Promise<Hospital | null> {
  const sets: string[] = []
  const values: unknown[] = []
  let idx = 1

  if (data.name !== undefined) {
    sets.push(`name = $${idx++}`)
    values.push(data.name)
  }
  if (data.province !== undefined) {
    sets.push(`province = $${idx++}`)
    values.push(data.province)
  }
  if (data.city !== undefined) {
    sets.push(`city = $${idx++}`)
    values.push(data.city)
  }
  if (data.category !== undefined) {
    sets.push(`category = $${idx++}`)
    values.push(data.category)
  }
  if (data.owner_type !== undefined) {
    sets.push(`owner_type = $${idx++}`)
    values.push(data.owner_type)
  }
  if (sets.length === 0) return findById(id)

  sets.push(`updated_at = NOW()`)
  values.push(id)

  const res = await pool.query<Hospital>(
    /* sql */ `
      UPDATE hospitals
      SET ${sets.join(", ")}
      WHERE id = $${idx}
      RETURNING id, name, province, city, category, owner_type, created_at, updated_at
    `,
    values,
  )
  return res.rows[0] ?? null
}

export async function remove(id: string): Promise<boolean> {
  const res = await pool.query(`DELETE FROM hospitals WHERE id = $1`, [id])
  return (res.rowCount ?? 0) > 0
}
