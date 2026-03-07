import apiClient from "@/lib/api-client"
import { unwrap } from "@/lib/api-utils"
import type { ApiResponse } from "@/types/api"
import type { AdminStats, BranchStats, ManagerStats } from "@/types/dashboard"

export async function getAdminStats(): Promise<AdminStats> {
  const res = await apiClient.get<ApiResponse<AdminStats>>(
    "/api/dashboard/stats",
  )
  return unwrap(res.data)
}

export async function getBranchStats(): Promise<BranchStats> {
  const res = await apiClient.get<ApiResponse<BranchStats>>(
    "/api/dashboard/branch-stats",
  )
  return unwrap(res.data)
}

export async function getManagerStats(): Promise<ManagerStats> {
  const res = await apiClient.get<ApiResponse<ManagerStats>>(
    "/api/dashboard/manager-stats",
  )
  return unwrap(res.data)
}
