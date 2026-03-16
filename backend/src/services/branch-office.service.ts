import * as repo from "@/repositories/branch-office.repository"
import { AppError } from "@/utils/app-error"
import type {
  CreateBranchOfficeDto,
  ListBranchOfficeDto,
  UpdateBranchOfficeDto,
} from "@/validations/branch-office.validation"

export async function listBranchOffices(dto: ListBranchOfficeDto) {
  const limit = dto.limit ?? 15
  const page = dto.page ?? 1
  const offset = (page - 1) * limit

  const { rows, total } = await repo.findAll({
    ...(dto.province && { province: dto.province }),
    ...(dto.city && { city: dto.city }),
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

export async function getBranchOffice(id: string) {
  const office = await repo.findById(id)
  if (!office) throw new AppError("Cabang tidak ditemukan", 404, "NOT_FOUND")
  return office
}

export async function createBranchOffice(dto: CreateBranchOfficeDto) {
  return repo.create({ province: dto.province, city: dto.city })
}

export async function updateBranchOffice(
  id: string,
  dto: UpdateBranchOfficeDto,
) {
  const office = await repo.findById(id)
  if (!office) throw new AppError("Cabang tidak ditemukan", 404, "NOT_FOUND")

  const updated = await repo.update(id, {
    ...(dto.province !== undefined && { province: dto.province }),
    ...(dto.city !== undefined && { city: dto.city }),
  })
  if (!updated)
    throw new AppError("Gagal memperbarui cabang", 500, "INTERNAL_SERVER_ERROR")
  return updated
}

export async function deleteBranchOffice(id: string) {
  const office = await repo.findById(id)
  if (!office) throw new AppError("Cabang tidak ditemukan", 404, "NOT_FOUND")

  const deleted = await repo.remove(id)
  if (!deleted)
    throw new AppError("Gagal menghapus cabang", 500, "INTERNAL_SERVER_ERROR")
}
