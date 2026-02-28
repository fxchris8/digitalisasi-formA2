import { PanelLeft } from "lucide-react"
import { useState } from "react"
import { Link, Outlet, useLocation } from "react-router"
import { Navbar } from "@/components/layouts/navbar"
import { Sidebar } from "@/components/layouts/sidebar"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { ROUTE_SEGMENT_LABELS } from "@/routes/config"

function AppBreadcrumb() {
  const { pathname } = useLocation()
  const segments = pathname.split("/").filter(Boolean)

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {segments.map((segment, index) => {
          const isLast = index === segments.length - 1
          const href = `/${segments.slice(0, index + 1).join("/")}`
          const label = ROUTE_SEGMENT_LABELS[segment] ?? segment

          return (
            <BreadcrumbItem key={href}>
              {isLast ? (
                <BreadcrumbPage>{label}</BreadcrumbPage>
              ) : (
                <>
                  <BreadcrumbLink asChild>
                    <Link to={href}>{label}</Link>
                  </BreadcrumbLink>
                  <BreadcrumbSeparator />
                </>
              )}
            </BreadcrumbItem>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}

export function MainLayout() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar collapsed={collapsed} />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-12 flex items-center gap-2 px-4">
            <button
              type="button"
              onClick={() => setCollapsed((prev) => !prev)}
              className="p-1.5 rounded-md text-gray-500 hover:text-gray-600 hover:bg-gray-100"
              title={collapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
            >
              <PanelLeft size={20} />
            </button>
            <AppBreadcrumb />
          </header>
          <main className="flex-1 overflow-auto px-6 py-4">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
