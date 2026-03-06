import type { NextFunction, Request, Response } from "express"
import * as dashboardService from "@/services/dashboard.service"
import { AppError } from "@/utils/app-error"
import { sendSuccess } from "@/utils/response"

export async function getAdminStatsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      next(new AppError("Unauthorized", 401, "UNAUTHORIZED"))
      return
    }
    const stats = await dashboardService.getAdminStats()
    sendSuccess(res, "Dashboard stats fetched", stats)
  } catch (err) {
    next(err)
  }
}
