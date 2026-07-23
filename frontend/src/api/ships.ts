import apiClient from "@/lib/api-client"
import { unwrap } from "@/lib/api-utils"
import type { ApiResponse, PaginatedResponse } from "@/types/api"
import type {
  CreateShipPayload,
  Ship,
  ShipListParams,
  UpdateShipPayload,
} from "@/types/ship"

export async function listShips(
  params?: ShipListParams,
): Promise<PaginatedResponse<Ship>> {
  const res = await apiClient.get<ApiResponse<PaginatedResponse<Ship>>>(
    "/api/ships",
    { params },
  )
  return unwrap(res.data)
}

export async function getShip(id: string): Promise<Ship> {
  const res = await apiClient.get<ApiResponse<Ship>>(`/api/ships/${id}`)
  return unwrap(res.data)
}

export async function createShip(payload: CreateShipPayload): Promise<Ship> {
  const res = await apiClient.post<ApiResponse<Ship>>("/api/ships", payload)
  return unwrap(res.data)
}

export async function updateShip(
  id: string,
  payload: UpdateShipPayload,
): Promise<Ship> {
  const res = await apiClient.put<ApiResponse<Ship>>(
    `/api/ships/${id}`,
    payload,
  )
  return unwrap(res.data)
}

export async function deleteShip(id: string): Promise<void> {
  await apiClient.delete(`/api/ships/${id}`)
}
