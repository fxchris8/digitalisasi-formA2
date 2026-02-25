/**
 * RBAC — Role-Based Access Control
 *
 * Tambahkan role baru di `ROLES`, lalu definisikan
 * permission-nya di `ROLE_PERMISSIONS`.
 */

export const ROLES = {
  ADMIN: "admin",
  MANAGER: "manager",
  STAFF: "staff",
  USER: "user",
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

/**
 * Daftar semua permission yang tersedia di aplikasi.
 * Format: "action:resource"
 */
export type Permission =
  | "view:dashboard"
  | "view:users"
  | "view:form-a2"
  | "manage:users"
  | "manage:form-a2"

/**
 * Mapping role → permissions yang dimiliki.
 * Sesuaikan dengan kebutuhan bisnis.
 */
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [ROLES.ADMIN]: [
    "view:dashboard",
    "view:users",
    "manage:users",
    "manage:form-a2",
  ],
  [ROLES.MANAGER]: ["view:dashboard", "view:form-a2", "manage:form-a2"],
  [ROLES.STAFF]: ["view:dashboard", "view:form-a2", "manage:form-a2"],
  [ROLES.USER]: ["view:dashboard"],
}

/**
 * Cek apakah role memiliki permission tertentu.
 */
export function hasPermission(role: string, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role as Role]
  if (!permissions) return false
  return permissions.includes(permission)
}

/**
 * Cek apakah role ada dalam daftar roles yang diizinkan.
 */
export function hasRole(userRole: string, allowedRoles: Role[]): boolean {
  return allowedRoles.includes(userRole as Role)
}
