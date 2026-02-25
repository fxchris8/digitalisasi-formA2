import { Navigate, Outlet } from "react-router"
import { useAuth } from "@/contexts/auth.context"
import { hasPermission, hasRole, type Permission, type Role } from "@/lib/rbac"

interface RoleGuardProps {
  /** Izinkan akses berdasarkan role tertentu */
  allowedRoles?: Role[]
  /** Izinkan akses berdasarkan permission tertentu */
  requiredPermission?: Permission
  /** Redirect ke path ini jika tidak punya akses (default: /403) */
  redirectTo?: string
}

/**
 * Guard berbasis role/permission.
 * Harus digunakan di dalam ProtectedRoute.
 *
 * Contoh penggunaan di router:
 *
 * // Hanya admin yang boleh akses
 * { element: <RoleGuard allowedRoles={["admin"]} />, children: [...] }
 *
 * // Siapa pun yang punya permission ini boleh akses
 * { element: <RoleGuard requiredPermission="manage:users" />, children: [...] }
 */
export function RoleGuard({
  allowedRoles,
  requiredPermission,
  redirectTo = "/403",
}: RoleGuardProps) {
  const { user } = useAuth()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  const roleOk = allowedRoles ? hasRole(user.role, allowedRoles) : true
  const permOk = requiredPermission
    ? hasPermission(user.role, requiredPermission)
    : true

  if (!roleOk || !permOk) {
    return <Navigate to={redirectTo} replace />
  }

  return <Outlet />
}

/**
 * Komponen untuk render konten secara kondisional
 * berdasarkan role/permission — tanpa redirect.
 *
 * Contoh:
 * <Can permission="manage:users">
 *   <button>Hapus User</button>
 * </Can>
 */
interface CanProps {
  allowedRoles?: Role[]
  permission?: Permission
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function Can({
  allowedRoles,
  permission,
  children,
  fallback = null,
}: CanProps) {
  const { user } = useAuth()

  if (!user) return <>{fallback}</>

  const roleOk = allowedRoles ? hasRole(user.role, allowedRoles) : true
  const permOk = permission ? hasPermission(user.role, permission) : true

  return <>{roleOk && permOk ? children : fallback}</>
}
