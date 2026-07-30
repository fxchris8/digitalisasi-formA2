import apiClient from "@/lib/api-client"
import { unwrap } from "@/lib/api-utils"
import type { ApiResponse, PaginatedResponse } from "@/types/api"
import type {
  FormA2,
  FormA2ListParams,
  FormA2WithDetails,
  UpdateFormA2Payload,
} from "@/types/form-a2"

export async function listFormA2(
  params?: FormA2ListParams,
): Promise<PaginatedResponse<FormA2>> {
  const res = await apiClient.get<ApiResponse<PaginatedResponse<FormA2>>>(
    "/api/form-a2",
    { params },
  )
  return unwrap(res.data)
}

export async function getFormA2(id: string): Promise<FormA2WithDetails> {
  const res = await apiClient.get<ApiResponse<FormA2WithDetails>>(
    `/api/form-a2/${id}`,
  )
  return unwrap(res.data)
}

export async function getFormA2ByCr9Id(
  cr9Id: string,
): Promise<FormA2WithDetails> {
  const res = await apiClient.get<ApiResponse<FormA2WithDetails>>(
    `/api/form-a2/by-cr9/${cr9Id}`,
  )
  return unwrap(res.data)
}

export async function updateFormA2(
  id: string,
  payload: UpdateFormA2Payload,
): Promise<FormA2> {
  const res = await apiClient.put<ApiResponse<FormA2>>(
    `/api/form-a2/${id}`,
    payload,
  )
  return unwrap(res.data)
}

export async function submitFormA2(id: string): Promise<FormA2> {
  const res = await apiClient.post<ApiResponse<FormA2>>(
    `/api/form-a2/${id}/submit`,
  )
  return unwrap(res.data)
}

export async function requestCabangRevision(
  id: string,
  payload: { notes: string },
): Promise<FormA2> {
  const res = await apiClient.post<ApiResponse<FormA2>>(
    `/api/form-a2/${id}/request-cabang-revision`,
    payload,
  )
  return unwrap(res.data)
}

/** PDF gabungan CR9+A2+dokumen — hanya tersedia setelah Finance approve. */
export async function exportFormA2Pdf(id: string): Promise<Blob> {
  const res = await apiClient.get(`/api/form-a2/${id}/export-pdf`, {
    responseType: "blob",
  })
  return res.data as Blob
}
