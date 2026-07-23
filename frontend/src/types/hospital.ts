export type HospitalCategory = "swasta" | "pemerintah"

export interface Hospital {
  id: string
  name: string
  province: string
  city: string
  category: HospitalCategory
  owner_type: string | null
  created_at: string
  updated_at: string
}

export interface HospitalListParams {
  page?: number
  limit?: number
  search?: string
  category?: HospitalCategory
}

export interface CreateHospitalPayload {
  name: string
  province: string
  city: string
  category: HospitalCategory
  owner_type?: string
}

export type UpdateHospitalPayload = Partial<CreateHospitalPayload>
