import { createBrowserRouter, Navigate } from "react-router"
import {
  ProtectedRoute,
  PublicRoute,
} from "@/components/guards/protected-route"
import { RoleGuard } from "@/components/guards/role-guard"
import { MainLayout } from "@/components/layouts/main-layout"
import { ROLES } from "@/lib/rbac"
import ApprovalPage from "@/pages/approval"
import ApprovalDetailPage from "@/pages/approval/detail"
import ApprovalLogPage from "@/pages/approval-log"
import LoginPage from "@/pages/auth/login"
import DashboardPage from "@/pages/dashboard"
import ForbiddenPage from "@/pages/forbidden"
import FormA2Page from "@/pages/form-a2"
import FormA2CreatePage from "@/pages/form-a2/create"
import FormA2DetailPage from "@/pages/form-a2/detail"
import FormA2EditPage from "@/pages/form-a2/edit"
import FormCr9Page from "@/pages/form-cr9"
import FormCr9CreatePage from "@/pages/form-cr9/create"
import FormCr9DetailPage from "@/pages/form-cr9/detail"
import FormCr9EditPage from "@/pages/form-cr9/edit"
import UsersPage from "@/pages/users"
import UsersCreatePage from "@/pages/users/create"
import UsersDetailPage from "@/pages/users/detail"
import { ROUTES } from "@/routes/config"

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
            path: ROUTES.dashboard.path,
            element: <DashboardPage />,
          },

          // Hanya admin: kelola users
          {
            element: <RoleGuard allowedRoles={[ROLES.ADMIN]} />,
            children: [
              { path: ROUTES.users.path, element: <UsersPage /> },
              { path: ROUTES.userCreate.path, element: <UsersCreatePage /> },
              { path: ROUTES.userDetail.path, element: <UsersDetailPage /> },
            ],
          },

          // Admin, Manager, Staff: akses & kelola Form CR9
          {
            element: <RoleGuard requiredPermission="view:form-cr9" />,
            children: [{ path: ROUTES.formCr9.path, element: <FormCr9Page /> }],
          },
          {
            element: <RoleGuard requiredPermission="view:form-cr9" />,
            children: [
              {
                path: ROUTES.formCr9Detail.path,
                element: <FormCr9DetailPage />,
              },
            ],
          },
          {
            element: <RoleGuard requiredPermission="manage:form-cr9" />,
            children: [
              {
                path: ROUTES.formCr9Create.path,
                element: <FormCr9CreatePage />,
              },
              { path: ROUTES.formCr9Edit.path, element: <FormCr9EditPage /> },
            ],
          },

          // Admin, Manager, Staff: akses & kelola Form A2
          {
            element: <RoleGuard requiredPermission="view:form-a2" />,
            children: [
              { path: ROUTES.formA2.path, element: <FormA2Page /> },
              { path: ROUTES.formA2Detail.path, element: <FormA2DetailPage /> },
            ],
          },
          {
            element: <RoleGuard requiredPermission="manage:form-a2" />,
            children: [
              { path: ROUTES.formA2Create.path, element: <FormA2CreatePage /> },
              { path: ROUTES.formA2Edit.path, element: <FormA2EditPage /> },
            ],
          },

          // Manager & Staff finance: approval
          {
            element: <RoleGuard requiredPermission="view:approval" />,
            children: [
              { path: ROUTES.approval.path, element: <ApprovalPage /> },
              {
                path: ROUTES.approvalDetail.path,
                element: <ApprovalDetailPage />,
              },
            ],
          },

          // Hanya admin: approval log
          {
            element: <RoleGuard requiredPermission="view:approval-log" />,
            children: [
              { path: ROUTES.approvalLog.path, element: <ApprovalLogPage /> },
            ],
          },

          {
            path: ROUTES.forbidden.path,
            element: <ForbiddenPage />,
          },
        ],
      },
    ],
  },
])
