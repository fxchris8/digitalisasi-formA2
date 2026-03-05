import pool from "@/config/database"
import type { FormCr9, FormCr9WithCreator } from "@/models/form-cr9.model"
import { AppError } from "@/utils/app-error"
import type {
  CreateFormCr9Dto,
  UpdateFormCr9Dto,
} from "@/validations/form-cr9.validation"

// ── Counter & Form Number ─────────────────────────────────────────────────────

/**
 * Atomically increment counter dan kembalikan seq number baru.
 * Menggunakan INSERT ... ON CONFLICT untuk keamanan concurrent request.
 */
export async function nextSeqNumber(
  branchOffice: string,
  year: number,
): Promise<number> {
  const result = await pool.query<{ last_seq: number }>(
    /* sql */ `
      INSERT INTO form_number_counter (form_type, branch_office, year, last_seq)
      VALUES ('CR9', $1, $2, 1)
      ON CONFLICT (form_type, branch_office, year)
      DO UPDATE SET last_seq = form_number_counter.last_seq + 1
      RETURNING last_seq
    `,
    [branchOffice, year],
  )
  const seqRow = result.rows[0]
  if (!seqRow) throw new AppError("Failed to generate sequence number", 500)
  return seqRow.last_seq
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

export async function findAll(params: {
  /** null = lihat semua; string = filter per branch_office */
  branchFilter: string | null
  formNumber: string | undefined
  seamanName: string | undefined
  seamanCode: string | undefined
  ship: string | undefined
  fromDate: string | undefined
  toDate: string | undefined
  limit: number
  offset: number
}): Promise<{ rows: FormCr9WithCreator[]; total: number }> {
  const conditions: string[] = []
  const values: unknown[] = []
  let idx = 1

  if (params.branchFilter !== null) {
    conditions.push(`f.branch_office = $${idx++}`)
    values.push(params.branchFilter)
  }
  if (params.formNumber) {
    conditions.push(`f.form_number ILIKE $${idx++}`)
    values.push(`%${params.formNumber}%`)
  }
  if (params.seamanName) {
    conditions.push(`f.seaman_name ILIKE $${idx++}`)
    values.push(`%${params.seamanName}%`)
  }
  if (params.seamanCode) {
    conditions.push(`f.seaman_code ILIKE $${idx++}`)
    values.push(`%${params.seamanCode}%`)
  }
  if (params.ship) {
    conditions.push(`f.ship ILIKE $${idx++}`)
    values.push(`%${params.ship}%`)
  }
  if (params.fromDate) {
    conditions.push(`f.created_at >= $${idx++}`)
    values.push(params.fromDate)
  }
  if (params.toDate) {
    conditions.push(`f.created_at <= $${idx++} + INTERVAL '1 day'`)
    values.push(params.toDate)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""

  const countResult = await pool.query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM form_cr9 f ${where}`,
    values,
  )
  const total = Number((countResult.rows[0] as { count: string }).count)

  const dataResult = await pool.query<FormCr9WithCreator>(
    /* sql */ `
      SELECT
        f.*,
        u.full_name AS creator_name
      FROM form_cr9 f
      JOIN users u ON u.id = f.created_by
      ${where}
      ORDER BY f.created_at DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `,
    [...values, params.limit, params.offset],
  )

  return { rows: dataResult.rows, total }
}

export async function findById(id: string): Promise<FormCr9WithCreator | null> {
  const result = await pool.query<FormCr9WithCreator>(
    /* sql */ `
      SELECT f.*, u.full_name AS creator_name
      FROM form_cr9 f
      JOIN users u ON u.id = f.created_by
      WHERE f.id = $1
      LIMIT 1
    `,
    [id],
  )
  return result.rows[0] ?? null
}

export async function create(
  createdBy: string,
  branchOffice: string,
  seqNumber: number,
  month: number,
  year: number,
  formNumber: string,
  dto: CreateFormCr9Dto,
): Promise<FormCr9> {
  const result = await pool.query<FormCr9>(
    /* sql */ `
      INSERT INTO form_cr9 (
        created_by, branch_office, seq_number, month, year, form_number,
        seafarer_code, seaman_code, seaman_name, position, ship,
        complaint,
        cr9_url, cr9_url_added_by, cr9_url_added_at,
        receipt_url, receipt_url_added_by, receipt_url_added_at,
        amount
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW(),$15,$16,NOW(),$17)
      RETURNING *
    `,
    [
      createdBy,
      branchOffice,
      seqNumber,
      month,
      year,
      formNumber,
      dto.seafarer_code,
      dto.seaman_code,
      dto.seaman_name,
      dto.position,
      dto.ship,
      dto.complaint,
      dto.cr9_url,
      createdBy,
      dto.receipt_url,
      createdBy,
      dto.amount,
    ],
  )
  const row = result.rows[0]
  if (!row) throw new AppError("Failed to create Form CR9", 500)
  return row
}

export async function update(
  id: string,
  dto: UpdateFormCr9Dto,
  userId: string,
): Promise<FormCr9 | null> {
  const fields: string[] = []
  const values: unknown[] = []
  let idx = 1

  if (dto.seafarer_code !== undefined) {
    fields.push(`seafarer_code = $${idx++}`)
    values.push(dto.seafarer_code)
  }
  if (dto.seaman_code !== undefined) {
    fields.push(`seaman_code = $${idx++}`)
    values.push(dto.seaman_code)
  }
  if (dto.seaman_name !== undefined) {
    fields.push(`seaman_name = $${idx++}`)
    values.push(dto.seaman_name)
  }
  if (dto.position !== undefined) {
    fields.push(`position = $${idx++}`)
    values.push(dto.position)
  }
  if (dto.ship !== undefined) {
    fields.push(`ship = $${idx++}`)
    values.push(dto.ship)
  }
  if (dto.complaint !== undefined) {
    fields.push(`complaint = $${idx++}`)
    values.push(dto.complaint)
  }
  if (dto.cr9_url !== undefined) {
    fields.push(`cr9_url = $${idx++}`)
    fields.push(`cr9_url_added_by = $${idx++}`)
    fields.push(`cr9_url_added_at = NOW()`)
    values.push(dto.cr9_url, userId)
  }
  if (dto.receipt_url !== undefined) {
    fields.push(`receipt_url = $${idx++}`)
    fields.push(`receipt_url_added_by = $${idx++}`)
    fields.push(`receipt_url_added_at = NOW()`)
    values.push(dto.receipt_url, userId)
  }
  if (dto.amount !== undefined) {
    fields.push(`amount = $${idx++}`)
    values.push(dto.amount)
  }

  if (fields.length === 0) return findById(id).then((r) => r)

  fields.push(`updated_at = NOW()`)
  values.push(id)

  const result = await pool.query<FormCr9>(
    `UPDATE form_cr9 SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
    values,
  )
  return result.rows[0] ?? null
}

export async function remove(id: string): Promise<boolean> {
  const result = await pool.query("DELETE FROM form_cr9 WHERE id = $1", [id])
  return (result.rowCount ?? 0) > 0
}

/**
 * Hapus CR9 beserta seluruh data terkait dalam satu transaksi:
 * form_a2_revision → form_a2_approval_log → form_a2_detail → form_a2 → form_cr9
 */
export async function removeCascade(id: string): Promise<boolean> {
  const client = await pool.connect()
  try {
    await client.query("BEGIN")

    await client.query(
      `DELETE FROM form_a2_revision
       WHERE form_a2_id IN (SELECT id FROM form_a2 WHERE form_cr9_id = $1)`,
      [id],
    )
    await client.query(
      `DELETE FROM form_a2_approval_log
       WHERE form_a2_id IN (SELECT id FROM form_a2 WHERE form_cr9_id = $1)`,
      [id],
    )
    await client.query(
      `DELETE FROM form_a2_detail
       WHERE form_a2_id IN (SELECT id FROM form_a2 WHERE form_cr9_id = $1)`,
      [id],
    )
    await client.query(`DELETE FROM form_a2 WHERE form_cr9_id = $1`, [id])

    const result = await client.query(`DELETE FROM form_cr9 WHERE id = $1`, [
      id,
    ])

    await client.query("COMMIT")
    return (result.rowCount ?? 0) > 0
  } catch (err) {
    await client.query("ROLLBACK")
    throw err
  } finally {
    client.release()
  }
}
