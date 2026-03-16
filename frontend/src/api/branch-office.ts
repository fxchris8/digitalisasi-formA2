import apiClient from "@/lib/api-client"
import { unwrap } from "@/lib/api-utils"
import type { ApiResponse, PaginatedResponse } from "@/types/api"
import type {
  BranchOffice,
  BranchOfficeListParams,
  CreateBranchOfficePayload,
  UpdateBranchOfficePayload,
} from "@/types/branch-office"

export async function listBranchOffices(
  params?: BranchOfficeListParams,
): Promise<PaginatedResponse<BranchOffice>> {
  const res = await apiClient.get<ApiResponse<PaginatedResponse<BranchOffice>>>(
    "/api/branch-offices",
    { params },
  )
  return unwrap(res.data)
}

export async function getBranchOffice(id: string): Promise<BranchOffice> {
  const res = await apiClient.get<ApiResponse<BranchOffice>>(
    `/api/branch-offices/${id}`,
  )
  return unwrap(res.data)
}

export async function createBranchOffice(
  payload: CreateBranchOfficePayload,
): Promise<BranchOffice> {
  const res = await apiClient.post<ApiResponse<BranchOffice>>(
    "/api/branch-offices",
    payload,
  )
  return unwrap(res.data)
}

export async function updateBranchOffice(
  id: string,
  payload: UpdateBranchOfficePayload,
): Promise<BranchOffice> {
  const res = await apiClient.put<ApiResponse<BranchOffice>>(
    `/api/branch-offices/${id}`,
    payload,
  )
  return unwrap(res.data)
}

export async function deleteBranchOffice(id: string): Promise<void> {
  await apiClient.delete(`/api/branch-offices/${id}`)
}
