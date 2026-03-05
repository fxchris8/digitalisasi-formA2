import apiClient from "@/lib/api-client"
import { unwrap } from "@/lib/api-utils"
import type { ApiResponse } from "@/types/api"
import type {
  ApprovePayload,
  FormA2,
  RejectPayload,
  RevisionPayload,
} from "@/types/form-a2"

export async function listPendingApproval(): Promise<FormA2[]> {
  const res = await apiClient.get<ApiResponse<FormA2[]>>("/api/approval")
  return unwrap(res.data)
}

export async function approveFormA2(
  id: string,
  payload: ApprovePayload,
): Promise<FormA2> {
  const res = await apiClient.post<ApiResponse<FormA2>>(
    `/api/approval/${id}/approve`,
    payload,
  )
  return unwrap(res.data)
}

export async function requestRevisionFormA2(
  id: string,
  payload: RevisionPayload,
): Promise<FormA2> {
  const res = await apiClient.post<ApiResponse<FormA2>>(
    `/api/approval/${id}/revision`,
    payload,
  )
  return unwrap(res.data)
}

export async function rejectFormA2(
  id: string,
  payload: RejectPayload,
): Promise<FormA2> {
  const res = await apiClient.post<ApiResponse<FormA2>>(
    `/api/approval/${id}/reject`,
    payload,
  )
  return unwrap(res.data)
}
