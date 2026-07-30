import * as a2Repo from "@/repositories/form-a2.repository"
import * as repo from "@/repositories/form-cr9.repository"
import * as receiptRepo from "@/repositories/form-cr9-receipt.repository"
import type { JwtPayload } from "@/types/auth"
import { AppError } from "@/utils/app-error"
import type {
  CreateFormCr9Dto,
  ListFormCr9Query,
  UpdateFormCr9Dto,
} from "@/validations/form-cr9.validation"

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Tentukan branch_office yang dipakai untuk form_number & counter.
 * - Cabang → pakai branch_office user
 * - Admin SPM / dept lain → pakai nama department (huruf besar)
 * - Admin / tidak diketahui → 'HO'
 */
function resolveBranchOffice(user: JwtPayload): string {
  if (user.branch_office) return user.branch_office
  if (user.department) return user.department.toUpperCase()
  return "HO"
}

/**
 * null  → user boleh lihat semua
 * string → user hanya boleh lihat branch_office tertentu
 */
function getBranchFilter(user: JwtPayload): string | null {
  if (user.role === "admin") return null
  if (user.department === "spm" || user.department === "finance") return null
  if (user.role === "manager") return null
  // cabang atau role lain → filter ke branch_office sendiri
  return user.branch_office ?? "NONE"
}

/**
 * Hanya staff cabang atau Admin SPM (dan admin) yang boleh mengelola CR9 —
 * staff dari departemen lain (finance, nautica) tidak boleh.
 */
function assertCanManageCr9(user: JwtPayload, action: string) {
  const isCabangStaff = user.role === "staff" && user.department === "cabang"
  const isAdminSpm = user.role === "admin_spm" && user.department === "spm"
  if (user.role !== "admin" && !isCabangStaff && !isAdminSpm) {
    throw new AppError(
      `Hanya staff cabang atau Admin SPM yang dapat ${action}`,
      403,
      "FORBIDDEN",
    )
  }
}

// ── Service ───────────────────────────────────────────────────────────────────

export async function listFormCr9(user: JwtPayload, query: ListFormCr9Query) {
  const branchFilter = getBranchFilter(user)
  const offset = (query.page - 1) * query.limit

  const { rows, total } = await repo.findAll({
    branchFilter,
    formNumber: query.form_number,
    seamanName: query.seaman_name,
    seamanCode: query.seaman_code,
    ship: query.ship,
    fromDate: query.from_date,
    toDate: query.to_date,
    limit: query.limit,
    offset,
  })

  return {
    data: rows,
    total,
    page: query.page,
    limit: query.limit,
    total_pages: Math.ceil(total / query.limit),
  }
}

export async function getFormCr9(user: JwtPayload, id: string) {
  const form = await repo.findById(id)
  if (!form) throw new AppError("Form CR9 tidak ditemukan", 404, "NOT_FOUND")

  // Cabang hanya boleh akses milik branch-nya sendiri
  const branchFilter = getBranchFilter(user)
  if (branchFilter !== null && form.branch_office !== branchFilter) {
    throw new AppError("Akses ditolak", 403, "FORBIDDEN")
  }

  return form
}

export async function createFormCr9(user: JwtPayload, dto: CreateFormCr9Dto) {
  assertCanManageCr9(user, "membuat Form CR9")

  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  const branchOffice = dto.branch_office ?? resolveBranchOffice(user)

  const { cr9, a2 } = await a2Repo.createCr9AndA2({
    createdBy: user.id,
    branchOffice,
    month,
    year,
    seafarerCode: dto.seafarer_code,
    seamanCode: dto.seaman_code,
    seamanName: dto.seaman_name,
    position: dto.position,
    ship: dto.ship,
    complaint: dto.complaint,
    cr9Url: dto.cr9_url,
    receiptUrls: dto.receipt_urls,
    diagnosis: dto.diagnosis,
    cr9Type: dto.cr9_type,
    isWorkAccident: dto.is_work_accident ?? null,
    hospitalId: dto.hospital_id ?? null,
    hospitalNameManual: dto.hospital_name_manual ?? null,
    details: dto.details,
  })

  return { ...cr9, form_a2_id: a2.id }
}

export async function updateFormCr9(
  user: JwtPayload,
  id: string,
  dto: UpdateFormCr9Dto,
) {
  assertCanManageCr9(user, "mengubah Form CR9")

  const form = await repo.findById(id)
  if (!form) throw new AppError("Form CR9 tidak ditemukan", 404, "NOT_FOUND")

  // Form yang sudah approved tidak bisa diubah
  if (form.status === "approved") {
    throw new AppError(
      "Form yang sudah disetujui tidak dapat diubah",
      422,
      "UNPROCESSABLE",
    )
  }

  // Cabang hanya boleh ubah milik branch-nya sendiri
  const branchFilter = getBranchFilter(user)
  if (branchFilter !== null && form.branch_office !== branchFilter) {
    throw new AppError("Akses ditolak", 403, "FORBIDDEN")
  }

  const linkedA2 = await a2Repo.findByCr9Id(id)

  // Setelah CR9 diajukan, data hanya boleh diubah lagi kalau Form A2 terkait
  // sedang direvisi DAN revisinya ditujukan ke staff cabang (data kelengkapan).
  // Selain itu, data sudah "terkunci" untuk cabang selama proses approval berjalan.
  if (form.status !== "draft" && user.role !== "admin") {
    const activeRevision = linkedA2
      ? await a2Repo.findActiveRevision(linkedA2.id)
      : null
    const canEditDuringRevision =
      linkedA2?.status === "revision" &&
      activeRevision?.target_role === "staff_cabang"
    if (!canEditDuringRevision) {
      throw new AppError(
        "Form CR9 hanya bisa diubah saat draft, atau saat sedang direvisi (data kelengkapan)",
        422,
        "UNPROCESSABLE",
      )
    }
  }

  const updated = await repo.update(id, dto, user.id)
  if (!updated)
    throw new AppError(
      "Gagal mengupdate Form CR9",
      500,
      "INTERNAL_SERVER_ERROR",
    )

  if (dto.receipt_urls !== undefined) {
    await receiptRepo.replaceAll(id, dto.receipt_urls, user.id)
  }

  // Diagnosis & rincian biaya disimpan di Form A2 terkait, bukan di form_cr9.
  if (
    dto.diagnosis !== undefined ||
    dto.details !== undefined ||
    dto.hospital_id !== undefined ||
    dto.hospital_name_manual !== undefined
  ) {
    await a2Repo.replaceCr9DetailsAndDiagnosis({
      cr9Id: id,
      diagnosis: dto.diagnosis,
      hospitalId: dto.hospital_id,
      hospitalNameManual: dto.hospital_name_manual,
      details: dto.details,
    })
  }

  // Kalau cabang baru saja memperbaiki data untuk revisi yang ditujukan ke
  // mereka, otomatis selesaikan revisinya — cabang tidak perlu tombol submit
  // terpisah. Dua kemungkinan tujuan setelah diperbaiki:
  // - Revisi pra-chain (diminta staff SPM sebelum form pernah diajukan ke
  //   manager) → kembali ke 'draft', staff SPM review ulang & submit normal.
  // - Revisi dalam approval chain (diminta Nautica/SPM-manager/Finance)
  //   → langsung diajukan ulang ke step yang minta revisi tadi.
  if (linkedA2?.status === "revision") {
    const activeRevision = await a2Repo.findActiveRevision(linkedA2.id)
    if (activeRevision?.target_role === "staff_cabang") {
      if (linkedA2.submitted_to_manager_at) {
        await a2Repo.resolveRevisionAndResubmit(
          linkedA2.id,
          activeRevision.id,
          activeRevision.step,
          user.id,
        )
      } else {
        await a2Repo.resolvePreChainRevision(
          linkedA2.id,
          activeRevision.id,
          user.id,
        )
      }
    }
  }

  const result = await repo.findById(id)
  if (!result)
    throw new AppError(
      "Gagal mengupdate Form CR9",
      500,
      "INTERNAL_SERVER_ERROR",
    )
  return result
}

export async function submitFormCr9(user: JwtPayload, id: string) {
  assertCanManageCr9(user, "mengajukan Form CR9")

  const form = await repo.findById(id)
  if (!form) throw new AppError("Form CR9 tidak ditemukan", 404, "NOT_FOUND")

  if (form.status !== "draft") {
    throw new AppError(
      "Hanya form berstatus draft yang dapat diajukan",
      422,
      "UNPROCESSABLE",
    )
  }

  // Cabang hanya boleh submit milik branch-nya sendiri
  const branchFilter = getBranchFilter(user)
  if (branchFilter !== null && form.branch_office !== branchFilter) {
    throw new AppError("Akses ditolak", 403, "FORBIDDEN")
  }

  const result = await repo.submitCr9(id)
  if (!result) {
    throw new AppError(
      "Gagal mengajukan Form CR9",
      500,
      "INTERNAL_SERVER_ERROR",
    )
  }
  return result
}

export async function deleteFormCr9(user: JwtPayload, id: string) {
  // Hanya admin
  if (user.role !== "admin") {
    throw new AppError(
      "Hanya admin yang dapat menghapus Form CR9",
      403,
      "FORBIDDEN",
    )
  }

  const form = await repo.findById(id)
  if (!form) throw new AppError("Form CR9 tidak ditemukan", 404, "NOT_FOUND")

  const deleted = await repo.removeCascade(id)
  if (!deleted)
    throw new AppError("Gagal menghapus Form CR9", 500, "INTERNAL_SERVER_ERROR")
}
