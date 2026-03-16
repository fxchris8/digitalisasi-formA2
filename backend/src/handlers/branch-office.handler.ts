import type { NextFunction, Request, Response } from "express"
import * as branchOfficeService from "@/services/branch-office.service"
import { AppError } from "@/utils/app-error"
import { sendSuccess } from "@/utils/response"
import {
  createBranchOfficeSchema,
  listBranchOfficeSchema,
  updateBranchOfficeSchema,
} from "@/validations/branch-office.validation"

export async function listBranchOfficesHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = listBranchOfficeSchema.parse(req.query)
    const result = await branchOfficeService.listBranchOffices(query)
    sendSuccess(res, "Daftar cabang berhasil diambil", result)
  } catch (err) {
    next(err)
  }
}

export async function getBranchOfficeHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const office = await branchOfficeService.getBranchOffice(
      req.params.id as string,
    )
    sendSuccess(res, "Cabang berhasil diambil", office)
  } catch (err) {
    next(err)
  }
}

export async function createBranchOfficeHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      next(new AppError("Unauthorized", 401, "UNAUTHORIZED"))
      return
    }
    const dto = createBranchOfficeSchema.parse(req.body)
    const office = await branchOfficeService.createBranchOffice(dto)
    sendSuccess(res, "Cabang berhasil ditambahkan", office, 201)
  } catch (err) {
    next(err)
  }
}

export async function updateBranchOfficeHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      next(new AppError("Unauthorized", 401, "UNAUTHORIZED"))
      return
    }
    const dto = updateBranchOfficeSchema.parse(req.body)
    const office = await branchOfficeService.updateBranchOffice(
      req.params.id as string,
      dto,
    )
    sendSuccess(res, "Cabang berhasil diperbarui", office)
  } catch (err) {
    next(err)
  }
}

export async function deleteBranchOfficeHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      next(new AppError("Unauthorized", 401, "UNAUTHORIZED"))
      return
    }
    await branchOfficeService.deleteBranchOffice(req.params.id as string)
    sendSuccess(res, "Cabang berhasil dihapus")
  } catch (err) {
    next(err)
  }
}
