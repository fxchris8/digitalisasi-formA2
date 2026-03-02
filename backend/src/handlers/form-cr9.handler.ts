import type { NextFunction, Request, Response } from "express"
import * as formCr9Service from "@/services/form-cr9.service"
import { AppError } from "@/utils/app-error"
import { sendSuccess } from "@/utils/response"
import {
  createFormCr9Schema,
  listFormCr9Schema,
  updateFormCr9Schema,
} from "@/validations/form-cr9.validation"

export async function listFormCr9Handler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      next(new AppError("Unauthorized", 401, "UNAUTHORIZED"))
      return
    }
    const query = listFormCr9Schema.parse(req.query)
    const result = await formCr9Service.listFormCr9(req.user, query)
    sendSuccess(res, "Form CR9 berhasil diambil", result)
  } catch (err) {
    next(err)
  }
}

export async function getFormCr9Handler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      next(new AppError("Unauthorized", 401, "UNAUTHORIZED"))
      return
    }
    const id = req.params.id as string
    const form = await formCr9Service.getFormCr9(req.user, id)
    sendSuccess(res, "Form CR9 berhasil diambil", form)
  } catch (err) {
    next(err)
  }
}

export async function createFormCr9Handler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      next(new AppError("Unauthorized", 401, "UNAUTHORIZED"))
      return
    }
    const dto = createFormCr9Schema.parse(req.body)
    const form = await formCr9Service.createFormCr9(req.user, dto)
    sendSuccess(res, "Form CR9 berhasil dibuat", form, 201)
  } catch (err) {
    next(err)
  }
}

export async function updateFormCr9Handler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      next(new AppError("Unauthorized", 401, "UNAUTHORIZED"))
      return
    }
    const id = req.params.id as string
    const dto = updateFormCr9Schema.parse(req.body)
    const form = await formCr9Service.updateFormCr9(req.user, id, dto)
    sendSuccess(res, "Form CR9 berhasil diupdate", form)
  } catch (err) {
    next(err)
  }
}

export async function deleteFormCr9Handler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      next(new AppError("Unauthorized", 401, "UNAUTHORIZED"))
      return
    }
    const id = req.params.id as string
    await formCr9Service.deleteFormCr9(req.user, id)
    sendSuccess(res, "Form CR9 berhasil dihapus")
  } catch (err) {
    next(err)
  }
}
