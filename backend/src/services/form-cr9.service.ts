import * as a2Repo from "@/repositories/form-a2.repository"
import * as repo from "@/repositories/form-cr9.repository"
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
 * - Staff SPM / dept lain → pakai nama department (huruf besar)
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
  // cabang atau role lain → filter ke branch_office sendiri
  return user.branch_office ?? "NONE"
}

/**
 * Format: CR9/{branchOffice}/{seq:04d}/{month:02d}/{year}
 */
function buildFormNumber(
  branchOffice: string,
  seq: number,
  month: number,
  year: number,
): string {
  const s = String(seq).padStart(4, "0")
  const m = String(month).padStart(2, "0")
  return `CR9/${branchOffice}/${s}/${m}/${year}`
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
  // Hanya admin & staff yang boleh create
  if (user.role !== "admin" && user.role !== "staff") {
    throw new AppError(
      "Hanya staff yang dapat membuat Form CR9",
      403,
      "FORBIDDEN",
    )
  }

  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()
  const branchOffice = resolveBranchOffice(user)

  const seq = await repo.nextSeqNumber(branchOffice, year)
  const formNumber = buildFormNumber(branchOffice, seq, month, year)

  return repo.create(user.id, branchOffice, seq, month, year, formNumber, dto)
}

export async function updateFormCr9(
  user: JwtPayload,
  id: string,
  dto: UpdateFormCr9Dto,
) {
  // Hanya admin & staff yang boleh update
  if (user.role !== "admin" && user.role !== "staff") {
    throw new AppError(
      "Hanya staff yang dapat mengubah Form CR9",
      403,
      "FORBIDDEN",
    )
  }

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

  const updated = await repo.update(id, dto, user.id)
  if (!updated)
    throw new AppError(
      "Gagal mengupdate Form CR9",
      500,
      "INTERNAL_SERVER_ERROR",
    )
  return updated
}

export async function submitFormCr9(user: JwtPayload, id: string) {
  // Hanya staff & admin yang boleh submit
  if (user.role !== "admin" && user.role !== "staff") {
    throw new AppError(
      "Hanya staff yang dapat mengajukan Form CR9",
      403,
      "FORBIDDEN",
    )
  }

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

  const now = new Date()
  const { cr9, a2 } = await a2Repo.submitCr9AndCreateA2({
    cr9Id: id,
    createdBy: user.id,
    diagnosis: form.complaint, // initial value dari complaint CR9
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  })

  return { cr9, a2 }
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

  const deleted = await repo.remove(id)
  if (!deleted)
    throw new AppError("Gagal menghapus Form CR9", 500, "INTERNAL_SERVER_ERROR")
}
