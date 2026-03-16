import apiClient from "@/lib/api-client"
import { unwrap } from "@/lib/api-utils"
import type { ApiResponse, PaginatedResponse } from "@/types/api"
import type { Seaman, SeamanStats, SyncSeamenPayload } from "@/types/seaman"

export interface SeamenListParams {
  page?: number
  limit?: number
  search?: string
  status?: string
  fleet?: string
}

export async function listSeamen(
  params?: SeamenListParams,
): Promise<PaginatedResponse<Seaman>> {
  const res = await apiClient.get<ApiResponse<PaginatedResponse<Seaman>>>(
    "/api/seamen",
    { params },
  )
  return unwrap(res.data)
}

export async function getSeamenStats(): Promise<SeamanStats> {
  const res = await apiClient.get<ApiResponse<SeamanStats>>("/api/seamen/stats")
  return unwrap(res.data)
}

export async function syncSeamen(
  payload?: SyncSeamenPayload,
): Promise<{ synced: number }> {
  const res = await apiClient.post<ApiResponse<{ synced: number }>>(
    "/api/seamen/sync",
    payload ?? {},
  )
  return unwrap(res.data)
}

export async function clearSeamen(): Promise<{ deleted: number }> {
  const res =
    await apiClient.delete<ApiResponse<{ deleted: number }>>("/api/seamen")
  return unwrap(res.data)
}
