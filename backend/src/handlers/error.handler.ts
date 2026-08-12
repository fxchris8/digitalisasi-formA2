import type { NextFunction, Request, Response } from "express"
import { AppError } from "@/utils/app-error"
import { sendError } from "@/utils/response"

/**
 * Global error-handling middleware.
 * Register this LAST in app.ts after all routes.
 *
 * Handles:
 *  - AppError  → uses its statusCode and errorCode
 *  - Error     → generic 500
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    sendError(res, err.message, err.errorCode, err.statusCode)
    return
  }

  if (err instanceof Error) {
    console.error("[SERVER_ERROR]", err)
    sendError(res, err.message, "INTERNAL_SERVER_ERROR", 500)
    return
  }

  console.error("[SERVER_ERROR]", err)
  sendError(res, "An unexpected error occurred", "INTERNAL_SERVER_ERROR", 500)
}
