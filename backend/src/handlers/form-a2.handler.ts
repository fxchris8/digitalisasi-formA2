import type { NextFunction, Request, Response } from "express"
import * as formA2Service from "@/services/form-a2.service"
import { AppError } from "@/utils/app-error"
import { sendSuccess } from "@/utils/response"
import {
  listFormA2Schema,
  requestCabangRevisionSchema,
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

export async function requestCabangRevisionHandler(
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
    const dto = requestCabangRevisionSchema.parse(req.body)
    const result = await formA2Service.requestCabangRevision(req.user, id, dto)
    sendSuccess(res, "Revisi berhasil diajukan ke staff cabang", result)
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
    const stepLabel: Record<string, string> = {
      nautica: "Manager Nautica",
      spm: "Manager SPM",
      finance: "Finance",
    }
    const destination = result.current_step
      ? (stepLabel[result.current_step] ?? result.current_step)
      : "manager"
    sendSuccess(res, `Form A2 berhasil diajukan ke ${destination}`, result)
  } catch (err) {
    next(err)
  }
}
