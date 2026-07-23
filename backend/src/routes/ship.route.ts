import { Router } from "express"
import {
  createShipHandler,
  deleteShipHandler,
  getShipHandler,
  listShipsHandler,
  updateShipHandler,
} from "@/handlers/ship.handler"
import { authenticate, authorize } from "@/middlewares/auth"

const router: Router = Router()

router.use(authenticate)

// GET  /api/ships      — semua user bisa lihat (untuk dropdown-search & admin list)
router.get("/", listShipsHandler)
router.get("/:id", getShipHandler)

// Hanya admin yang bisa CRUD
router.post("/", authorize("admin"), createShipHandler)
router.put("/:id", authorize("admin"), updateShipHandler)
router.delete("/:id", authorize("admin"), deleteShipHandler)

export { router as shipRouter }
