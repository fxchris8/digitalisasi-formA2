import apiClient from "@/lib/api-client"
import type { ApiResponse } from "@/types/api"
import type { User } from "@/types/auth"

export interface LoginCredentials {
  user_name: string
  password: string
}

export async function login(
  credentials: LoginCredentials,
): Promise<ApiResponse<User>> {
  const res = await apiClient.post<ApiResponse<User>>(
    "/api/auth/login",
    credentials,
  )
  return res.data
}

export async function logout(): Promise<void> {
  await apiClient.post("/api/auth/logout")
}
