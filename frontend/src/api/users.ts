import apiClient from "@/lib/api-client"
import { unwrap } from "@/lib/api-utils"
import type { ApiResponse, PaginatedResponse } from "@/types/api"
import type { CreateUserPayload, UserItem, UserListParams } from "@/types/user"

export async function listUsers(
  params?: UserListParams,
): Promise<PaginatedResponse<UserItem>> {
  const res = await apiClient.get<ApiResponse<PaginatedResponse<UserItem>>>(
    "/api/users",
    { params },
  )
  return unwrap(res.data)
}

export async function getUser(id: string): Promise<UserItem> {
  const res = await apiClient.get<ApiResponse<UserItem>>(`/api/users/${id}`)
  return unwrap(res.data)
}

export async function createUser(
  payload: CreateUserPayload,
): Promise<UserItem> {
  const res = await apiClient.post<ApiResponse<UserItem>>("/api/users", payload)
  return unwrap(res.data)
}

export async function deleteUser(id: string): Promise<void> {
  await apiClient.delete(`/api/users/${id}`)
}

export async function changeUserPassword(
  id: string,
  newPassword: string,
): Promise<void> {
  await apiClient.post(`/api/users/${id}/change-password`, { newPassword })
}
