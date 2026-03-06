import type { NextFunction, Request, Response } from "express"
import * as approvalService from "@/services/approval.service"
import { AppError } from "@/utils/app-error"
import { sendSuccess } from "@/utils/response"
import {
  approvalLogQuerySchema,
  approveSchema,
  rejectSchema,
  revisionSchema,
} from "@/validations/approval.validation"

export async function listApprovalLogsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      next(new AppError("Unauthorized", 401, "UNAUTHORIZED"))
      return
    }
    const query = approvalLogQuerySchema.parse(req.query)
    const result = await approvalService.listApprovalLogs(query)
    sendSuccess(res, "Approval logs fetched", result)
  } catch (err) {
    next(err)
  }
}

export async function listPendingApprovalHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      next(new AppError("Unauthorized", 401, "UNAUTHORIZED"))
      return
    }
    const rows = await approvalService.listPendingApproval(req.user)
    sendSuccess(res, "Daftar pengajuan berhasil diambil", rows)
  } catch (err) {
    next(err)
  }
}

export async function approveFormA2Handler(
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
    const dto = approveSchema.parse(req.body)
    const result = await approvalService.approveFormA2(req.user, id, dto)
    sendSuccess(res, "Form A2 berhasil disetujui", result)
  } catch (err) {
    next(err)
  }
}

export async function requestRevisionHandler(
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
    const dto = revisionSchema.parse(req.body)
    const result = await approvalService.requestRevisionFormA2(
      req.user,
      id,
      dto,
    )
    sendSuccess(res, "Revisi berhasil diajukan", result)
  } catch (err) {
    next(err)
  }
}

export async function rejectFormA2Handler(
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
    const dto = rejectSchema.parse(req.body)
    const result = await approvalService.rejectFormA2(req.user, id, dto)
    sendSuccess(res, "Form A2 berhasil ditolak", result)
  } catch (err) {
    next(err)
  }
}
