import { Router } from "express"
import {
  createBranchOfficeHandler,
  deleteBranchOfficeHandler,
  getBranchOfficeHandler,
  listBranchOfficesHandler,
  updateBranchOfficeHandler,
} from "@/handlers/branch-office.handler"
import { authenticate, authorize } from "@/middlewares/auth"

const router: Router = Router()

router.use(authenticate)

// GET  /api/branch-offices      — semua user bisa lihat (untuk dropdown)
router.get("/", listBranchOfficesHandler)
router.get("/:id", getBranchOfficeHandler)

// Hanya admin yang bisa CRUD
router.post("/", authorize("admin"), createBranchOfficeHandler)
router.put("/:id", authorize("admin"), updateBranchOfficeHandler)
router.delete("/:id", authorize("admin"), deleteBranchOfficeHandler)

export { router as branchOfficeRouter }
