import { Router } from "express"
import { authRouter } from "./auth.route"
import { healthRouter } from "./health.route"

const router: Router = Router()

// ── Public routes ─────────────────────────────────────────────────────────────
router.use("/", healthRouter)
router.use("/api/auth", authRouter)

// ── Authenticated routes ──────────────────────────────────────────────────────
// router.use("/crews", authenticate, crewRouter);

// ── Admin-only routes ─────────────────────────────────────────────────────────
// router.use("/admin", authenticate, authorize("admin"), adminRouter);

export { router as apiRouter }
