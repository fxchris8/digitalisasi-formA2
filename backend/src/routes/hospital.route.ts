import { Router } from "express"
import {
  createHospitalHandler,
  deleteHospitalHandler,
  getHospitalHandler,
  listHospitalsHandler,
  updateHospitalHandler,
} from "@/handlers/hospital.handler"
import { authenticate, authorize } from "@/middlewares/auth"

const router: Router = Router()

router.use(authenticate)

// GET  /api/hospitals      — semua user bisa lihat (untuk dropdown-search)
router.get("/", listHospitalsHandler)
router.get("/:id", getHospitalHandler)

// Hanya admin yang bisa CRUD
router.post("/", authorize("admin"), createHospitalHandler)
router.put("/:id", authorize("admin"), updateHospitalHandler)
router.delete("/:id", authorize("admin"), deleteHospitalHandler)

export { router as hospitalRouter }
