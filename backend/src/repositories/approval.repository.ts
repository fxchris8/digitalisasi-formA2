import pool from "@/config/database"
import type { ApprovalStep } from "@/models/form-a2.model"

export interface ApprovalLogRow {
  id: string
  form_a2_id: string
  form_a2_number: string
  cr9_form_number: string
  seaman_name: string
  seaman_code: string
  ship: string
  branch_office: string
  step: ApprovalStep
  status: "pending" | "approved" | "revision" | "rejected"
  percentage: string | null
  notes: string | null
  actioned_by: string
  actioner_name: string
  actioner_email: string
  actioned_at: Date
}

export async function findAllApprovalLogs(params: {
  formNumber?: string
  seamanName?: string
  step?: ApprovalStep
  status?: string
  fromDate?: string
  toDate?: string
  limit: number
  offset: number
}): Promise<{ rows: ApprovalLogRow[]; total: number }> {
  const conditions: string[] = []
  const values: unknown[] = []
  let idx = 1

  if (params.formNumber) {
    const n = idx++
    conditions.push(`(a.form_number ILIKE $${n} OR c.form_number ILIKE $${n})`)
    values.push(`%${params.formNumber}%`)
  }
  if (params.seamanName) {
    conditions.push(`c.seaman_name ILIKE $${idx++}`)
    values.push(`%${params.seamanName}%`)
  }
  if (params.step) {
    conditions.push(`l.step = $${idx++}`)
    values.push(params.step)
  }
  if (params.status) {
    conditions.push(`l.status = $${idx++}`)
    values.push(params.status)
  }
  if (params.fromDate) {
    conditions.push(`l.actioned_at >= $${idx++}`)
    values.push(params.fromDate)
  }
  if (params.toDate) {
    conditions.push(`l.actioned_at <= $${idx++}::date + INTERVAL '1 day'`)
    values.push(params.toDate)
  }

  const baseJoin = `
    FROM form_a2_approval_log l
    JOIN form_a2 a ON a.id = l.form_a2_id
    JOIN form_cr9 c ON c.id = a.form_cr9_id
    JOIN users u ON u.id = l.actioned_by
  `
  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : ""

  const countRes = await pool.query<{ count: string }>(
    `SELECT COUNT(*) AS count ${baseJoin} ${where}`,
    values,
  )
  const total = Number((countRes.rows[0] as { count: string }).count)

  const dataRes = await pool.query<ApprovalLogRow>(
    /* sql */ `
      SELECT
        l.id,
        l.form_a2_id,
        a.form_number  AS form_a2_number,
        c.form_number  AS cr9_form_number,
        c.seaman_name,
        c.seaman_code,
        c.ship,
        c.branch_office,
        l.step,
        l.status,
        l.percentage,
        l.notes,
        l.actioned_by,
        u.full_name    AS actioner_name,
        u.email        AS actioner_email,
        l.actioned_at
      ${baseJoin}
      ${where}
      ORDER BY l.actioned_at DESC
      LIMIT $${idx++} OFFSET $${idx++}
    `,
    [...values, params.limit, params.offset],
  )

  return { rows: dataRes.rows, total }
}
