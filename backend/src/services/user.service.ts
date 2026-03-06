import bcrypt from "bcryptjs"
import * as userRepo from "@/repositories/user.repository"
import { AppError } from "@/utils/app-error"
import type {
  ChangePasswordDto,
  CreateUserDto,
  ListUsersQuery,
  UpdateUserDto,
} from "@/validations/user.validation"

export async function listUsers(query: ListUsersQuery) {
  const offset = (query.page - 1) * query.limit
  const { rows, total } = await userRepo.findAll({
    ...(query.search !== undefined && { search: query.search }),
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

export async function getUser(id: string) {
  const user = await userRepo.findById(id)
  if (!user) throw new AppError("User tidak ditemukan", 404, "NOT_FOUND")
  const { password: _pw, ...safe } = user
  return safe
}

export async function createUser(dto: CreateUserDto) {
  const [existingEmail, existingUsername] = await Promise.all([
    userRepo.findByEmail(dto.email),
    userRepo.findByUserName(dto.username),
  ])
  if (existingEmail)
    throw new AppError("Email sudah digunakan", 409, "EMAIL_ALREADY_EXISTS")
  if (existingUsername)
    throw new AppError(
      "Username sudah digunakan",
      409,
      "USERNAME_ALREADY_EXISTS",
    )

  const hashedPassword = await bcrypt.hash(dto.password, 10)
  const user = await userRepo.createByAdmin({ ...dto, hashedPassword })
  if (!user)
    throw new AppError("Gagal membuat user", 500, "INTERNAL_SERVER_ERROR")
  return user
}

export async function updateUser(id: string, dto: UpdateUserDto) {
  if (dto.username) {
    const existing = await userRepo.findByUserName(dto.username)
    if (existing && existing.id !== id)
      throw new AppError(
        "Username sudah digunakan",
        409,
        "USERNAME_ALREADY_EXISTS",
      )
  }
  if (dto.email) {
    const existing = await userRepo.findByEmail(dto.email)
    if (existing && existing.id !== id)
      throw new AppError("Email sudah digunakan", 409, "EMAIL_ALREADY_EXISTS")
  }

  const updated = await userRepo.updateById(id, dto)
  if (!updated) throw new AppError("User tidak ditemukan", 404, "NOT_FOUND")
  return updated
}

export async function deleteUser(currentUserId: string, targetId: string) {
  if (currentUserId === targetId)
    throw new AppError("Tidak bisa menghapus akun sendiri", 400, "BAD_REQUEST")

  const deleted = await userRepo.deleteById(targetId)
  if (!deleted) throw new AppError("User tidak ditemukan", 404, "NOT_FOUND")
}

export async function changePassword(id: string, dto: ChangePasswordDto) {
  const user = await userRepo.findById(id)
  if (!user) throw new AppError("User tidak ditemukan", 404, "NOT_FOUND")

  const hashedPassword = await bcrypt.hash(dto.newPassword, 10)
  await userRepo.updatePassword(id, hashedPassword)
}

export async function listBranchOffices() {
  return userRepo.findDistinctBranchOffices()
}
