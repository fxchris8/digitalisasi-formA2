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

// POST /api/form-cr9          — create (staff & admin saja)
router.post("/", authorize("admin", "staff"), createFormCr9Handler)

// POST /api/form-cr9/:id/submit — ajukan CR9, auto-create A2 (staff & admin)
router.post("/:id/submit", authorize("admin", "staff"), submitFormCr9Handler)

// PUT  /api/form-cr9/:id      — update / revisi (staff & admin saja)
router.put("/:id", authorize("admin", "staff"), updateFormCr9Handler)

// DELETE /api/form-cr9/:id    — hapus (admin saja)
router.delete("/:id", authorize("admin"), deleteFormCr9Handler)

export { router as formCr9Router }
