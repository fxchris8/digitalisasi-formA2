import pool from "@/config/database"
import type { Seaman } from "@/models/seaman.model"

// ── Raw shape returned by the external API ────────────────────────────────────

export interface SeamanApiRow {
  seamancode: string
  seafarercode: string
  name: string
  gender: string
  birthdate: string
  birthplace: string
  age: string
  edu_level: string
  certificate: string
  experience: string
  fleet: string
  is_active_employee: string
  status: string
  start_date: string
  end_date: string
  day_elapsed: string
  day_remains: string
  last_position: string
  last_location: string
  last_vesselid: string
  prevposition: string
  prevlocation: string
  pic_crewing: string
  phone_number_1: string
  phone_number_2: string
  phone_number_3: string
  phone_number_4: string
}

// ── Batch upsert ──────────────────────────────────────────────────────────────

const CHUNK_SIZE = 100

const UPSERT_COLUMNS = [
  "seamancode",
  "seafarercode",
  "name",
  "gender",
  "birthdate",
  "birthplace",
  "age",
  "edu_level",
  "certificate",
  "experience",
  "fleet",
  "is_active_employee",
  "status",
  "start_date",
  "end_date",
  "day_elapsed",
  "day_remains",
  "last_position",
  "last_location",
  "last_vesselid",
  "prevposition",
  "prevlocation",
  "pic_crewing",
  "phone_number_1",
  "phone_number_2",
  "phone_number_3",
  "phone_number_4",
  "synced_at",
  "updated_at",
] as const

const UPDATE_SET = UPSERT_COLUMNS.filter(
  (c) => c !== "seamancode" && c !== "synced_at",
)
  .map((c) => `${c} = EXCLUDED.${c}`)
  .join(", ")

function rowToValues(row: SeamanApiRow): unknown[] {
  const toIntOrNull = (v: string) => {
    const n = Number.parseInt(v, 10)
    return Number.isNaN(n) ? null : n
  }
  const toStr = (v: string) => (v === "-" || v === "" ? null : v)
  const now = new Date()

  return [
    row.seamancode,
    toStr(row.seafarercode),
    row.name,
    toStr(row.gender),
    toStr(row.birthdate),
    toStr(row.birthplace),
    toIntOrNull(row.age),
    toStr(row.edu_level),
    toStr(row.certificate),
    toStr(row.experience),
    toStr(row.fleet),
    toStr(row.is_active_employee),
    toStr(row.status),
    toStr(row.start_date),
    toStr(row.end_date),
    toIntOrNull(row.day_elapsed),
    toIntOrNull(row.day_remains),
    toStr(row.last_position),
    toStr(row.last_location),
    toStr(row.last_vesselid),
    toStr(row.prevposition),
    toStr(row.prevlocation),
    toStr(row.pic_crewing),
    toStr(row.phone_number_1),
    toStr(row.phone_number_2),
    toStr(row.phone_number_3),
    toStr(row.phone_number_4),
    now,
    now,
  ]
}

export async function upsertBatch(rows: SeamanApiRow[]): Promise<number> {
  if (rows.length === 0) return 0

  const client = await pool.connect()
  let totalInserted = 0

  try {
    await client.query("BEGIN")

    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE)
      const colCount = UPSERT_COLUMNS.length
      const valuePlaceholders = chunk
        .map(
          (_, rowIdx) =>
            `(${UPSERT_COLUMNS.map((_, colIdx) => `$${rowIdx * colCount + colIdx + 1}`).join(", ")})`,
        )
        .join(", ")

      const values = chunk.flatMap(rowToValues)

      await client.query(
        `INSERT INTO seamen (${UPSERT_COLUMNS.join(", ")})
         VALUES ${valuePlaceholders}
         ON CONFLICT (seamancode) DO UPDATE SET ${UPDATE_SET}`,
        values,
      )
      totalInserted += chunk.length
    }

    await client.query("COMMIT")
    return totalInserted
  } catch (err) {
    await client.query("ROLLBACK")
    throw err
  } finally {
    client.release()
  }
}

// ── Queries ───────────────────────────────────────────────────────────────────

export async function findAll(params: {
  search?: string
  status?: string
  fleet?: string
  limit: number
  offset: number
}): Promise<{ rows: Seaman[]; total: number }> {
  const conditions: string[] = []
  const values: unknown[] = []
  let idx = 1

  if (params.search) {
    conditions.push(
      `(LOWER(name) LIKE $${idx} OR seamancode LIKE $${idx} OR LOWER(COALESCE(seafarercode, '')) LIKE $${idx})`,
    )
    values.push(`%${params.search.toLowerCase()}%`)
    idx++
  }
  if (params.status) {
    conditions.push(`status = $${idx++}`)
    values.push(params.status)
  }
  if (params.fleet) {
    conditions.push(`fleet = $${idx++}`)
    values.push(params.fleet)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""

  const countResult = await pool.query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM seamen ${where}`,
    values,
  )
  const total = Number.parseInt(countResult.rows[0]?.count as string, 10) || 0

  const dataResult = await pool.query<Seaman>(
    `SELECT * FROM seamen ${where}
     ORDER BY name ASC
     LIMIT $${idx++} OFFSET $${idx}`,
    [...values, params.limit, params.offset],
  )

  return { rows: dataResult.rows, total }
}

export async function countAll(): Promise<number> {
  const result = await pool.query<{ count: string }>(
    "SELECT COUNT(*) AS count FROM seamen",
  )
  return Number.parseInt(result.rows[0]?.count as string, 10) || 0
}

export async function getLastSyncedAt(): Promise<Date | null> {
  const result = await pool.query<{ synced_at: Date }>(
    "SELECT synced_at FROM seamen ORDER BY synced_at DESC LIMIT 1",
  )
  return result.rows[0]?.synced_at ?? null
}

export async function deleteAll(): Promise<number> {
  const result = await pool.query("DELETE FROM seamen")
  return result.rowCount ?? 0
}
