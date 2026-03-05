import apiClient from "@/lib/api-client"
import { unwrap } from "@/lib/api-utils"
import type { ApiResponse, PaginatedResponse } from "@/types/api"
import type {
  AddDetailPayload,
  FormA2,
  FormA2Detail,
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

export async function addFormA2Detail(
  id: string,
  payload: AddDetailPayload,
): Promise<FormA2Detail> {
  const res = await apiClient.post<ApiResponse<FormA2Detail>>(
    `/api/form-a2/${id}/details`,
    payload,
  )
  return unwrap(res.data)
}

export async function removeFormA2Detail(
  id: string,
  detailId: string,
): Promise<void> {
  await apiClient.delete(`/api/form-a2/${id}/details/${detailId}`)
}

export async function submitFormA2(id: string): Promise<FormA2> {
  const res = await apiClient.post<ApiResponse<FormA2>>(
    `/api/form-a2/${id}/submit`,
  )
  return unwrap(res.data)
}
