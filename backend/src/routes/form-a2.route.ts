import { Router } from "express"
import {
  getFormA2ByCr9Handler,
  getFormA2Handler,
  listFormA2Handler,
  requestCabangRevisionHandler,
  submitFormA2Handler,
  updateFormA2Handler,
} from "@/handlers/form-a2.handler"
import { authenticate, authorize } from "@/middlewares/auth"

const router: Router = Router()

router.use(authenticate)

// GET  /api/form-a2                        — list
router.get("/", listFormA2Handler)

// GET  /api/form-a2/by-cr9/:cr9Id          — cari A2 by form_cr9_id
router.get("/by-cr9/:cr9Id", getFormA2ByCr9Handler)

// GET  /api/form-a2/:id                    — detail
router.get("/:id", getFormA2Handler)

// PUT  /api/form-a2/:id                    — update news_url / berita acara (staff spm & admin)
router.put("/:id", authorize("admin", "staff"), updateFormA2Handler)

// POST /api/form-a2/:id/submit             — ajukan ke manager Nautica (staff spm & admin)
router.post("/:id/submit", authorize("admin", "staff"), submitFormA2Handler)

// POST /api/form-a2/:id/request-cabang-revision — minta revisi ke staff cabang, sebelum pernah diajukan ke manager (staff spm & admin)
router.post(
  "/:id/request-cabang-revision",
  authorize("admin", "staff"),
  requestCabangRevisionHandler,
)

export { router as formA2Router }
