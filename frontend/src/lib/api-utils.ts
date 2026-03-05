import type { ApiResponse } from "@/types/api"

export function unwrap<T>(res: ApiResponse<T>): T {
  if (!res.success) throw new Error(res.error)
  return res.data
}
