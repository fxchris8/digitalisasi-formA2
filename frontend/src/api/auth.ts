import apiClient from "@/lib/api-client"
import { unwrap } from "@/lib/api-utils"
import type { ApiResponse } from "@/types/api"
import type { User } from "@/types/auth"

export interface LoginCredentials {
  username: string
  password: string
}

export async function login(credentials: LoginCredentials): Promise<User> {
  const res = await apiClient.post<ApiResponse<User>>(
    "/api/auth/login",
    credentials,
  )
  return unwrap(res.data)
}

export async function logout(): Promise<void> {
  await apiClient.post("/api/auth/logout")
}

export async function me(): Promise<User> {
  const res = await apiClient.get<ApiResponse<User>>("/api/auth/me")
  return unwrap(res.data)
}
