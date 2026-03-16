import {
  ClipboardCheck,
  ClipboardList,
  FileText,
  LayoutDashboard,
  ScrollText,
  Ship,
  Users,
} from "lucide-react"
import { NavLink } from "react-router"
import { useAuth } from "@/contexts/auth.context"
import { hasAccess, type Permission } from "@/lib/rbac"
import { cn } from "@/lib/utils"
import { ROUTES } from "@/routes/config"

interface NavItem {
  label: string
  icon: React.ElementType
  path: string
  permission: Permission
}

const NAV_ITEMS: NavItem[] = [
  {
    label: ROUTES.dashboard.label,
    icon: LayoutDashboard,
    path: ROUTES.dashboard.path,
    permission: "view:dashboard",
  },
  {
    label: ROUTES.users.label,
    icon: Users,
    path: ROUTES.users.path,
    permission: "view:users",
  },
  {
    label: ROUTES.seaman.label,
    icon: Ship,
    path: ROUTES.seaman.path,
    permission: "view:seaman",
  },
  {
    label: ROUTES.formCr9.label,
    icon: ClipboardList,
    path: ROUTES.formCr9.path,
    permission: "view:form-cr9",
  },
  {
    label: ROUTES.formA2.label,
    icon: FileText,
    path: ROUTES.formA2.path,
    permission: "view:form-a2",
  },
  {
    label: ROUTES.approval.label,
    icon: ClipboardCheck,
    path: ROUTES.approval.path,
    permission: "view:approval",
  },
  {
    label: ROUTES.approvalLog.label,
    icon: ScrollText,
    path: ROUTES.approvalLog.path,
    permission: "view:approval-log",
  },
]

interface SidebarProps {
  collapsed: boolean
}

export function Sidebar({ collapsed }: SidebarProps) {
  const { user } = useAuth()

  const visibleItems = NAV_ITEMS.filter(
    (item) => user && hasAccess(user, item.permission),
  )

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col bg-white transition-all duration-200",
        collapsed ? "w-18" : "w-64",
      )}
    >
      <nav className="flex-1 py-2">
        {visibleItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-4 px-3 py-4 mx-2 rounded-md text-sm transition-colors",
                collapsed ? "justify-center" : "",
                isActive
                  ? "bg-red-50 text-red-600 font-medium"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
              )
            }
          >
            <item.icon size={18} className="shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
