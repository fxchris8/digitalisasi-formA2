import bcrypt from "bcryptjs"
import type { NextFunction, Request, Response } from "express"
import * as userRepo from "@/repositories/user.repository"
import { AppError } from "@/utils/app-error"
import { sendSuccess } from "@/utils/response"
import {
  changePasswordSchema,
  createUserSchema,
  listUsersSchema,
  updateUserSchema,
} from "@/validations/user.validation"

export async function listUsersHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = listUsersSchema.parse(req.query)
    const offset = (query.page - 1) * query.limit
    const { rows, total } = await userRepo.findAll({
      ...(query.search !== undefined && { search: query.search }),
      limit: query.limit,
      offset,
    })
    sendSuccess(res, "Users fetched", {
      data: rows,
      total,
      page: query.page,
      limit: query.limit,
      total_pages: Math.ceil(total / query.limit),
    })
  } catch (err) {
    next(err)
  }
}

export async function getUserHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params.id as string
    const user = await userRepo.findById(id)
    if (!user) throw new AppError("User tidak ditemukan", 404, "NOT_FOUND")
    const { password: _pw, ...safe } = user
    sendSuccess(res, "User fetched", safe)
  } catch (err) {
    next(err)
  }
}

export async function createUserHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const dto = createUserSchema.parse(req.body)

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
    sendSuccess(res, "User berhasil dibuat", user, 201)
  } catch (err) {
    next(err)
  }
}

export async function updateUserHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params.id as string
    const dto = updateUserSchema.parse(req.body)

    // Cek duplikat username/email jika diubah
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
    sendSuccess(res, "User berhasil diubah", updated)
  } catch (err) {
    next(err)
  }
}

export async function deleteUserHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params.id as string
    if (req.user?.id === id)
      throw new AppError(
        "Tidak bisa menghapus akun sendiri",
        400,
        "BAD_REQUEST",
      )

    const deleted = await userRepo.deleteById(id)
    if (!deleted) throw new AppError("User tidak ditemukan", 404, "NOT_FOUND")
    sendSuccess(res, "User berhasil dihapus", null)
  } catch (err) {
    next(err)
  }
}

export async function changePasswordHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = req.params.id as string
    const dto = changePasswordSchema.parse(req.body)

    const user = await userRepo.findById(id)
    if (!user) throw new AppError("User tidak ditemukan", 404, "NOT_FOUND")

    const hashedPassword = await bcrypt.hash(dto.newPassword, 10)
    await userRepo.updatePassword(id, hashedPassword)
    sendSuccess(res, "Password berhasil diubah", null)
  } catch (err) {
    next(err)
  }
}
