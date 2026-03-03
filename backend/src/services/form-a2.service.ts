import * as repo from "@/repositories/form-a2.repository"
import * as cr9Repo from "@/repositories/form-cr9.repository"
import type { JwtPayload } from "@/types/auth"
import { AppError } from "@/utils/app-error"
import type {
  AddDetailDto,
  ListFormA2Query,
  UpdateFormA2Dto,
} from "@/validations/form-a2.validation"

// ── Helpers ───────────────────────────────────────────────────────────────────

function getBranchFilter(user: JwtPayload): string | null {
  if (user.role === "admin") return null
  if (user.department === "spm" || user.department === "finance") return null
  // manager nautica tetap bisa lihat semua (untuk approval)
  if (user.role === "manager") return null
  return user.branch_office ?? "NONE"
}

function assertSpmOrAdmin(user: JwtPayload, action: string) {
  const isSpmStaff = user.role === "staff" && user.department === "spm"
  if (user.role !== "admin" && !isSpmStaff) {
    throw new AppError(`Hanya staff SPM yang dapat ${action}`, 403, "FORBIDDEN")
  }
}

// ── Service ───────────────────────────────────────────────────────────────────

export async function listFormA2(user: JwtPayload, query: ListFormA2Query) {
  const branchFilter = getBranchFilter(user)
  const offset = (query.page - 1) * query.limit

  const { rows, total } = await repo.findAll({
    branchFilter,
    formNumber: query.form_number,
    seamanName: query.seaman_name,
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

export async function getFormA2(user: JwtPayload, id: string) {
  const form = await repo.findById(id)
  if (!form) throw new AppError("Form A2 tidak ditemukan", 404, "NOT_FOUND")

  const branchFilter = getBranchFilter(user)
  if (branchFilter !== null && form.branch_office !== branchFilter) {
    throw new AppError("Akses ditolak", 403, "FORBIDDEN")
  }

  return form
}

export async function getFormA2ByCr9Id(user: JwtPayload, cr9Id: string) {
  const form = await repo.findByCr9Id(cr9Id)
  if (!form) throw new AppError("Form A2 tidak ditemukan", 404, "NOT_FOUND")

  const branchFilter = getBranchFilter(user)
  if (branchFilter !== null && form.branch_office !== branchFilter) {
    throw new AppError("Akses ditolak", 403, "FORBIDDEN")
  }

  return form
}

export async function updateFormA2(
  user: JwtPayload,
  id: string,
  dto: UpdateFormA2Dto,
) {
  assertSpmOrAdmin(user, "mengubah Form A2")

  const form = await repo.findById(id)
  if (!form) throw new AppError("Form A2 tidak ditemukan", 404, "NOT_FOUND")

  if (form.status !== "draft" && form.status !== "revision") {
    throw new AppError(
      "Form A2 hanya bisa diubah saat berstatus draft atau revision",
      422,
      "UNPROCESSABLE",
    )
  }

  const updated = await repo.update(id, dto, user.id)
  if (!updated) {
    throw new AppError("Gagal mengupdate Form A2", 500, "INTERNAL_SERVER_ERROR")
  }
  return updated
}

export async function addFormA2Detail(
  user: JwtPayload,
  formA2Id: string,
  dto: AddDetailDto,
) {
  assertSpmOrAdmin(user, "menambah detail biaya")

  const form = await repo.findById(formA2Id)
  if (!form) throw new AppError("Form A2 tidak ditemukan", 404, "NOT_FOUND")

  if (form.status !== "draft" && form.status !== "revision") {
    throw new AppError(
      "Detail biaya hanya bisa ditambah saat status draft atau revision",
      422,
      "UNPROCESSABLE",
    )
  }

  return repo.addDetail(formA2Id, dto)
}

export async function removeFormA2Detail(
  user: JwtPayload,
  formA2Id: string,
  detailId: string,
) {
  assertSpmOrAdmin(user, "menghapus detail biaya")

  const form = await repo.findById(formA2Id)
  if (!form) throw new AppError("Form A2 tidak ditemukan", 404, "NOT_FOUND")

  if (form.status !== "draft" && form.status !== "revision") {
    throw new AppError(
      "Detail biaya hanya bisa dihapus saat status draft atau revision",
      422,
      "UNPROCESSABLE",
    )
  }

  const deleted = await repo.removeDetail(detailId)
  if (!deleted) {
    throw new AppError("Detail tidak ditemukan", 404, "NOT_FOUND")
  }
}

export async function submitFormA2ToManager(user: JwtPayload, id: string) {
  assertSpmOrAdmin(user, "mengajukan Form A2 ke manager")

  const form = await repo.findById(id)
  if (!form) throw new AppError("Form A2 tidak ditemukan", 404, "NOT_FOUND")

  if (form.status !== "draft" && form.status !== "revision") {
    throw new AppError(
      "Form A2 hanya bisa diajukan saat berstatus draft atau revision",
      422,
      "UNPROCESSABLE",
    )
  }

  if (!form.diagnosis.trim()) {
    throw new AppError(
      "Diagnosis wajib diisi sebelum mengajukan",
      422,
      "UNPROCESSABLE",
    )
  }

  if (!form.news_url) {
    throw new AppError(
      "Berita acara wajib diupload sebelum mengajukan",
      422,
      "UNPROCESSABLE",
    )
  }

  if (!form.details || form.details.length === 0) {
    throw new AppError(
      "Minimal satu uraian biaya wajib diisi sebelum mengajukan",
      422,
      "UNPROCESSABLE",
    )
  }

  // Validasi sum detail = amount CR9
  const cr9 = await cr9Repo.findById(form.form_cr9_id)
  if (cr9) {
    const sumDetails = form.details.reduce(
      (acc, d) => acc + Number(d.amount),
      0,
    )
    const cr9Amount = Number(cr9.amount)
    if (Math.abs(sumDetails - cr9Amount) > 0.01) {
      throw new AppError(
        `Total uraian biaya (${sumDetails.toLocaleString("id-ID")}) harus sama dengan jumlah di Form CR9 (${cr9Amount.toLocaleString("id-ID")})`,
        422,
        "UNPROCESSABLE",
      )
    }
  }

  const updated = await repo.submitToManager(id, user.id)
  if (!updated) {
    throw new AppError("Gagal mengajukan Form A2", 500, "INTERNAL_SERVER_ERROR")
  }
  return updated
}
