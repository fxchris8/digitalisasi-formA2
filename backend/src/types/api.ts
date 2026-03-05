export type ApiResponse<T = void> =
  | { success: true; message: string; data: T }
  | { success: false; message: string; error: string }
