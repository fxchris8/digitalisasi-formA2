import { Router } from "express"
import {
  approveFormA2Handler,
  listApprovalLogsHandler,
  listPendingApprovalHandler,
  rejectFormA2Handler,
  requestRevisionHandler,
  resolveNominalRevisionHandler,
} from "@/handlers/approval.handler"
import { authenticate, authorize } from "@/middlewares/auth"

const router: Router = Router()

router.use(authenticate)

// GET  /api/approval/log      — semua approval log (admin only)
router.get("/log", authorize("admin"), listApprovalLogsHandler)

// GET  /api/approval          — daftar pengajuan menunggu approval user ini
router.get("/", listPendingApprovalHandler)

// POST /api/approval/:id/approve   — setujui
router.post("/:id/approve", approveFormA2Handler)

// POST /api/approval/:id/revision  — minta revisi
router.post("/:id/revision", requestRevisionHandler)

// POST /api/approval/:id/resolve-nominal-revision — manager selesaikan revisi nominal
router.post("/:id/resolve-nominal-revision", resolveNominalRevisionHandler)

// POST /api/approval/:id/reject    — tolak
router.post("/:id/reject", rejectFormA2Handler)

export { router as approvalRouter }
