export interface BranchOffice {
  id: string
  province: string
  city: string
  created_at: string
  updated_at: string
}

export interface BranchOfficeListParams {
  page?: number
  limit?: number
  province?: string
  city?: string
}

export interface CreateBranchOfficePayload {
  province: string
  city: string
}

export interface UpdateBranchOfficePayload {
  province?: string
  city?: string
}
