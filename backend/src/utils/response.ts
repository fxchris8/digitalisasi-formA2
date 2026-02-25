import type { Response } from "express"
import type { ApiResponse } from "@/types/api"

/**
 * Send a successful response.
 *
 * @example
 * sendSuccess(res, "User fetched", user, 200);
 */
export function sendSuccess<T>(
  res: Response,
  message: string,
  data?: T,
  statusCode: number = 200,
): void {
  const body: ApiResponse<T> = {
    success: true,
    message,
    ...(data !== undefined && { data }),
  }
  res.status(statusCode).json(body)
}

/**
 * Send an error response.
 *
 * @example
 * sendError(res, "User not found", "NOT_FOUND", 404);
 */
export function sendError(
  res: Response,
  message: string,
  error: string = "INTERNAL_SERVER_ERROR",
  statusCode: number = 500,
): void {
  const body: ApiResponse = { success: false, message, error }
  res.status(statusCode).json(body)
}
