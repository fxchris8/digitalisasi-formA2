import { Router } from "express"
import { getAdminStatsHandler } from "@/handlers/dashboard.handler"
import { authenticate, authorize } from "@/middlewares/auth"

const router: Router = Router()

// GET /api/dashboard/stats — statistik global (admin only)
router.get("/stats", authenticate, authorize("admin"), getAdminStatsHandler)

export { router as dashboardRouter }
