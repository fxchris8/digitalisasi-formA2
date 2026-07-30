import type { NextFunction, Request, Response } from "express"
import * as extractionService from "@/services/extraction.service"
import { AppError } from "@/utils/app-error"
import { sendSuccess } from "@/utils/response"
import { extractReceiptSchema } from "@/validations/extraction.validation"

export async function extractReceiptHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      next(new AppError("Unauthorized", 401, "UNAUTHORIZED"))
      return
    }
    const dto = extractReceiptSchema.parse(req.body)
    const result = await extractionService.extractReceiptData(dto.receipt_urls)
    sendSuccess(res, "Data berhasil diekstrak dari kwitansi", result)
  } catch (err) {
    next(err)
  }
}
