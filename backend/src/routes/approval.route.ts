import { Router } from "express"
import {
  approveFormA2Handler,
  listPendingApprovalHandler,
  rejectFormA2Handler,
  requestRevisionHandler,
} from "@/handlers/approval.handler"
import { authenticate } from "@/middlewares/auth"

const router: Router = Router()

router.use(authenticate)

// GET  /api/approval          — daftar pengajuan menunggu approval user ini
router.get("/", listPendingApprovalHandler)

// POST /api/approval/:id/approve   — setujui
router.post("/:id/approve", approveFormA2Handler)

// POST /api/approval/:id/revision  — minta revisi
router.post("/:id/revision", requestRevisionHandler)

// POST /api/approval/:id/reject    — tolak
router.post("/:id/reject", rejectFormA2Handler)

export { router as approvalRouter }
