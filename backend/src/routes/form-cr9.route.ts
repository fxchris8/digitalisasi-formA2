import { Router } from "express"
import {
  createFormCr9Handler,
  deleteFormCr9Handler,
  getFormCr9Handler,
  listFormCr9Handler,
  submitFormCr9Handler,
  updateFormCr9Handler,
} from "@/handlers/form-cr9.handler"
import { authenticate, authorize } from "@/middlewares/auth"

const router: Router = Router()

// Semua route butuh login
router.use(authenticate)

// GET  /api/form-cr9          — list (admin, staff, manager berdasarkan dept/cabang)
router.get("/", listFormCr9Handler)

// GET  /api/form-cr9/:id      — detail
router.get("/:id", getFormCr9Handler)

// POST /api/form-cr9          — create (staff cabang, Admin SPM, & admin — lihat assertCanManageCr9)
router.post("/", authorize("admin", "staff", "admin_spm"), createFormCr9Handler)

// POST /api/form-cr9/:id/submit — ajukan CR9, auto-create A2
router.post(
  "/:id/submit",
  authorize("admin", "staff", "admin_spm"),
  submitFormCr9Handler,
)

// PUT  /api/form-cr9/:id      — update / revisi
router.put(
  "/:id",
  authorize("admin", "staff", "admin_spm"),
  updateFormCr9Handler,
)

// DELETE /api/form-cr9/:id    — hapus (admin saja)
router.delete("/:id", authorize("admin"), deleteFormCr9Handler)

export { router as formCr9Router }
