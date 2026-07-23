import pool from "@/config/database"
import type { FormCr9, FormCr9WithCreator } from "@/models/form-cr9.model"
import type { UpdateFormCr9Dto } from "@/validations/form-cr9.validation"

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
        u.full_name AS creator_name,
        a.id AS form_a2_id,
        a.status AS a2_status,
        rev.id IS NOT NULL AS needs_cabang_revision,
        rev.notes AS revision_notes
      FROM form_cr9 f
      JOIN users u ON u.id = f.created_by
      LEFT JOIN form_a2 a ON a.form_cr9_id = f.id
      LEFT JOIN form_a2_revision rev
        ON rev.form_a2_id = a.id
        AND rev.is_resolved = FALSE
        AND rev.target_role = 'staff_cabang'
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
      SELECT
        f.*,
        u.full_name AS creator_name,
        a.id AS form_a2_id,
        a.status AS a2_status,
        rev.id IS NOT NULL AS needs_cabang_revision,
        rev.notes AS revision_notes
      FROM form_cr9 f
      JOIN users u ON u.id = f.created_by
      LEFT JOIN form_a2 a ON a.form_cr9_id = f.id
      LEFT JOIN form_a2_revision rev
        ON rev.form_a2_id = a.id
        AND rev.is_resolved = FALSE
        AND rev.target_role = 'staff_cabang'
      WHERE f.id = $1
      LIMIT 1
    `,
    [id],
  )
  return result.rows[0] ?? null
}

/**
 * Tandai CR9 sebagai submitted, dan sinkronkan `submitted_at` ke Form A2 yang
 * sudah dibuat sejak CR9 ini dibuat (lihat `createCr9AndA2` di form-a2.repository.ts).
 * Tidak lagi meng-insert Form A2 baru — A2 sudah ada sejak CR9 dibuat.
 */
export async function submitCr9(
  cr9Id: string,
): Promise<{ cr9: FormCr9; a2Id: string } | null> {
  const client = await pool.connect()
  try {
    await client.query("BEGIN")

    const cr9Res = await client.query<FormCr9>(
      /* sql */ `
        UPDATE form_cr9
        SET status = 'submitted', submitted_at = NOW(), updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      [cr9Id],
    )
    const cr9 = cr9Res.rows[0]
    if (!cr9) {
      await client.query("ROLLBACK")
      return null
    }

    const a2Res = await client.query<{ id: string }>(
      /* sql */ `
        UPDATE form_a2
        SET submitted_at = NOW(), updated_at = NOW()
        WHERE form_cr9_id = $1
        RETURNING id
      `,
      [cr9Id],
    )
    const a2Id = a2Res.rows[0]?.id
    if (!a2Id) {
      await client.query("ROLLBACK")
      return null
    }

    await client.query("COMMIT")
    return { cr9, a2Id }
  } catch (err) {
    await client.query("ROLLBACK")
    throw err
  } finally {
    client.release()
  }
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
  // `amount` tidak diupdate manual di sini — selalu disinkronkan dari SUM rincian
  // biaya lewat `replaceCr9DetailsAndDiagnosis` (form-a2.repository.ts) saat
  // `dto.details` berubah.

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
