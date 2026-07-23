import type { ApprovalStep } from "@/models/form-a2.model"
import * as approvalRepo from "@/repositories/approval.repository"
import * as repo from "@/repositories/form-a2.repository"
import type { JwtPayload } from "@/types/auth"
import { AppError } from "@/utils/app-error"
import type {
  ApprovalLogQueryDto,
  ApproveDto,
  RejectDto,
  RevisionDto,
} from "@/validations/approval.validation"

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
