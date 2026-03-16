import type { NextFunction, Request, Response } from "express"
import * as service from "../services/seaman.service"
import { AppError } from "../utils/app-error"
import { sendSuccess } from "../utils/response"
import {
  listSeamenSchema,
  syncSeamenSchema,
} from "../validations/seaman.validation"

export async function syncSeamenHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      next(new AppError("Unauthorized", 401, "UNAUTHORIZED"))
      return
    }
    const dto = syncSeamenSchema.parse(req.body)
    const result = await service.syncSeamen(req.user, dto)
    sendSuccess(
      res,
      `Berhasil sinkronisasi ${result.synced} data seaman`,
      result,
    )
  } catch (err) {
    next(err)
  }
}

export async function listSeamenHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      next(new AppError("Unauthorized", 401, "UNAUTHORIZED"))
      return
    }
    const params = listSeamenSchema.parse(req.query)
    const result = await service.listSeamen(params)
    sendSuccess(res, "Data seaman berhasil dimuat", result)
  } catch (err) {
    next(err)
  }
}

export async function getSeamenStatsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      next(new AppError("Unauthorized", 401, "UNAUTHORIZED"))
      return
    }
    const result = await service.getSeamenStats()
    sendSuccess(res, "Statistik seaman berhasil dimuat", result)
  } catch (err) {
    next(err)
  }
}

export async function clearSeamenHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      next(new AppError("Unauthorized", 401, "UNAUTHORIZED"))
      return
    }
    const result = await service.clearSeamen(req.user)
    sendSuccess(res, `Berhasil menghapus ${result.deleted} data seaman`, result)
  } catch (err) {
    next(err)
  }
}
