import type { NextFunction, Request, Response } from "express"
import { getStorageProvider } from "@/storage"
import { AppError } from "@/utils/app-error"
import { sendSuccess } from "@/utils/response"

// POST /api/storage/upload?folder=cr9
export async function uploadFileHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      next(new AppError("Unauthorized", 401, "UNAUTHORIZED"))
      return
    }
    if (!req.file) {
      next(
        new AppError("File tidak ditemukan dalam request", 400, "BAD_REQUEST"),
      )
      return
    }

    const folder =
      (typeof req.query.folder === "string" ? req.query.folder : null) ??
      "uploads"
    const storage = getStorageProvider()
    const storedPath = await storage.upload(
      req.file.buffer,
      folder,
      req.file.originalname,
    )

    sendSuccess(res, "File berhasil diupload", { path: storedPath }, 201)
  } catch (err) {
    next(err)
  }
}

// GET /api/storage/:folder/:filename
export function serveFileHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  try {
    if (!req.user) {
      next(new AppError("Unauthorized", 401, "UNAUTHORIZED"))
      return
    }

    const folder = req.params.folder as string
    const filename = req.params.filename as string
    const storedPath = `${folder}/${filename}`

    const storage = getStorageProvider()
    const stream = storage.createReadStream(storedPath)

    const ext = filename.split(".").pop()?.toLowerCase()
    const contentType =
      ext === "pdf" ? "application/pdf" : "application/octet-stream"

    res.setHeader("Content-Type", contentType)
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`)

    stream.on("error", () => {
      next(new AppError("File tidak ditemukan", 404, "NOT_FOUND"))
    })

    stream.pipe(res)
  } catch (err) {
    next(err)
  }
}
