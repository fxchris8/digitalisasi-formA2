import apiClient from "@/lib/api-client"
import { unwrap } from "@/lib/api-utils"
import type { ApiResponse, PaginatedResponse } from "@/types/api"
import type {
  CreateHospitalPayload,
  Hospital,
  HospitalListParams,
  UpdateHospitalPayload,
} from "@/types/hospital"

export async function listHospitals(
  params?: HospitalListParams,
): Promise<PaginatedResponse<Hospital>> {
  const res = await apiClient.get<ApiResponse<PaginatedResponse<Hospital>>>(
    "/api/hospitals",
    { params },
  )
  return unwrap(res.data)
}

export async function getHospital(id: string): Promise<Hospital> {
  const res = await apiClient.get<ApiResponse<Hospital>>(`/api/hospitals/${id}`)
  return unwrap(res.data)
}

export async function createHospital(
  payload: CreateHospitalPayload,
): Promise<Hospital> {
  const res = await apiClient.post<ApiResponse<Hospital>>(
    "/api/hospitals",
    payload,
  )
  return unwrap(res.data)
}

export async function updateHospital(
  id: string,
  payload: UpdateHospitalPayload,
): Promise<Hospital> {
  const res = await apiClient.put<ApiResponse<Hospital>>(
    `/api/hospitals/${id}`,
    payload,
  )
  return unwrap(res.data)
}

export async function deleteHospital(id: string): Promise<void> {
  await apiClient.delete(`/api/hospitals/${id}`)
}
