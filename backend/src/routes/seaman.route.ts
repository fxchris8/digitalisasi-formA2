import { Router } from "express"
import {
  clearSeamenHandler,
  getSeamenStatsHandler,
  listSeamenHandler,
  syncSeamenHandler,
} from "../handlers/seaman.handler"
import { authenticate, authorize } from "../middlewares/auth"

const router = Router()

router.use(authenticate)

// GET  /api/seamen         — list (semua user login)
// GET  /api/seamen/stats   — stats (semua user login)
// POST /api/seamen/sync    — fetch dari API eksternal (admin only)
// DELETE /api/seamen       — hapus semua data (admin only)
router.get("/stats", getSeamenStatsHandler)
router.get("/", listSeamenHandler)
router.post("/sync", authorize("admin"), syncSeamenHandler)
router.delete("/", authorize("admin"), clearSeamenHandler)

export { router as seamanRouter }
