import * as repo from "@/repositories/form-a2.repository"
import type { JwtPayload } from "@/types/auth"
import { AppError } from "@/utils/app-error"
import type {
  ListFormA2Query,
  RequestCabangRevisionDto,
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
  const isAdminSpm = user.role === "admin_spm" && user.department === "spm"
  if (user.role !== "admin" && !isAdminSpm) {
    throw new AppError(`Hanya Admin SPM yang dapat ${action}`, 403, "FORBIDDEN")
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

  if (form.status === "revision") {
    // Kalau revisi ditujukan ke staff cabang (data kelengkapan), staff SPM
    // belum boleh mengubah apa pun sampai cabang selesai memperbaiki datanya.
    const activeRevision = await repo.findActiveRevision(id)
    if (activeRevision && activeRevision.target_role !== "staff_spm") {
      throw new AppError(
        "Form ini sedang menunggu revisi data kelengkapan dari staff cabang",
        422,
        "UNPROCESSABLE",
      )
    }
  } else if (form.status !== "draft") {
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

/**
 * Admin SPM mengirim CR9/A2 kembali ke staff cabang untuk perbaikan data —
 * hanya bisa dilakukan sebelum form pernah diajukan ke manager sama sekali
 * (status masih 'draft'). Berbeda dari revisi dalam approval chain yang
 * dipicu Nautica/SPM-manager/Finance.
 */
export async function requestCabangRevision(
  user: JwtPayload,
  id: string,
  dto: RequestCabangRevisionDto,
) {
  assertSpmOrAdmin(user, "meminta revisi ke staff cabang")

  const form = await repo.findById(id)
  if (!form) throw new AppError("Form A2 tidak ditemukan", 404, "NOT_FOUND")

  if (form.status !== "draft") {
    throw new AppError(
      "Revisi ke cabang hanya bisa diminta sebelum Form A2 pernah diajukan ke manager",
      422,
      "UNPROCESSABLE",
    )
  }

  const updated = await repo.requestPreChainRevision(id, user.id, dto.notes)
  if (!updated) {
    throw new AppError(
      "Gagal mengajukan revisi ke staff cabang",
      500,
      "INTERNAL_SERVER_ERROR",
    )
  }
  return updated
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

  // Diagnosis & rincian biaya sudah wajib diisi staff cabang sejak Form CR9 dibuat
  // (lihat createFormCr9Schema) — di sini cukup pastikan berita acara sudah diupload
  // staff SPM sebelum diteruskan ke approval chain.
  if (!form.news_url) {
    throw new AppError(
      "Berita acara wajib diupload sebelum mengajukan",
      422,
      "UNPROCESSABLE",
    )
  }

  // Pengajuan pertama kali (draft → pending) — selalu mulai dari step Nautica.
  if (form.status === "draft") {
    const updated = await repo.submitToManager(id, user.id)
    if (!updated) {
      throw new AppError(
        "Gagal mengajukan Form A2",
        500,
        "INTERNAL_SERVER_ERROR",
      )
    }
    return updated
  }

  // Resubmit setelah revisi — harus kembali ke step yang sebelumnya minta
  // revisi (bukan selalu Nautica), dan hanya kalau revisinya memang
  // ditujukan ke staff SPM (revisi berita acara).
  const activeRevision = await repo.findActiveRevision(id)
  if (!activeRevision) {
    throw new AppError(
      "Tidak ditemukan data revisi aktif untuk form ini",
      422,
      "UNPROCESSABLE",
    )
  }
  if (activeRevision.target_role !== "staff_spm") {
    throw new AppError(
      "Form ini menunggu revisi data kelengkapan dari staff cabang, belum bisa diajukan oleh SPM",
      422,
      "UNPROCESSABLE",
    )
  }

  const updated = await repo.resolveRevisionAndResubmit(
    id,
    activeRevision.id,
    activeRevision.step,
    user.id,
  )
  if (!updated) {
    throw new AppError("Gagal mengajukan Form A2", 500, "INTERNAL_SERVER_ERROR")
  }
  return updated
}
