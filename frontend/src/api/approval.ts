import apiClient from "@/lib/api-client"
import { unwrap } from "@/lib/api-utils"
import type { ApiResponse, PaginatedResponse } from "@/types/api"
import type { ApprovalLogItem, ApprovalLogListParams } from "@/types/approval"
import type {
  ApprovePayload,
  FormA2,
  RejectPayload,
  ResolveNominalRevisionPayload,
  RevisionPayload,
} from "@/types/form-a2"

export async function listApprovalLogs(
  params?: ApprovalLogListParams,
): Promise<PaginatedResponse<ApprovalLogItem>> {
  const res = await apiClient.get<
    ApiResponse<PaginatedResponse<ApprovalLogItem>>
  >("/api/approval/log", { params })
  return unwrap(res.data)
}

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

export async function resolveNominalRevisionFormA2(
  id: string,
  payload: ResolveNominalRevisionPayload,
): Promise<FormA2> {
  const res = await apiClient.post<ApiResponse<FormA2>>(
    `/api/approval/${id}/resolve-nominal-revision`,
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
