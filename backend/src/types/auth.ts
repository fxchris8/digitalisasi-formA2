/**
 * Kontrak bentuk data umum untuk auth — bukan DB entity.
 */
export interface JwtPayload {
  id: string
  user_name: string
  email: string
  role: string
}
