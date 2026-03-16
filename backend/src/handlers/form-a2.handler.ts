import type { NextFunction, Request, Response } from "express"
import * as formA2Service from "@/services/form-a2.service"
import { AppError } from "@/utils/app-error"
import { sendSuccess } from "@/utils/response"
import {
  addDetailSchema,
  listFormA2Schema,
  updateFormA2Schema,
} from "@/validations/form-a2.validation"

export async function listFormA2Handler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      next(new AppError("Unauthorized", 401, "UNAUTHORIZED"))
      return
    }
    const query = listFormA2Schema.parse(req.query)
    const result = await formA2Service.listFormA2(req.user, query)
    sendSuccess(res, "Form A2 berhasil diambil", result)
  } catch (err) {
    next(err)
  }
}

export async function getFormA2Handler(
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
    const form = await formA2Service.getFormA2(req.user, id)
    sendSuccess(res, "Form A2 berhasil diambil", form)
  } catch (err) {
    next(err)
  }
}

/** GET /api/form-a2/by-cr9/:cr9Id — ambil A2 berdasarkan form_cr9_id */
export async function getFormA2ByCr9Handler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      next(new AppError("Unauthorized", 401, "UNAUTHORIZED"))
      return
    }
    const cr9Id = req.params.cr9Id as string
    const form = await formA2Service.getFormA2ByCr9Id(req.user, cr9Id)
    sendSuccess(res, "Form A2 berhasil diambil", form)
  } catch (err) {
    next(err)
  }
}

export async function updateFormA2Handler(
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
    const dto = updateFormA2Schema.parse(req.body)
    const form = await formA2Service.updateFormA2(req.user, id, dto)
    sendSuccess(res, "Form A2 berhasil diupdate", form)
  } catch (err) {
    next(err)
  }
}

export async function addDetailHandler(
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
    const dto = addDetailSchema.parse(req.body)
    const detail = await formA2Service.addFormA2Detail(req.user, id, dto)
    sendSuccess(res, "Detail biaya berhasil ditambahkan", detail, 201)
  } catch (err) {
    next(err)
  }
}

export async function removeDetailHandler(
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
    const detailId = req.params.detailId as string
    await formA2Service.removeFormA2Detail(req.user, id, detailId)
    sendSuccess(res, "Detail biaya berhasil dihapus")
  } catch (err) {
    next(err)
  }
}

export async function submitFormA2Handler(
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
    const result = await formA2Service.submitFormA2ToManager(req.user, id)
    sendSuccess(res, "Form A2 berhasil diajukan ke manager Nautica", result)
  } catch (err) {
    next(err)
  }
}
