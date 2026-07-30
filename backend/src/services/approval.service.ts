import type { ApprovalStep, RevisionTargetRole } from "@/models/form-a2.model"
import * as approvalRepo from "@/repositories/approval.repository"
import * as repo from "@/repositories/form-a2.repository"
import type { JwtPayload } from "@/types/auth"
import { AppError } from "@/utils/app-error"
import type {
  ApprovalLogQueryDto,
  ApproveDto,
  RejectDto,
  ResolveNominalRevisionDto,
  RevisionDto,
} from "@/validations/approval.validation"

/**
 * Manager mana yang harus memperbaiki kalau target revisi nominal ini —
 * cuma valid diminta dari step SETELAHnya (SPM minta ke Nautica, Finance
 * minta ke SPM). Manager Nautica tidak punya step manager sebelumnya, jadi
 * tidak pernah muncul di sini. Dipakai untuk memvalidasi PERMINTAAN revisi.
 */
const NOMINAL_REVISION_TARGET_BY_STEP: Partial<
  Record<ApprovalStep, RevisionTargetRole>
> = {
  spm: "manager_nautica",
  finance: "manager_spm",
}

/**
 * Kebalikan dari peta di atas — dipakai untuk memvalidasi siapa yang boleh
 * MENYELESAIKAN revisi nominal: step approver sendiri harus cocok dengan
 * "nama"-nya di target_role (nautica menyelesaikan target manager_nautica,
 * spm menyelesaikan target manager_spm). Finance tidak pernah jadi target,
 * jadi tidak pernah muncul di sini.
 */
const MANAGER_TARGET_ROLE_BY_OWN_STEP: Partial<
  Record<ApprovalStep, RevisionTargetRole>
> = {
  nautica: "manager_nautica",
  spm: "manager_spm",
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getManagerStep(user: JwtPayload): ApprovalStep | null {
  if (user.role === "manager" && user.department === "spm") return "spm"
  if (user.role === "manager" && user.department === "nautica") return "nautica"
  if (user.department === "finance") return "finance"
  return null
}

function assertApprover(user: JwtPayload): ApprovalStep {
  const step = getManagerStep(user)
  if (!step) {
    throw new AppError(
      "Anda tidak memiliki akses untuk melakukan approval",
      403,
      "FORBIDDEN",
    )
  }
  return step
}

function assertFormPendingAtStep(
  form: Awaited<ReturnType<typeof repo.findById>>,
  step: ApprovalStep,
) {
  if (!form) throw new AppError("Form A2 tidak ditemukan", 404, "NOT_FOUND")
  if (form.status !== "pending" || form.current_step !== step) {
    throw new AppError(
      "Form A2 tidak dalam antrian approval Anda",
      422,
      "UNPROCESSABLE",
    )
  }
}

/**
 * CR9 Reimbursement dengan kecelakaan kerja = persentase reimbursement
 * terkunci 100% di setiap step approval, tidak bisa diubah approver.
 */
function assertPercentageAllowed(
  form: Awaited<ReturnType<typeof repo.findById>>,
  percentage: number,
) {
  if (
    form?.cr9_type === "reimbursement" &&
    form.cr9_is_work_accident &&
    percentage !== 100
  ) {
    throw new AppError(
      "Kecelakaan kerja: persentase reimbursement wajib 100% dan tidak bisa diubah",
      422,
      "UNPROCESSABLE",
    )
  }
}

// ── Services ──────────────────────────────────────────────────────────────────

export async function listPendingApproval(user: JwtPayload) {
  const step = assertApprover(user)

  const { rows } = await repo.findAll({
    branchFilter: null,
    formNumber: undefined,
    seamanName: undefined,
    fromDate: undefined,
    toDate: undefined,
    limit: 200,
    offset: 0,
    step,
  })

  return rows
}

export async function approveFormA2(
  user: JwtPayload,
  id: string,
  dto: ApproveDto,
) {
  const step = assertApprover(user)
  const form = await repo.findById(id)
  assertFormPendingAtStep(form, step)
  assertPercentageAllowed(form, dto.percentage)

  const cr9Amount = Number(form?.cr9_amount ?? 0)
  const approvedAmount = (cr9Amount * dto.percentage) / 100
  const autoNotes = `Pengajuan dokumen sudah diverifikasi. Pengajuan disetujui dengan jumlah nominal Rp ${approvedAmount.toLocaleString("id-ID")} dari Rp ${cr9Amount.toLocaleString("id-ID")} (${dto.percentage}%)`
  const resolvedNotes = dto.notes?.trim()
    ? `${autoNotes}\n Keterangan: ${dto.notes.trim()}`
    : autoNotes
  const updated = await repo.approve(
    id,
    step,
    user.id,
    dto.percentage,
    resolvedNotes,
  )
  if (!updated) {
    throw new AppError("Gagal menyetujui Form A2", 500, "INTERNAL_SERVER_ERROR")
  }
  return updated
}

export async function requestRevisionFormA2(
  user: JwtPayload,
  id: string,
  dto: RevisionDto,
) {
  const step = assertApprover(user)
  const form = await repo.findById(id)
  assertFormPendingAtStep(form, step)

  if (dto.target === "manager_nautica" || dto.target === "manager_spm") {
    const expectedTarget = NOMINAL_REVISION_TARGET_BY_STEP[step]
    if (dto.target !== expectedTarget) {
      throw new AppError(
        step === "nautica"
          ? "Manager Nautica tidak dapat meminta revisi nominal (tidak ada step manager sebelumnya)"
          : "Target revisi nominal tidak valid untuk step ini",
        422,
        "UNPROCESSABLE",
      )
    }
  }

  const updated = await repo.requestRevision(
    id,
    step,
    user.id,
    dto.notes,
    dto.target,
  )
  if (!updated) {
    throw new AppError(
      "Gagal mengajukan revisi Form A2",
      500,
      "INTERNAL_SERVER_ERROR",
    )
  }
  return updated
}

/**
 * Manager (Nautica/SPM) menyelesaikan revisi NOMINAL yang diminta step
 * setelahnya, dengan approve ulang pakai persentase yang sudah diperbaiki.
 * Beda dari resolusi revisi staff (`submitFormA2ToManager`) — di sini yang
 * menyelesaikan adalah manager, bukan staff cabang/Admin SPM.
 */
export async function resolveNominalRevisionFormA2(
  user: JwtPayload,
  id: string,
  dto: ResolveNominalRevisionDto,
) {
  const step = assertApprover(user)
  const form = await repo.findById(id)
  if (!form) throw new AppError("Form A2 tidak ditemukan", 404, "NOT_FOUND")
  if (form.status !== "revision") {
    throw new AppError(
      "Form A2 tidak sedang menunggu revisi nominal",
      422,
      "UNPROCESSABLE",
    )
  }

  const activeRevision = await repo.findActiveRevision(id)
  const expectedTarget = MANAGER_TARGET_ROLE_BY_OWN_STEP[step]
  if (
    !activeRevision ||
    !expectedTarget ||
    activeRevision.target_role !== expectedTarget
  ) {
    throw new AppError(
      "Form ini tidak menunggu revisi nominal dari Anda",
      422,
      "UNPROCESSABLE",
    )
  }

  assertPercentageAllowed(form, dto.percentage)

  const cr9Amount = Number(form?.cr9_amount ?? 0)
  const approvedAmount = (cr9Amount * dto.percentage) / 100
  const autoNotes = `Revisi nominal diselesaikan. Pengajuan disetujui dengan jumlah nominal Rp ${approvedAmount.toLocaleString("id-ID")} dari Rp ${cr9Amount.toLocaleString("id-ID")} (${dto.percentage}%)`
  const resolvedNotes = dto.notes?.trim()
    ? `${autoNotes}\n Keterangan: ${dto.notes.trim()}`
    : autoNotes

  const updated = await repo.resolveNominalRevision(
    id,
    activeRevision.id,
    step,
    user.id,
    dto.percentage,
    resolvedNotes,
  )
  if (!updated) {
    throw new AppError(
      "Gagal menyelesaikan revisi nominal",
      500,
      "INTERNAL_SERVER_ERROR",
    )
  }
  return updated
}

export async function listApprovalLogs(dto: ApprovalLogQueryDto) {
  const limit = dto.limit ?? 15
  const page = dto.page ?? 1
  const offset = (page - 1) * limit
  const { rows, total } = await approvalRepo.findAllApprovalLogs({
    ...(dto.form_number && { formNumber: dto.form_number }),
    ...(dto.seaman_name && { seamanName: dto.seaman_name }),
    ...(dto.step && { step: dto.step as ApprovalStep }),
    ...(dto.status && { status: dto.status }),
    ...(dto.from_date && { fromDate: dto.from_date }),
    ...(dto.to_date && { toDate: dto.to_date }),
    limit,
    offset,
  })
  return {
    data: rows,
    total,
    page,
    limit,
    total_pages: Math.ceil(total / limit),
  }
}

export async function rejectFormA2(
  user: JwtPayload,
  id: string,
  dto: RejectDto,
) {
  const step = assertApprover(user)
  const form = await repo.findById(id)
  assertFormPendingAtStep(form, step)

  const updated = await repo.reject(id, step, user.id, dto.notes)
  if (!updated) {
    throw new AppError("Gagal menolak Form A2", 500, "INTERNAL_SERVER_ERROR")
  }
  return updated
}
