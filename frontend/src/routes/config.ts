/**
 * Sumber kebenaran tunggal untuk path dan label setiap route.
 * Gunakan ini di router (index.tsx) dan breadcrumb agar tidak redundan.
 */
export const ROUTES = {
  dashboard: { path: "/dashboard", label: "Dashboard" },
  users: { path: "/users", label: "Kelola Users" },
  formCr9: { path: "/form-cr9", label: "Form CR9" },
  formCr9Create: { path: "/form-cr9/create", label: "Buat Baru" },
  formCr9Detail: { path: "/form-cr9/:id", label: "Detail Form CR9" },
  formCr9Edit: { path: "/form-cr9/:id/edit", label: "Edit Form CR9" },
  formA2: { path: "/form-a2", label: "Form A2" },
  formA2Create: { path: "/form-a2/create", label: "Buat Baru" },
  formA2Detail: { path: "/form-a2/:id", label: "Detail Form A2" },
  formA2Edit: { path: "/form-a2/:id/edit", label: "Edit Form A2" },
  approval: { path: "/approval", label: "Approval" },
  approvalLog: { path: "/approval-log", label: "Approval Log" },
  forbidden: { path: "/403", label: "Akses Ditolak" },
} as const

/**
 * Map dari path segment → label untuk kebutuhan breadcrumb.
 * Di-generate otomatis dari ROUTES di atas.
 */
export const ROUTE_SEGMENT_LABELS: Record<string, string> = Object.values(
  ROUTES,
).reduce(
  (acc, { path, label }) => {
    const segments = path.split("/").filter(Boolean)
    segments.forEach((segment) => {
      if (!acc[segment]) acc[segment] = label
    })
    return acc
  },
  {} as Record<string, string>,
)
