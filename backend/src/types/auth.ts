/**
 * Kontrak bentuk data umum untuk auth — bukan DB entity.
 */
export interface JwtPayload {
  id: string
  username: string
  email: string
  role: string
  department: string | null
  branch_office: string | null
}
