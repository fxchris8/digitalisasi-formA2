import { Router } from "express"
import { extractReceiptHandler } from "@/handlers/extraction.handler"
import { authenticate, authorize } from "@/middlewares/auth"

const router: Router = Router()

router.use(authenticate)

// POST /api/extraction/receipt — ekstrak data dari kwitansi yang sudah diupload (staff & admin)
router.post("/receipt", authorize("admin", "staff"), extractReceiptHandler)

export { router as extractionRouter }
