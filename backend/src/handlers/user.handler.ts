import type { NextFunction, Request, Response } from "express"
import * as userService from "@/services/user.service"
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
    const result = await userService.listUsers(query)
    sendSuccess(res, "Users fetched", result)
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
    const user = await userService.getUser(id)
    sendSuccess(res, "User fetched", user)
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
    const user = await userService.createUser(dto)
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
    const updated = await userService.updateUser(id, dto)
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
    await userService.deleteUser(req.user?.id as string, id)
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
    await userService.changePassword(id, dto)
    sendSuccess(res, "Password berhasil diubah", null)
  } catch (err) {
    next(err)
  }
}
