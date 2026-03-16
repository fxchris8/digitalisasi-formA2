import { Router } from "express"
import {
  clearSeamenHandler,
  getSeamenStatsHandler,
  listSeamenHandler,
  syncSeamenHandler,
} from "@/handlers/seaman.handler"
import { authenticate, authorize } from "@/middlewares/auth"

const router: Router = Router()

router.use(authenticate)

// GET  /api/seamen         — list (semua user login)
router.get("/", listSeamenHandler)

// GET  /api/seamen/stats   — stats (semua user login)
router.get("/stats", getSeamenStatsHandler)

// POST /api/seamen/sync    — fetch dari API eksternal (admin only)
router.post("/sync", authorize("admin"), syncSeamenHandler)

// DELETE /api/seamen       — hapus semua data (admin only)
router.delete("/", authorize("admin"), clearSeamenHandler)

export { router as seamanRouter }
