import pool from "@/config/database"
import type {
  ApprovalStep,
  FormA2,
  FormA2ApprovalLog,
  FormA2Detail,
  FormA2Revision,
  FormA2WithCr9,
  FormA2WithDetails,
  RevisionTargetRole,
} from "@/models/form-a2.model"
import type { Cr9Type, FormCr9 } from "@/models/form-cr9.model"
import * as receiptRepo from "@/repositories/form-cr9-receipt.repository"
import type { UpdateFormA2Dto } from "@/validations/form-a2.validation"

// ── Create CR9 + Create A2 (atomic transaction) ───────────────────────────────

/**
 * Dalam satu transaksi (dipanggil saat staff cabang "Buat Form CR9"):
 * 1. Generate nomor urut CR9 & insert form_cr9 (amount = SUM rincian biaya)
 * 2. Generate nomor urut A2 secara atomik & insert form_a2 (status = 'draft', submitted_at = NULL)
 * 3. Insert form_a2_detail untuk setiap rincian biaya (semua baris berbagi hospital_id yang sama)
 *
 * Form A2 baru "selesai" (submitted_at terisi) saat CR9-nya diajukan — lihat `submitCr9` di
 * form-cr9.repository.ts. Format nomor CR9: CR9/{branch}/{seq:04d}/{month:02d}/{year}.
 * Format nomor A2: A2/{seq:04d}/{month:02d}/{year}.
 */
export async function createCr9AndA2(params: {
  createdBy: string
  branchOffice: string
  month: number
  year: number
  seafarerCode: string
  seamanCode: string
  seamanName: string
  position: string
  ship: string
  complaint: string
  cr9Url: string
  receiptUrls: string[]
  diagnosis: string
  cr9Type: Cr9Type
  isWorkAccident: boolean | null
  hospitalId: string | null
  hospitalNameManual: string | null
  details: { description: string; amount: number }[]
}): Promise<{ cr9: FormCr9; a2: FormA2 }> {
  const client = await pool.connect()

  try {
    await client.query("BEGIN")

    const amount = params.details.reduce((sum, d) => sum + d.amount, 0)

    // 1. Generate nomor urut CR9 (per branch office per tahun) & insert form_cr9
    const cr9SeqRes = await client.query<{ last_seq: number }>(
      /* sql */ `
        INSERT INTO form_number_counter (form_type, branch_office, year, last_seq)
        VALUES ('CR9', $1, $2, 1)
        ON CONFLICT (form_type, branch_office, year)
        DO UPDATE SET last_seq = form_number_counter.last_seq + 1
        RETURNING last_seq
      `,
      [params.branchOffice, params.year],
    )
    const cr9Seq = cr9SeqRes.rows[0]?.last_seq
    if (cr9Seq === undefined)
      throw new Error("Failed to generate CR9 sequence number")

    const cr9FormNumber = `CR9/${params.branchOffice}/${String(cr9Seq).padStart(4, "0")}/${String(params.month).padStart(2, "0")}/${params.year}`

    // receipt_url (kolom lama, single-file) sengaja tidak lagi ditulis di sini
    // — kuitansi sekarang disimpan di tabel form_cr9_receipt (bisa >1 file).
    const cr9Res = await client.query<FormCr9>(
      /* sql */ `
        INSERT INTO form_cr9 (
          created_by, branch_office, seq_number, month, year, form_number,
          cr9_type, is_work_accident,
          seafarer_code, seaman_code, seaman_name, position, ship, complaint,
          cr9_url, cr9_url_added_by, cr9_url_added_at,
          amount
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8,
          $9, $10, $11, $12, $13, $14,
          $15, $16, NOW(),
          $17
        )
        RETURNING *
      `,
      [
        params.createdBy, // 1
        params.branchOffice, // 2
        cr9Seq, // 3
        params.month, // 4
        params.year, // 5
        cr9FormNumber, // 6
        params.cr9Type, // 7
        params.isWorkAccident, // 8
        params.seafarerCode, // 9
        params.seamanCode, // 10
        params.seamanName, // 11
        params.position, // 12
        params.ship, // 13
        params.complaint, // 14
        params.cr9Url, // 15
        params.createdBy, // 16 cr9_url_added_by
        amount, // 17
      ],
    )
    const cr9 = cr9Res.rows[0]
    if (!cr9) throw new Error("Failed to create Form CR9")

    await receiptRepo.insertMany(
      client,
      cr9.id,
      params.receiptUrls,
      params.createdBy,
    )

    // 2. Generate nomor urut A2 (counter global) & insert form_a2 (draft)
    const a2SeqRes = await client.query<{ last_seq: number }>(
      /* sql */ `
        INSERT INTO form_number_counter (form_type, branch_office, year, last_seq)
        VALUES ('A2', 'GLOBAL', $1, 1)
        ON CONFLICT (form_type, branch_office, year)
        DO UPDATE SET last_seq = form_number_counter.last_seq + 1
        RETURNING last_seq
      `,
      [params.year],
    )
    const a2Seq = a2SeqRes.rows[0]?.last_seq
    if (a2Seq === undefined)
      throw new Error("Failed to generate A2 sequence number")

    const a2FormNumber = `A2/${String(a2Seq).padStart(4, "0")}/${String(params.month).padStart(2, "0")}/${params.year}`

    const a2Res = await client.query<FormA2>(
      /* sql */ `
        INSERT INTO form_a2 (
          form_cr9_id, created_by, seq_number, month, year, form_number, diagnosis
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `,
      [
        cr9.id,
        params.createdBy,
        a2Seq,
        params.month,
        params.year,
        a2FormNumber,
        params.diagnosis,
      ],
    )
    const a2 = a2Res.rows[0]
    if (!a2) throw new Error("Failed to create Form A2")

    // 3. Insert rincian biaya (semua baris pakai hospital_id ATAU
    // hospital_name_manual yang sama, sesuai cr9_type)
    for (const detail of params.details) {
      await client.query(
        /* sql */ `
          INSERT INTO form_a2_detail (form_a2_id, description, hospital_id, hospital_name_manual, amount)
          VALUES ($1, $2, $3, $4, $5)
        `,
        [
          a2.id,
          detail.description,
          params.hospitalId,
          params.hospitalNameManual,
          detail.amount,
        ],
      )
    }

    await client.query("COMMIT")
    return { cr9, a2 }
  } catch (err) {
    await client.query("ROLLBACK")
    throw err
  } finally {
    client.release()
  }
}

/**
 * Ganti diagnosis dan/atau seluruh rincian biaya Form A2 yang terhubung ke sebuah CR9.
 * Dipanggil saat staff cabang mengedit CR9 (draft/revision). Rincian lama dihapus &
 * diganti total (bukan di-patch per baris) supaya konsisten dengan form pengisian di FE
 * yang selalu mengirim daftar penuh. `form_cr9.amount` ikut disinkronkan dari SUM rincian baru.
 */
export async function replaceCr9DetailsAndDiagnosis(params: {
  cr9Id: string
  diagnosis?: string | undefined
  hospitalId?: string | undefined
  hospitalNameManual?: string | undefined
  details?: { description: string; amount: number }[] | undefined
}): Promise<void> {
  const client = await pool.connect()

  try {
    await client.query("BEGIN")

    const a2Res = await client.query<{ id: string }>(
      `SELECT id FROM form_a2 WHERE form_cr9_id = $1`,
      [params.cr9Id],
    )
    const a2Id = a2Res.rows[0]?.id
    if (!a2Id) throw new Error("Form A2 terkait tidak ditemukan")

    if (params.diagnosis !== undefined) {
      await client.query(
        `UPDATE form_a2 SET diagnosis = $1, updated_at = NOW() WHERE id = $2`,
        [params.diagnosis, a2Id],
      )
    }

    const hasHospital =
      params.hospitalId !== undefined || params.hospitalNameManual !== undefined
    if (params.details !== undefined && hasHospital) {
      await client.query(`DELETE FROM form_a2_detail WHERE form_a2_id = $1`, [
        a2Id,
      ])
      for (const detail of params.details) {
        await client.query(
          /* sql */ `
            INSERT INTO form_a2_detail (form_a2_id, description, hospital_id, hospital_name_manual, amount)
            VALUES ($1, $2, $3, $4, $5)
          `,
          [
            a2Id,
            detail.description,
            params.hospitalId ?? null,
            params.hospitalNameManual ?? null,
            detail.amount,
          ],
        )
      }
      const amount = params.details.reduce((sum, d) => sum + d.amount, 0)
      await client.query(
        `UPDATE form_cr9 SET amount = $1, updated_at = NOW() WHERE id = $2`,
        [amount, params.cr9Id],
      )
    }

    await client.query("COMMIT")
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
  step?: ApprovalStep
}): Promise<{ rows: FormA2WithCr9[]; total: number }> {
  const conditions: string[] = []
  const values: unknown[] = []
  let idx = 1

  if (params.step) {
    conditions.push(`a.status = 'pending'`)
    conditions.push(`a.current_step = $${idx++}`)
    values.push(params.step)
  }
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
  const total = Number((countRes.rows[0] as { count: string }).count)

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
        c.cr9_type,
        c.is_work_accident AS cr9_is_work_accident,
        u.full_name AS creator_name,
        u.email AS creator_email,
        us.full_name AS submitted_to_manager_name,
        us.email AS submitted_to_manager_email
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
        c.cr9_type,
        c.is_work_accident AS cr9_is_work_accident,
        u.full_name AS creator_name,
        u.email AS creator_email,
        us.full_name AS submitted_to_manager_name,
        us.email AS submitted_to_manager_email,
        nu.full_name AS news_added_by_name,
        nu.email AS news_added_by_email
      FROM form_a2 a
      JOIN form_cr9 c ON c.id = a.form_cr9_id
      JOIN users u ON u.id = a.created_by
      LEFT JOIN users us ON us.id = a.submitted_to_manager_by
      LEFT JOIN users nu ON nu.id = a.news_added_by
      WHERE a.id = $1
      LIMIT 1
    `,
    [id],
  )
  if (!a2Res.rows[0]) return null

  const a2 = a2Res.rows[0]

  const detailsRes = await pool.query<FormA2Detail>(
    /* sql */ `
      SELECT
        d.*,
        COALESCE(h.name, d.hospital_name_manual) AS hospital_name,
        h.category AS hospital_category,
        h.province AS hospital_province,
        h.city AS hospital_city
      FROM form_a2_detail d
      LEFT JOIN hospitals h ON h.id = d.hospital_id
      WHERE d.form_a2_id = $1
      ORDER BY d.created_at ASC
    `,
    [id],
  )

  const logsRes = await pool.query<FormA2ApprovalLog>(
    /* sql */ `
      SELECT l.*, u.full_name AS actioner_name, u.email AS actioner_email
      FROM form_a2_approval_log l
      JOIN users u ON u.id = l.actioned_by
      WHERE l.form_a2_id = $1
      ORDER BY l.actioned_at ASC
    `,
    [id],
  )

  const activeRevision = await findActiveRevision(id)

  return {
    ...a2,
    details: detailsRes.rows,
    approval_logs: logsRes.rows,
    active_revision: activeRevision,
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
 * Update news_url (berita acara) — satu-satunya field yang bisa diubah staff SPM
 * di Form A2. Diagnosis & rincian biaya diisi di tahap CR9 oleh staff cabang
 * (lihat `replaceCr9DetailsAndDiagnosis`).
 */
export async function update(
  id: string,
  dto: UpdateFormA2Dto,
  userId: string,
): Promise<FormA2 | null> {
  const fields: string[] = []
  const values: unknown[] = []
  let idx = 1

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

// ── Status transitions ────────────────────────────────────────────────────────

/** Admin SPM submit A2 ke approval chain: draft → pending, current_step = nautica */
export async function submitToManager(
  id: string,
  userId: string,
): Promise<FormA2 | null> {
  const result = await pool.query<FormA2>(
    /* sql */ `
      UPDATE form_a2
      SET
        status = 'pending',
        current_step = 'nautica',
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

// ── Approval actions ───────────────────────────────────────────────────────────

const NEXT_STEP: Record<ApprovalStep, string> = {
  nautica: `current_step = 'spm'`,
  spm: `current_step = 'finance'`,
  finance: `status = 'approved', current_step = NULL`,
}

export async function approve(
  id: string,
  step: ApprovalStep,
  userId: string,
  percentage: number,
  notes?: string,
): Promise<FormA2 | null> {
  const client = await pool.connect()
  try {
    await client.query("BEGIN")

    await client.query(
      `INSERT INTO form_a2_approval_log (form_a2_id, step, status, percentage, notes, actioned_by)
       VALUES ($1, $2, 'approved', $3, $4, $5)`,
      [id, step, percentage, notes ?? null, userId],
    )

    const result = await client.query<FormA2>(
      `UPDATE form_a2 SET ${NEXT_STEP[step]}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id],
    )

    await client.query("COMMIT")
    return result.rows[0] ?? null
  } catch (err) {
    await client.query("ROLLBACK")
    throw err
  } finally {
    client.release()
  }
}

export async function requestRevision(
  id: string,
  step: ApprovalStep,
  userId: string,
  notes: string,
  target: RevisionTargetRole,
): Promise<FormA2 | null> {
  const client = await pool.connect()
  try {
    await client.query("BEGIN")

    await client.query(
      `INSERT INTO form_a2_approval_log (form_a2_id, step, status, notes, actioned_by)
       VALUES ($1, $2, 'revision', $3, $4)`,
      [id, step, notes, userId],
    )

    await client.query(
      `INSERT INTO form_a2_revision (form_a2_id, step, target_role, requested_by, notes)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, step, target, userId, notes],
    )

    const result = await client.query<FormA2>(
      `UPDATE form_a2 SET status = 'revision', current_step = NULL, updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id],
    )

    await client.query("COMMIT")
    return result.rows[0] ?? null
  } catch (err) {
    await client.query("ROLLBACK")
    throw err
  } finally {
    client.release()
  }
}

/**
 * Selesaikan revisi NOMINAL (diminta manager SPM/Finance, target-nya manager
 * step sebelumnya — bukan staff). Beda dari `resolveRevisionAndResubmit`:
 * di sini yang "menyelesaikan" adalah si manager target dengan APPROVE ulang
 * pakai persentase baru (insert approval_log 'approved'), bukan staff submit.
 * Setelah selesai, langsung balik ke step yang tadi minta revisi (skip approve
 * ulang oleh step perantara) — bukan lanjut lewat NEXT_STEP seperti approve biasa.
 */
export async function resolveNominalRevision(
  formA2Id: string,
  revisionId: string,
  step: ApprovalStep,
  userId: string,
  percentage: number,
  notes?: string,
): Promise<FormA2 | null> {
  const client = await pool.connect()
  try {
    await client.query("BEGIN")

    await client.query(
      `INSERT INTO form_a2_approval_log (form_a2_id, step, status, percentage, notes, actioned_by)
       VALUES ($1, $2, 'approved', $3, $4, $5)`,
      [formA2Id, step, percentage, notes ?? null, userId],
    )

    const revRes = await client.query<{ step: ApprovalStep }>(
      `UPDATE form_a2_revision SET is_resolved = TRUE, resolved_by = $1, resolved_at = NOW()
       WHERE id = $2 RETURNING step`,
      [userId, revisionId],
    )
    const requesterStep = revRes.rows[0]?.step
    if (!requesterStep) {
      await client.query("ROLLBACK")
      return null
    }

    const result = await client.query<FormA2>(
      `UPDATE form_a2 SET status = 'pending', current_step = $1, updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [requesterStep, formA2Id],
    )

    await client.query("COMMIT")
    return result.rows[0] ?? null
  } catch (err) {
    await client.query("ROLLBACK")
    throw err
  } finally {
    client.release()
  }
}

/** Cari revisi yang masih aktif (belum diselesaikan) untuk sebuah Form A2. */
export async function findActiveRevision(
  formA2Id: string,
): Promise<FormA2Revision | null> {
  const result = await pool.query<FormA2Revision>(
    /* sql */ `
      SELECT
        rev.*,
        rq.full_name AS requested_by_name,
        rq.email AS requested_by_email,
        rs.full_name AS resolved_by_name,
        rs.email AS resolved_by_email
      FROM form_a2_revision rev
      LEFT JOIN users rq ON rq.id = rev.requested_by
      LEFT JOIN users rs ON rs.id = rev.resolved_by
      WHERE rev.form_a2_id = $1 AND rev.is_resolved = FALSE
      ORDER BY rev.requested_at DESC
      LIMIT 1
    `,
    [formA2Id],
  )
  return result.rows[0] ?? null
}

/**
 * Tandai revisi sebagai selesai, lalu ajukan ulang Form A2 ke step yang
 * sebelumnya meminta revisi (bukan selalu 'nautica' — lihat bug lama di
 * `submitToManager`, yang hanya dipakai untuk pengajuan pertama kali).
 */
export async function resolveRevisionAndResubmit(
  formA2Id: string,
  revisionId: string,
  targetStep: ApprovalStep,
  submittedBy: string,
): Promise<FormA2 | null> {
  const client = await pool.connect()
  try {
    await client.query("BEGIN")

    await client.query(
      /* sql */ `
        UPDATE form_a2_revision
        SET is_resolved = TRUE, resolved_by = $1, resolved_at = NOW()
        WHERE id = $2
      `,
      [submittedBy, revisionId],
    )

    const result = await client.query<FormA2>(
      /* sql */ `
        UPDATE form_a2
        SET
          status = 'pending',
          current_step = $1,
          submitted_to_manager_at = NOW(),
          submitted_to_manager_by = $2,
          updated_at = NOW()
        WHERE id = $3
        RETURNING *
      `,
      [targetStep, submittedBy, formA2Id],
    )

    await client.query("COMMIT")
    return result.rows[0] ?? null
  } catch (err) {
    await client.query("ROLLBACK")
    throw err
  } finally {
    client.release()
  }
}

/**
 * Admin SPM mengirim form kembali ke staff cabang untuk revisi data —
 * dipakai SEBELUM form pernah diajukan ke manager (status masih 'draft').
 * `step: 'nautica'` di sini cuma penanda "tujuan berikutnya setelah
 * diperbaiki & diajukan normal", bukan hasil aksi seorang approver — beda
 * dari revisi yang dipicu Nautica/SPM-manager/Finance di dalam approval chain.
 */
export async function requestPreChainRevision(
  formA2Id: string,
  userId: string,
  notes: string,
): Promise<FormA2 | null> {
  const client = await pool.connect()
  try {
    await client.query("BEGIN")

    await client.query(
      /* sql */ `
        INSERT INTO form_a2_revision (form_a2_id, step, target_role, requested_by, notes)
        VALUES ($1, 'nautica', 'staff_cabang', $2, $3)
      `,
      [formA2Id, userId, notes],
    )

    const result = await client.query<FormA2>(
      `UPDATE form_a2 SET status = 'revision', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [formA2Id],
    )

    await client.query("COMMIT")
    return result.rows[0] ?? null
  } catch (err) {
    await client.query("ROLLBACK")
    throw err
  } finally {
    client.release()
  }
}

/**
 * Selesaikan revisi pra-chain setelah cabang memperbaiki data — form
 * kembali ke 'draft' (BUKAN 'pending'), karena staff SPM belum pernah
 * benar-benar mengajukan ke manager. Beda dari `resolveRevisionAndResubmit`
 * yang dipakai untuk revisi dalam approval chain.
 */
export async function resolvePreChainRevision(
  formA2Id: string,
  revisionId: string,
  resolvedBy: string,
): Promise<FormA2 | null> {
  const client = await pool.connect()
  try {
    await client.query("BEGIN")

    await client.query(
      /* sql */ `
        UPDATE form_a2_revision
        SET is_resolved = TRUE, resolved_by = $1, resolved_at = NOW()
        WHERE id = $2
      `,
      [resolvedBy, revisionId],
    )

    const result = await client.query<FormA2>(
      `UPDATE form_a2 SET status = 'draft', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [formA2Id],
    )

    await client.query("COMMIT")
    return result.rows[0] ?? null
  } catch (err) {
    await client.query("ROLLBACK")
    throw err
  } finally {
    client.release()
  }
}

export async function reject(
  id: string,
  step: ApprovalStep,
  userId: string,
  notes: string,
): Promise<FormA2 | null> {
  const client = await pool.connect()
  try {
    await client.query("BEGIN")

    await client.query(
      `INSERT INTO form_a2_approval_log (form_a2_id, step, status, notes, actioned_by)
       VALUES ($1, $2, 'rejected', $3, $4)`,
      [id, step, notes, userId],
    )

    const result = await client.query<FormA2>(
      `UPDATE form_a2 SET status = 'rejected', current_step = NULL, updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id],
    )

    await client.query("COMMIT")
    return result.rows[0] ?? null
  } catch (err) {
    await client.query("ROLLBACK")
    throw err
  } finally {
    client.release()
  }
}
