import { createBrowserRouter, Navigate } from "react-router"
import {
  ProtectedRoute,
  PublicRoute,
} from "@/components/guards/protected-route"
import { RoleGuard } from "@/components/guards/role-guard"
import { MainLayout } from "@/components/layouts/main-layout"
import { ROLES } from "@/lib/rbac"
import ForbiddenPage from "@/pages/403"
import LoginPage from "@/pages/auth/login"
import DashboardPage from "@/pages/dashboard"

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/login" replace />,
  },

  // Public routes — redirect ke dashboard jika sudah login
  {
    element: <PublicRoute />,
    children: [
      {
        path: "/login",
        element: <LoginPage />,
      },
    ],
  },

  // Protected routes — harus login
  {
    element: <ProtectedRoute />,
    children: [
      // Semua halaman yang butuh navbar dibungkus MainLayout
      {
        element: <MainLayout />,
        children: [
          {
            path: "/dashboard",
            element: <DashboardPage />,
          },

          // Hanya admin: kelola users
          {
            element: <RoleGuard allowedRoles={[ROLES.ADMIN]} />,
            children: [
              // { path: "/users", element: <UsersPage /> },
            ],
          },

          // Admin, Manager, Staff: akses form A2
          {
            element: <RoleGuard requiredPermission="view:form-a2" />,
            children: [
              // { path: "/form-a2", element: <FormA2Page /> },
            ],
          },

          // Admin, Manager, Staff: kelola form A2
          {
            element: <RoleGuard requiredPermission="manage:form-a2" />,
            children: [
              // { path: "/form-a2/create", element: <FormA2CreatePage /> },
            ],
          },

          {
            path: "/403",
            element: <ForbiddenPage />,
          },
        ],
      },
    ],
  },
])
