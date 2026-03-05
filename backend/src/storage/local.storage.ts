import { randomUUID } from "node:crypto"
import { createReadStream as fsCreateReadStream } from "node:fs"
import { mkdir, unlink, writeFile } from "node:fs/promises"
import path from "node:path"
import type { Readable } from "node:stream"
import type { StorageProvider } from "."

const BASE_PATH = (): string =>
  process.env.STORAGE_PATH ?? path.join(process.cwd(), "storage")

export class LocalStorageProvider implements StorageProvider {
  async upload(
    buffer: Buffer,
    folder: string,
    originalName: string,
  ): Promise<string> {
    const ext = path.extname(originalName) || ".pdf"
    const filename = `${randomUUID()}${ext}`
    const dirPath = path.join(BASE_PATH(), folder)

    await mkdir(dirPath, { recursive: true })

    const filePath = path.join(dirPath, filename)
    await writeFile(filePath, buffer)

    return `${folder}/${filename}`
  }

  async delete(storedPath: string): Promise<void> {
    const filePath = path.join(BASE_PATH(), storedPath)
    try {
      await unlink(filePath)
    } catch {
      // Ignore if file doesn't exist
    }
  }

  createReadStream(storedPath: string): Readable {
    const filePath = path.join(BASE_PATH(), storedPath)
    return fsCreateReadStream(filePath)
  }
}
