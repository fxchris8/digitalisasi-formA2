import type { Response } from "express"

export function sendSuccess<T>(
  res: Response,
  message: string,
  data?: T,
  statusCode = 200,
): void {
  res
    .status(statusCode)
    .json(
      data !== undefined
        ? { success: true, message, data }
        : { success: true, message },
    )
}

export function sendError(
  res: Response,
  message: string,
  error = "INTERNAL_SERVER_ERROR",
  statusCode = 500,
): void {
  res.status(statusCode).json({ success: false, message, error })
}
