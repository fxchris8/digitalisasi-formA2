export type ApiResponse<T> =
  | {
      success: true
      message: string
      data: T
    }
  | {
      success: false
      message: string
      error: string
    }

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  total_pages: number
}
