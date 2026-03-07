import { useAuth } from "@/contexts/auth.context"
import { getManagerStep, ROLES } from "@/lib/rbac"
import AdminView from "./_views/admin-view"
import ManagerView from "./_views/manager-view"
import StaffView from "./_views/staff-view"
import UserView from "./_views/user-view"

export default function DashboardPage() {
  const { user } = useAuth()

  if (!user) return null
  if (user.role === ROLES.ADMIN) return <AdminView />
  if (user.role === ROLES.USER) return <UserView />
  if (getManagerStep(user)) return <ManagerView />

  return <StaffView />
}
