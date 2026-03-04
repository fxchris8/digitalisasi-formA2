import apiClient from "@/lib/api-client"
import type { ApiResponse } from "@/types/api"
import type {
  ApprovePayload,
  FormA2,
  RejectPayload,
  RevisionPayload,
} from "@/types/form-a2"

export async function listPendingApproval(): Promise<FormA2[]> {
  const res = await apiClient.get<ApiResponse<FormA2[]>>("/api/approval")
  return res.data.data!
}

export async function approveFormA2(
  id: string,
  payload: ApprovePayload,
): Promise<FormA2> {
  const res = await apiClient.post<ApiResponse<FormA2>>(
    `/api/approval/${id}/approve`,
    payload,
  )
  return res.data.data!
}

export async function requestRevisionFormA2(
  id: string,
  payload: RevisionPayload,
): Promise<FormA2> {
  const res = await apiClient.post<ApiResponse<FormA2>>(
    `/api/approval/${id}/revision`,
    payload,
  )
  return res.data.data!
}

export async function rejectFormA2(
  id: string,
  payload: RejectPayload,
): Promise<FormA2> {
  const res = await apiClient.post<ApiResponse<FormA2>>(
    `/api/approval/${id}/reject`,
    payload,
  )
  return res.data.data!
}
