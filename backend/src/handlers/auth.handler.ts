import type { NextFunction, Request, Response } from "express"
import * as authService from "@/services/auth.service"
import { sendSuccess } from "@/utils/response"
import {
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "@/validations/auth.validation"

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 24 * 60 * 60 * 1000,
}

export async function registerHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const dto = registerSchema.parse(req.body)
    await authService.register(dto)
    sendSuccess(res, "User registered successfully", null, 201)
  } catch (err) {
    next(err)
  }
}

export async function loginHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const dto = loginSchema.parse(req.body)
    const { token, user } = await authService.login(dto)
    res.cookie("access_token", token, COOKIE_OPTIONS)
    sendSuccess(res, "Login successful", user)
  } catch (err) {
    next(err)
  }
}

export async function logoutHandler(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    res.clearCookie("access_token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    })
    sendSuccess(res, "Logged out successfully")
  } catch (err) {
    next(err)
  }
}

export async function resetPasswordHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const dto = resetPasswordSchema.parse(req.body)
    await authService.adminResetPassword(dto)
    sendSuccess(res, "Password reset successfully")
  } catch (err) {
    next(err)
  }
}
