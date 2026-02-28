/**
 * Domain model — representasi data entitas User, mapping ke skema DB.
 */
export interface User {
  id: string
  full_name: string
  username: string
  email: string
  password: string
  role: string
  department: string | null
  branch_office: string | null
  created_at: Date
  updated_at: Date
}

export type SafeUser = Omit<User, "password">
