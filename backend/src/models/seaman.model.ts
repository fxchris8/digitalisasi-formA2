/**
 * Domain model — representasi data entitas Seaman, mapping ke skema DB.
 * Data disinkronkan dari API eksternal SPM.
 */
export interface Seaman {
  seamancode: string
  seafarercode: string | null
  name: string
  gender: string | null
  birthdate: string | null // format DD/MM/YYYY
  birthplace: string | null
  age: number | null
  edu_level: string | null
  certificate: string | null
  experience: string | null
  fleet: string | null
  is_active_employee: string | null // 'YES' | 'NO'
  status: string | null
  start_date: string | null // format DD/MM/YYYY
  end_date: string | null // format DD/MM/YYYY
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
  synced_at: Date
  updated_at: Date
}
