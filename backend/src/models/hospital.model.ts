/**
 * Domain model — representasi data entitas Hospital, mapping ke skema DB.
 */
export type HospitalCategory = "swasta" | "pemerintah"

export interface Hospital {
  id: string
  name: string
  province: string
  city: string
  category: HospitalCategory
  owner_type: string | null
  created_at: Date
  updated_at: Date
}
