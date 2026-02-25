import { Navigate, Outlet } from "react-router"
import { useAuth } from "@/contexts/auth.context"

/**
 * Melindungi route dari user yang belum login.
 * Jika belum login → redirect ke /login.
 *
 * Penggunaan di router:
 * {
 *   element: <ProtectedRoute />,
 *   children: [ ...protected routes ]
 * }
 */
export function ProtectedRoute() {
  const { user } = useAuth()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

/**
 * Memastikan user yang sudah login tidak bisa
 * mengakses halaman publik seperti /login.
 * Jika sudah login → redirect ke /dashboard.
 */
export function PublicRoute() {
  const { user } = useAuth()

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
