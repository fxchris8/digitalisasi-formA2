import { Router } from "express"
import { approvalRouter } from "./approval.route"
import { authRouter } from "./auth.route"
import { branchOfficeRouter } from "./branch-office.route"
import { dashboardRouter } from "./dashboard.route"
import { formA2Router } from "./form-a2.route"
import { formCr9Router } from "./form-cr9.route"
import { healthRouter } from "./health.route"
import { seamanRouter } from "./seaman.route"
import { storageRouter } from "./storage.route"
import { userRouter } from "./user.route"

const router: Router = Router()

// ── Public routes ─────────────────────────────────────────────────────────────
router.use("/", healthRouter)
router.use("/api/auth", authRouter)

// ── Authenticated routes ──────────────────────────────────────────────────────
router.use("/api/storage", storageRouter)
router.use("/api/users", userRouter)
router.use("/api/form-cr9", formCr9Router)
router.use("/api/form-a2", formA2Router)
router.use("/api/approval", approvalRouter)
router.use("/api/dashboard", dashboardRouter)
router.use("/api/seamen", seamanRouter)
router.use("/api/branch-offices", branchOfficeRouter)

export { router as apiRouter }
