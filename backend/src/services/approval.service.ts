import type { ApprovalStep } from "@/models/form-a2.model"
import * as repo from "@/repositories/form-a2.repository"
import type { JwtPayload } from "@/types/auth"
import { AppError } from "@/utils/app-error"
import type {
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

  const resolvedNotes =
    dto.notes?.trim() ||
    `Pengajuan dokumen sudah diverifikasi. Pengajuan disetujui dengan ${dto.percentage}%`
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

  const updated = await repo.requestRevision(id, step, user.id, dto.notes)
  if (!updated) {
    throw new AppError(
      "Gagal mengajukan revisi Form A2",
      500,
      "INTERNAL_SERVER_ERROR",
    )
  }
  return updated
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
