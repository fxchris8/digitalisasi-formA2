import * as repo from "@/repositories/ship.repository"
import { AppError } from "@/utils/app-error"
import type {
  CreateShipDto,
  ListShipQuery,
  UpdateShipDto,
} from "@/validations/ship.validation"

export async function listShips(query: ListShipQuery) {
  const limit = query.limit ?? 15
  const page = query.page ?? 1
  const offset = (page - 1) * limit

  const { rows, total } = await repo.findAll({
    ...(query.search && { search: query.search }),
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

export async function getShip(id: string) {
  const ship = await repo.findById(id)
  if (!ship) throw new AppError("Kapal tidak ditemukan", 404, "NOT_FOUND")
  return ship
}

export async function createShip(dto: CreateShipDto) {
  return repo.create(dto.name)
}

export async function updateShip(id: string, dto: UpdateShipDto) {
  const ship = await repo.findById(id)
  if (!ship) throw new AppError("Kapal tidak ditemukan", 404, "NOT_FOUND")

  if (dto.name === undefined) return ship

  const updated = await repo.update(id, dto.name)
  if (!updated)
    throw new AppError("Gagal memperbarui kapal", 500, "INTERNAL_SERVER_ERROR")
  return updated
}

export async function deleteShip(id: string) {
  const ship = await repo.findById(id)
  if (!ship) throw new AppError("Kapal tidak ditemukan", 404, "NOT_FOUND")

  const deleted = await repo.remove(id)
  if (!deleted)
    throw new AppError("Gagal menghapus kapal", 500, "INTERNAL_SERVER_ERROR")
}
