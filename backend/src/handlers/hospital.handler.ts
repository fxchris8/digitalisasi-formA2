import type { NextFunction, Request, Response } from "express"
import * as hospitalService from "@/services/hospital.service"
import { AppError } from "@/utils/app-error"
import { sendSuccess } from "@/utils/response"
import {
  createHospitalSchema,
  listHospitalSchema,
  updateHospitalSchema,
} from "@/validations/hospital.validation"

export async function listHospitalsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = listHospitalSchema.parse(req.query)
    const result = await hospitalService.listHospitals(query)
    sendSuccess(res, "Daftar rumah sakit berhasil diambil", result)
  } catch (err) {
    next(err)
  }
}

export async function getHospitalHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const hospital = await hospitalService.getHospital(req.params.id as string)
    sendSuccess(res, "Rumah sakit berhasil diambil", hospital)
  } catch (err) {
    next(err)
  }
}

export async function createHospitalHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      next(new AppError("Unauthorized", 401, "UNAUTHORIZED"))
      return
    }
    const dto = createHospitalSchema.parse(req.body)
    const hospital = await hospitalService.createHospital(dto)
    sendSuccess(res, "Rumah sakit berhasil ditambahkan", hospital, 201)
  } catch (err) {
    next(err)
  }
}

export async function updateHospitalHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      next(new AppError("Unauthorized", 401, "UNAUTHORIZED"))
      return
    }
    const dto = updateHospitalSchema.parse(req.body)
    const hospital = await hospitalService.updateHospital(
      req.params.id as string,
      dto,
    )
    sendSuccess(res, "Rumah sakit berhasil diperbarui", hospital)
  } catch (err) {
    next(err)
  }
}

export async function deleteHospitalHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      next(new AppError("Unauthorized", 401, "UNAUTHORIZED"))
      return
    }
    await hospitalService.deleteHospital(req.params.id as string)
    sendSuccess(res, "Rumah sakit berhasil dihapus")
  } catch (err) {
    next(err)
  }
}
