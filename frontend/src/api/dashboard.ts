import apiClient from "@/lib/api-client"
import { unwrap } from "@/lib/api-utils"
import type { ApiResponse } from "@/types/api"
import type { AdminStats } from "@/types/dashboard"

export async function getAdminStats(): Promise<AdminStats> {
  const res = await apiClient.get<ApiResponse<AdminStats>>(
    "/api/dashboard/stats",
  )
  return unwrap(res.data)
}
