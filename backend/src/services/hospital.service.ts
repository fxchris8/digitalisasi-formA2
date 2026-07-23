import * as repo from "@/repositories/hospital.repository"
import { AppError } from "@/utils/app-error"
import type {
  CreateHospitalDto,
  ListHospitalDto,
  UpdateHospitalDto,
} from "@/validations/hospital.validation"

export async function listHospitals(dto: ListHospitalDto) {
  const limit = dto.limit ?? 15
  const page = dto.page ?? 1
  const offset = (page - 1) * limit

  const { rows, total } = await repo.findAll({
    ...(dto.search && { search: dto.search }),
    ...(dto.category && { category: dto.category }),
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

export async function getHospital(id: string) {
  const hospital = await repo.findById(id)
  if (!hospital)
    throw new AppError("Rumah sakit tidak ditemukan", 404, "NOT_FOUND")
  return hospital
}

export async function createHospital(dto: CreateHospitalDto) {
  return repo.create({
    name: dto.name,
    province: dto.province,
    city: dto.city,
    category: dto.category,
    owner_type: dto.owner_type,
  })
}

export async function updateHospital(id: string, dto: UpdateHospitalDto) {
  const hospital = await repo.findById(id)
  if (!hospital)
    throw new AppError("Rumah sakit tidak ditemukan", 404, "NOT_FOUND")

  const updated = await repo.update(id, {
    ...(dto.name !== undefined && { name: dto.name }),
    ...(dto.province !== undefined && { province: dto.province }),
    ...(dto.city !== undefined && { city: dto.city }),
    ...(dto.category !== undefined && { category: dto.category }),
    ...(dto.owner_type !== undefined && { owner_type: dto.owner_type }),
  })
  if (!updated)
    throw new AppError(
      "Gagal memperbarui rumah sakit",
      500,
      "INTERNAL_SERVER_ERROR",
    )
  return updated
}

export async function deleteHospital(id: string) {
  const hospital = await repo.findById(id)
  if (!hospital)
    throw new AppError("Rumah sakit tidak ditemukan", 404, "NOT_FOUND")

  const deleted = await repo.remove(id)
  if (!deleted)
    throw new AppError(
      "Gagal menghapus rumah sakit",
      500,
      "INTERNAL_SERVER_ERROR",
    )
}
