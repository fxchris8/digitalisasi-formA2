import { Router } from "express"
import { extractReceiptHandler } from "@/handlers/extraction.handler"
import { authenticate, authorize } from "@/middlewares/auth"

const router: Router = Router()

router.use(authenticate)

// POST /api/extraction/receipt — ekstrak data dari kwitansi yang sudah diupload
router.post(
  "/receipt",
  authorize("admin", "staff", "admin_spm"),
  extractReceiptHandler,
)

export { router as extractionRouter }
