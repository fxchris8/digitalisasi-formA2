import pool from "@/config/database"
import type {
  FormA2,
  FormA2ApprovalLog,
  FormA2Detail,
  FormA2WithCr9,
  FormA2WithDetails,
} from "@/models/form-a2.model"
import type { FormCr9 } from "@/models/form-cr9.model"
import type {
  AddDetailDto,
  UpdateFormA2Dto,
} from "@/validations/form-a2.validation"

// ── Submit CR9 + Create A2 (atomic transaction) ───────────────────────────────

/**
 * Dalam satu transaksi:
 * 1. Update form_cr9.status = 'submitted'
 * 2. Generate nomor urut A2 secara atomik
 * 3. Insert form_a2 baru (status = 'draft')
 *
 * Format nomor A2: A2/{seq:04d}/{month:02d}/{year}
 */
export async function submitCr9AndCreateA2(params: {
  cr9Id: string
  createdBy: string
  diagnosis: string // initial value, biasanya diisi complaint dari CR9
  month: number
  year: number
}): Promise<{ cr9: FormCr9; a2: FormA2 }> {
  const client = await pool.connect()

  try {
    await client.query("BEGIN")

    // 1. Update CR9 → submitted
    const cr9Res = await client.query<FormCr9>(
      /* sql */ `
        UPDATE form_cr9
        SET status = 'submitted', submitted_at = NOW(), updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      [params.cr9Id],
    )
    const cr9 = cr9Res.rows[0]!

    // 2. Increment A2 global counter
    const seqRes = await client.query<{ last_seq: number }>(
      /* sql */ `
        INSERT INTO form_number_counter (form_type, branch_office, year, last_seq)
        VALUES ('A2', 'GLOBAL', $1, 1)
        ON CONFLICT (form_type, branch_office, year)
        DO UPDATE SET last_seq = form_number_counter.last_seq + 1
        RETURNING last_seq
      `,
      [params.year],
    )
    const seq = seqRes.rows[0]!.last_seq

    // 3. Build form number: A2/0001/01/2024
    const s = String(seq).padStart(4, "0")
    const m = String(params.month).padStart(2, "0")
    const formNumber = `A2/${s}/${m}/${params.year}`

    // 4. Insert form_a2
    const a2Res = await client.query<FormA2>(
      /* sql */ `
        INSERT INTO form_a2 (
          form_cr9_id, created_by, seq_number, month, year,
          form_number, diagnosis, submitted_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        RETURNING *
      `,
      [
        params.cr9Id,
        params.createdBy,
        seq,
        params.month,
        params.year,
        formNumber,
        params.diagnosis,
      ],
    )
    const a2 = a2Res.rows[0]!

    await client.query("COMMIT")
    return { cr9, a2 }
  } catch (err) {
    await client.query("ROLLBACK")
    throw err
  } finally {
    client.release()
  }
}

// ── List ──────────────────────────────────────────────────────────────────────

export async function findAll(params: {
  branchFilter: string | null
  formNumber: string | undefined
  seamanName: string | undefined
  fromDate: string | undefined
  toDate: string | undefined
  limit: number
  offset: number
}): Promise<{ rows: FormA2WithCr9[]; total: number }> {
  const conditions: string[] = []
  const values: unknown[] = []
  let idx = 1

  if (params.branchFilter !== null) {
    conditions.push(`c.branch_office = $${idx++}`)
    values.push(params.branchFilter)
  }
  if (params.formNumber) {
    const n = idx++
    conditions.push(`(a.form_number ILIKE $${n} OR c.form_number ILIKE $${n})`)
    values.push(`%${params.formNumber}%`)
  }
  if (params.seamanName) {
    conditions.push(`c.seaman_name ILIKE $${idx++}`)
    values.push(`%${params.seamanName}%`)
  }
  if (params.fromDate) {
    conditions.push(`a.created_at >= $${idx++}`)
    values.push(params.fromDate)
  }
  if (params.toDate) {
    conditions.push(`a.created_at <= $${idx++} + INTERVAL '1 day'`)
    values.push(params.toDate)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""

  const countRes = await pool.query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM form_a2 a JOIN form_cr9 c ON c.id = a.form_cr9_id ${where}`,
    values,
  )
  const total = Number(countRes.rows[0]!.count)

  const dataRes = await pool.query<FormA2WithCr9>(
    /* sql */ `
      SELECT
        a.*,
        c.form_number AS cr9_form_number,
        c.branch_office,
        c.seaman_name,
        c.seaman_code,
        c.ship,
        c.amount AS cr9_amount,
        u.full_name AS creator_name,
        us.full_name AS submitted_to_manager_name
      FROM form_a2 a
      JOIN form_cr9 c ON c.id = a.form_cr9_id
      JOIN users u ON u.id = a.created_by
      LEFT JOIN users us ON us.id = a.submitted_to_manager_by
      ${where}
      ORDER BY a.created_at DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `,
    [...values, params.limit, params.offset],
  )

  return { rows: dataRes.rows, total }
}

// ── Find single ───────────────────────────────────────────────────────────────

export async function findById(id: string): Promise<FormA2WithDetails | null> {
  const a2Res = await pool.query<FormA2WithCr9>(
    /* sql */ `
      SELECT
        a.*,
        c.form_number AS cr9_form_number,
        c.branch_office,
        c.seaman_name,
        c.seaman_code,
        c.ship,
        c.amount AS cr9_amount,
        u.full_name AS creator_name,
        us.full_name AS submitted_to_manager_name
      FROM form_a2 a
      JOIN form_cr9 c ON c.id = a.form_cr9_id
      JOIN users u ON u.id = a.created_by
      LEFT JOIN users us ON us.id = a.submitted_to_manager_by
      WHERE a.id = $1
      LIMIT 1
    `,
    [id],
  )
  if (!a2Res.rows[0]) return null

  const a2 = a2Res.rows[0]

  const detailsRes = await pool.query<FormA2Detail>(
    `SELECT * FROM form_a2_detail WHERE form_a2_id = $1 ORDER BY created_at ASC`,
    [id],
  )

  const logsRes = await pool.query<FormA2ApprovalLog>(
    /* sql */ `
      SELECT l.*, u.full_name AS actioner_name
      FROM form_a2_approval_log l
      JOIN users u ON u.id = l.actioned_by
      WHERE l.form_a2_id = $1
      ORDER BY l.actioned_at ASC
    `,
    [id],
  )

  return {
    ...a2,
    details: detailsRes.rows,
    approval_logs: logsRes.rows,
  }
}

/** Cari A2 berdasarkan form_cr9_id */
export async function findByCr9Id(
  cr9Id: string,
): Promise<FormA2WithDetails | null> {
  const res = await pool.query<{ id: string }>(
    `SELECT id FROM form_a2 WHERE form_cr9_id = $1 LIMIT 1`,
    [cr9Id],
  )
  if (!res.rows[0]) return null
  return findById(res.rows[0].id)
}

// ── Update ────────────────────────────────────────────────────────────────────

/**
 * Update diagnosis dan/atau news_url.
 * Jika news_url diubah, otomatis set news_added_by & news_added_at.
 */
export async function update(
  id: string,
  dto: UpdateFormA2Dto,
  userId: string,
): Promise<FormA2 | null> {
  const fields: string[] = []
  const values: unknown[] = []
  let idx = 1

  if (dto.diagnosis !== undefined) {
    fields.push(`diagnosis = $${idx++}`)
    values.push(dto.diagnosis)
  }
  if (dto.news_url !== undefined) {
    fields.push(`news_url = $${idx++}`)
    fields.push(`news_added_by = $${idx++}`)
    fields.push(`news_added_at = NOW()`)
    values.push(dto.news_url, userId)
  }

  if (fields.length === 0) {
    const res = await findById(id)
    return res
  }

  fields.push(`updated_at = NOW()`)
  values.push(id)

  const result = await pool.query<FormA2>(
    `UPDATE form_a2 SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
    values,
  )
  return result.rows[0] ?? null
}

// ── Detail items ──────────────────────────────────────────────────────────────

export async function addDetail(
  formA2Id: string,
  dto: AddDetailDto,
): Promise<FormA2Detail> {
  const result = await pool.query<FormA2Detail>(
    /* sql */ `
      INSERT INTO form_a2_detail (form_a2_id, description, hospital_name, hospital_category, amount)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `,
    [
      formA2Id,
      dto.description,
      dto.hospital_name,
      dto.hospital_category,
      dto.amount,
    ],
  )
  return result.rows[0]!
}

export async function removeDetail(detailId: string): Promise<boolean> {
  const result = await pool.query(`DELETE FROM form_a2_detail WHERE id = $1`, [
    detailId,
  ])
  return (result.rowCount ?? 0) > 0
}

// ── Status transitions ────────────────────────────────────────────────────────

/** Staff SPM submit A2 ke approval chain: draft → pending, current_step = spm */
export async function submitToManager(
  id: string,
  userId: string,
): Promise<FormA2 | null> {
  const result = await pool.query<FormA2>(
    /* sql */ `
      UPDATE form_a2
      SET
        status = 'pending',
        current_step = 'spm',
        submitted_to_manager_at = NOW(),
        submitted_to_manager_by = $2,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [id, userId],
  )
  return result.rows[0] ?? null
}
