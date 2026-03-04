import apiClient from "@/lib/api-client"
import type { ApiResponse, PaginatedResponse } from "@/types/api"
import type {
  CreateFormCr9Payload,
  FormCr9,
  FormCr9ListParams,
  UpdateFormCr9Payload,
} from "@/types/form-cr9"

export async function listFormCr9(
  params?: FormCr9ListParams,
): Promise<PaginatedResponse<FormCr9>> {
  const res = await apiClient.get<ApiResponse<PaginatedResponse<FormCr9>>>(
    "/api/form-cr9",
    { params },
  )
  return res.data.data!
}

export async function getFormCr9(id: string): Promise<FormCr9> {
  const res = await apiClient.get<ApiResponse<FormCr9>>(`/api/form-cr9/${id}`)
  return res.data.data!
}

export async function createFormCr9(
  payload: CreateFormCr9Payload,
): Promise<FormCr9> {
  const res = await apiClient.post<ApiResponse<FormCr9>>(
    "/api/form-cr9",
    payload,
  )
  return res.data.data!
}

export async function updateFormCr9(
  id: string,
  payload: UpdateFormCr9Payload,
): Promise<FormCr9> {
  const res = await apiClient.put<ApiResponse<FormCr9>>(
    `/api/form-cr9/${id}`,
    payload,
  )
  return res.data.data!
}

export async function deleteFormCr9(id: string): Promise<void> {
  await apiClient.delete(`/api/form-cr9/${id}`)
}

export async function submitFormCr9(id: string): Promise<void> {
  await apiClient.post(`/api/form-cr9/${id}/submit`)
}
