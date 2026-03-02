import { Router } from "express"
import { authRouter } from "./auth.route"
import { formCr9Router } from "./form-cr9.route"
import { healthRouter } from "./health.route"
import { storageRouter } from "./storage.route"

const router: Router = Router()

// ── Public routes ─────────────────────────────────────────────────────────────
router.use("/", healthRouter)
router.use("/api/auth", authRouter)

// ── Authenticated routes ──────────────────────────────────────────────────────
router.use("/api/storage", storageRouter)
router.use("/api/form-cr9", formCr9Router)

export { router as apiRouter }
