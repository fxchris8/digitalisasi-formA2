export interface UserItem {
  id: string
  full_name: string
  username: string
  email: string
  role: string
  department: string | null
  branch_office: string | null
  created_at: string
  updated_at: string
}

export interface UserListParams {
  page?: number
  limit?: number
  search?: string
}

export interface CreateUserPayload {
  full_name: string
  username: string
  email: string
  password: string
  role: string
  department: string | null
  branch_office: string | null
}
