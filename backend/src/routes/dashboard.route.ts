import { Router } from "express"
import {
  getAdminStatsHandler,
  getBranchStatsHandler,
  getManagerStatsHandler,
} from "@/handlers/dashboard.handler"
import { authenticate, authorize } from "@/middlewares/auth"

const router: Router = Router()

// GET /api/dashboard/stats        — statistik global (admin only)
router.get("/stats", authenticate, authorize("admin"), getAdminStatsHandler)

// GET /api/dashboard/branch-stats   — statistik per cabang (staff)
router.get("/branch-stats", authenticate, getBranchStatsHandler)

// GET /api/dashboard/manager-stats  — statistik approval manager/finance
router.get("/manager-stats", authenticate, getManagerStatsHandler)

export { router as dashboardRouter }
