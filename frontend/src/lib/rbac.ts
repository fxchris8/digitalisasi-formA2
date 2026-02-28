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
  | "manage:users"
  | "view:form-cr9"
  | "manage:form-cr9"
  | "view:form-a2"
  | "manage:form-a2"
  | "view:approval"
  | "manage:approval"
  | "view:approval-log"

/**
 * Mapping role → permissions yang dimiliki.
 * Sesuaikan dengan kebutuhan bisnis.
 */
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [ROLES.ADMIN]: [
    "view:dashboard",
    "view:users",
    "manage:users",
    "view:form-cr9",
    "manage:form-cr9",
    "view:form-a2",
    "manage:form-a2",
    "view:approval-log",
  ],
  [ROLES.MANAGER]: [
    "view:dashboard",
    "view:form-cr9",
    "view:form-a2",
    "manage:form-a2",
    "view:approval",
    "manage:approval",
  ],
  [ROLES.STAFF]: [
    "view:dashboard",
    "view:form-cr9",
    "manage:form-cr9",
    "view:form-a2",
    "manage:form-a2",
  ],
  [ROLES.USER]: ["view:dashboard"],
}

/**
 * Permission yang juga diberikan berdasarkan department,
 * terlepas dari role.
 */
const DEPARTMENT_PERMISSIONS: Record<string, Permission[]> = {
  finance: ["view:approval", "manage:approval"],
}

/**
 * Cek apakah role memiliki permission tertentu (role-only).
 */
export function hasPermission(role: string, permission: Permission): boolean {
  const permissions = ROLE_PERMISSIONS[role as Role]
  if (!permissions) return false
  return permissions.includes(permission)
}

/**
 * Cek akses berdasarkan role DAN department.
 * Gunakan ini di komponen (sidebar, guard, dll) sebagai pengganti hasPermission.
 */
export function hasAccess(
  user: { role: string; department: string | null },
  permission: Permission,
): boolean {
  if (hasPermission(user.role, permission)) return true
  if (user.department) {
    const deptPerms = DEPARTMENT_PERMISSIONS[user.department] ?? []
    if (deptPerms.includes(permission)) return true
  }
  return false
}

/**
 * Cek apakah role ada dalam daftar roles yang diizinkan.
 */
export function hasRole(userRole: string, allowedRoles: Role[]): boolean {
  return allowedRoles.includes(userRole as Role)
}
