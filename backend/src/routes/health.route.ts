import type { Request, Response } from "express"
import { Router } from "express"
import { sendSuccess } from "@/utils/response"

const router: Router = Router()

const getRoot = (_req: Request, res: Response): void => {
  sendSuccess(res, "Backend is Running", {
    timestamp: new Date().toISOString(),
  })
}

const getHealth = (_req: Request, res: Response): void => {
  sendSuccess(res, "Health Check is OK", {
    timestamp: new Date().toISOString(),
  })
}

router.get("/", getRoot)
router.get("/health", getHealth)

export { router as healthRouter }
