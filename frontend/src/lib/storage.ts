import type { ApiResponse } from "@/types/api"
import apiClient from "./api-client"

/**
 * Upload a PDF file to the backend storage.
 *
 * @param file   The File object selected by the user.
 * @param folder Storage sub-folder, e.g. "cr9" or "receipt".
 * @returns      The stored path relative to the storage root, e.g. "cr9/uuid.pdf".
 *               Pass this value directly to API payloads.
 */
const MAX_FILE_SIZE = 3 * 1024 * 1024 // 3 MB

export async function uploadFile(file: File, folder: string): Promise<string> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `Ukuran file maksimal 3 MB (file ini ${(file.size / 1024 / 1024).toFixed(1)} MB)`,
    )
  }

  const formData = new FormData()
  formData.append("file", file)

  const res = await apiClient.post<ApiResponse<{ path: string }>>(
    `/api/storage/upload?folder=${encodeURIComponent(folder)}`,
    formData,
    // Let the browser set multipart/form-data with the correct boundary
    { headers: { "Content-Type": undefined } },
  )

  const path = res.data.data?.path
  if (!path) throw new Error("Upload gagal: respons tidak valid")
  return path
}

/**
 * Build the full URL to stream/view a stored file.
 *
 * @param storedPath  Relative path returned by uploadFile, e.g. "cr9/uuid.pdf".
 * @returns           Full URL proxied through the backend, e.g.
 *                    "http://localhost:3000/api/storage/cr9/uuid.pdf"
 */
export function getStorageUrl(storedPath: string): string {
  const baseURL = (import.meta.env.VITE_API_URL as string | undefined) ?? ""
  return `${baseURL}/api/storage/${storedPath}`
}
