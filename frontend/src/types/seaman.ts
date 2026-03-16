export interface Seaman {
  seamancode: string
  seafarercode: string
  name: string
  gender: string | null
  birthdate: string | null
  birthplace: string | null
  age: number | null
  edu_level: string | null
  certificate: string | null
  experience: string | null
  fleet: string | null
  is_active_employee: string | null
  status: string | null
  start_date: string | null
  end_date: string | null
  day_elapsed: number | null
  day_remains: number | null
  last_position: string | null
  last_location: string | null
  last_vesselid: string | null
  prevposition: string | null
  prevlocation: string | null
  pic_crewing: string | null
  phone_number_1: string | null
  phone_number_2: string | null
  phone_number_3: string | null
  phone_number_4: string | null
  synced_at: string
  updated_at: string
}

export interface SeamanStats {
  total: number
  last_synced_at: string | null
}

export interface SyncSeamenPayload {
  age?: number
  status?: string
  education?: string
  experience?: string
  certificate?: string
  last_location?: string
  last_position?: string
}
