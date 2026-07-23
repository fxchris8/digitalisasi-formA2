import type { NextFunction, Request, Response } from "express"
import * as shipService from "@/services/ship.service"
import { AppError } from "@/utils/app-error"
import { sendSuccess } from "@/utils/response"
import {
  createShipSchema,
  listShipSchema,
  updateShipSchema,
} from "@/validations/ship.validation"

export async function listShipsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = listShipSchema.parse(req.query)
    const result = await shipService.listShips(query)
    sendSuccess(res, "Daftar kapal berhasil diambil", result)
  } catch (err) {
    next(err)
  }
}

export async function getShipHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const ship = await shipService.getShip(req.params.id as string)
    sendSuccess(res, "Kapal berhasil diambil", ship)
  } catch (err) {
    next(err)
  }
}

export async function createShipHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      next(new AppError("Unauthorized", 401, "UNAUTHORIZED"))
      return
    }
    const dto = createShipSchema.parse(req.body)
    const ship = await shipService.createShip(dto)
    sendSuccess(res, "Kapal berhasil ditambahkan", ship, 201)
  } catch (err) {
    next(err)
  }
}

export async function updateShipHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      next(new AppError("Unauthorized", 401, "UNAUTHORIZED"))
      return
    }
    const dto = updateShipSchema.parse(req.body)
    const ship = await shipService.updateShip(req.params.id as string, dto)
    sendSuccess(res, "Kapal berhasil diperbarui", ship)
  } catch (err) {
    next(err)
  }
}

export async function deleteShipHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      next(new AppError("Unauthorized", 401, "UNAUTHORIZED"))
      return
    }
    await shipService.deleteShip(req.params.id as string)
    sendSuccess(res, "Kapal berhasil dihapus")
  } catch (err) {
    next(err)
  }
}
