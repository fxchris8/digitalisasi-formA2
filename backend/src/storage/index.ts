import type { Readable } from "node:stream"

// ─── Provider Interface ────────────────────────────────────────────────────────

export interface StorageProvider {
  /**
   * Upload a file buffer.
   * @returns Stored path relative to storage root, e.g. "cr9/uuid.pdf"
   */
  upload(buffer: Buffer, folder: string, originalName: string): Promise<string>

  /**
   * Delete a stored file by its relative path.
   */
  delete(storedPath: string): Promise<void>

  /**
   * Open a readable stream for a stored file.
   */
  createReadStream(storedPath: string): Readable

  /**
   * Read a stored file fully into memory (dipakai untuk ekstraksi dokumen).
   */
  readBuffer(storedPath: string): Promise<Buffer>
}

// ─── Factory ──────────────────────────────────────────────────────────────────

let _provider: StorageProvider | null = null

export function getStorageProvider(): StorageProvider {
  if (_provider) return _provider

  const type = process.env.STORAGE_PROVIDER ?? "local"

  if (type === "local") {
    // Lazy-require to avoid loading fs in envs where it's not needed
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { LocalStorageProvider } = require("./local.storage") as {
      LocalStorageProvider: new () => StorageProvider
    }
    _provider = new LocalStorageProvider()
    return _provider
  }

  throw new Error(`Unknown STORAGE_PROVIDER: "${type}". Supported: "local"`)
}
