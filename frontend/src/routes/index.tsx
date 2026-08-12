import { createBrowserRouter, Navigate } from "react-router"
import {
  ProtectedRoute,
  PublicRoute,
} from "@/components/guards/protected-route"
import { RoleGuard } from "@/components/guards/role-guard"
import { MainLayout } from "@/components/layouts/main-layout"
import { ROLES } from "@/lib/rbac"
import ApprovalLogPage from "@/pages/approval-log"
import LoginPage from "@/pages/auth/login"
import BranchOfficePage from "@/pages/branch-office"
import BranchOfficeCreatePage from "@/pages/branch-office/create"
import BranchOfficeEditPage from "@/pages/branch-office/edit"
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
import HospitalPage from "@/pages/hospital"
import HospitalCreatePage from "@/pages/hospital/create"
import HospitalEditPage from "@/pages/hospital/edit"
import SeamanPage from "@/pages/seaman"
import ShipPage from "@/pages/ship"
import ShipCreatePage from "@/pages/ship/create"
import ShipEditPage from "@/pages/ship/edit"
import UsersPage from "@/pages/users"
import UsersCreatePage from "@/pages/users/create"
import UsersDetailPage from "@/pages/users/detail"
import UsersEditPage from "@/pages/users/edit"
import { ROUTES } from "@/routes/config"

export const router = createBrowserRouter(
  [
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
                { path: ROUTES.userEdit.path, element: <UsersEditPage /> },
                { path: ROUTES.userDetail.path, element: <UsersDetailPage /> },
              ],
            },

            // Admin, Manager, Staff: akses & kelola Form CR9
            {
              element: <RoleGuard requiredPermission="view:form-cr9" />,
              children: [
                { path: ROUTES.formCr9.path, element: <FormCr9Page /> },
              ],
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
                {
                  path: ROUTES.formA2Detail.path,
                  element: <FormA2DetailPage />,
                },
              ],
            },
            {
              element: <RoleGuard requiredPermission="manage:form-a2" />,
              children: [
                {
                  path: ROUTES.formA2Create.path,
                  element: <FormA2CreatePage />,
                },
                { path: ROUTES.formA2Edit.path, element: <FormA2EditPage /> },
              ],
            },

            // Hanya admin: approval log
            {
              element: <RoleGuard requiredPermission="view:approval-log" />,
              children: [
                { path: ROUTES.approvalLog.path, element: <ApprovalLogPage /> },
              ],
            },

            // Hanya admin: kelola seaman
            {
              element: <RoleGuard requiredPermission="view:seaman" />,
              children: [{ path: ROUTES.seaman.path, element: <SeamanPage /> }],
            },

            // Hanya admin: kelola kantor cabang
            {
              element: <RoleGuard requiredPermission="manage:branch-offices" />,
              children: [
                {
                  path: ROUTES.branchOffice.path,
                  element: <BranchOfficePage />,
                },
                {
                  path: ROUTES.branchOfficeCreate.path,
                  element: <BranchOfficeCreatePage />,
                },
                {
                  path: ROUTES.branchOfficeEdit.path,
                  element: <BranchOfficeEditPage />,
                },
              ],
            },

            // Hanya admin: kelola master data rumah sakit
            {
              element: <RoleGuard requiredPermission="manage:hospitals" />,
              children: [
                { path: ROUTES.hospital.path, element: <HospitalPage /> },
                {
                  path: ROUTES.hospitalCreate.path,
                  element: <HospitalCreatePage />,
                },
                {
                  path: ROUTES.hospitalEdit.path,
                  element: <HospitalEditPage />,
                },
              ],
            },

            // Hanya admin: kelola master data kapal
            {
              element: <RoleGuard requiredPermission="manage:ships" />,
              children: [
                { path: ROUTES.ship.path, element: <ShipPage /> },
                { path: ROUTES.shipCreate.path, element: <ShipCreatePage /> },
                { path: ROUTES.shipEdit.path, element: <ShipEditPage /> },
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
  ],
  {
    basename: import.meta.env.BASE_URL,
  },
)
