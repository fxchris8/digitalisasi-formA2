import { Router } from "express"
import { approvalRouter } from "./approval.route"
import { authRouter } from "./auth.route"
import { formA2Router } from "./form-a2.route"
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
router.use("/api/form-a2", formA2Router)
router.use("/api/approval", approvalRouter)

export { router as apiRouter }
