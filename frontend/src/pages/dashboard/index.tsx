import { useAuth } from "@/contexts/auth.context"
import { ROLES } from "@/lib/rbac"
import AdminView from "./_views/admin-view"
import GeneralView from "./_views/general-view"
import UserView from "./_views/user-view"

export default function DashboardPage() {
  const { user } = useAuth()

  if (user?.role === ROLES.ADMIN) return <AdminView />
  if (user?.role === ROLES.USER) return <UserView />

  return <GeneralView />
}
