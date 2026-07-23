export interface Ship {
  id: string
  name: string
  created_at: string
  updated_at: string
}

export interface ShipListParams {
  page?: number
  limit?: number
  search?: string
}

export interface CreateShipPayload {
  name: string
}

export type UpdateShipPayload = Partial<CreateShipPayload>
