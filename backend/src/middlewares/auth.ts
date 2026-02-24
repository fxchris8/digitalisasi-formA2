import type { NextFunction, Request, Response } from "express"
import { AppError } from "@/utils/app-error"
import { verifyToken } from "@/utils/jwt"

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
	const token = req.cookies?.access_token as string | undefined

	if (!token) {
		next(new AppError("Unauthorized", 401, "UNAUTHORIZED"))
		return
	}

	try {
		const payload = verifyToken(token)
		req.user = payload
		next()
	} catch {
		next(new AppError("Invalid or expired token", 401, "INVALID_TOKEN"))
	}
}

export function authorize(...roles: string[]) {
	return (req: Request, _res: Response, next: NextFunction): void => {
		if (!req.user || !roles.includes(req.user.role)) {
			next(new AppError("Forbidden", 403, "FORBIDDEN"))
			return
		}
		next()
	}
}
