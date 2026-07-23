import { Router } from "express"
import multer from "multer"
import { serveFileHandler, uploadFileHandler } from "@/handlers/storage.handler"
import { authenticate } from "@/middlewares/auth"

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB — nota/kwitansi hasil foto/scan sering lebih besar dari 3MB
  fileFilter(_req, file, cb) {
    if (file.mimetype === "application/pdf") {
      cb(null, true)
    } else {
      cb(new Error("Hanya file PDF yang diizinkan"))
    }
  },
})

const router: Router = Router()

router.use(authenticate)

// POST /api/storage/upload?folder=cr9
router.post("/upload", upload.single("file"), uploadFileHandler)

// GET /api/storage/:folder/:filename  — proxy authenticated file serving
router.get("/:folder/:filename", serveFileHandler)

export { router as storageRouter }
