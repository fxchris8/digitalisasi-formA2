import { useAuth } from "@/contexts/auth.context"

export default function DashboardPage() {
  const { user } = useAuth()

  return (
    <div className="p-8">
      <h1 className="mb-4 text-2xl font-bold">Dashboard</h1>
      {user && (
        <div className="space-y-2 text-sm">
          <p>
            <span className="font-medium">ID:</span> {user.id}
          </p>
          <p>
            <span className="font-medium">Nama:</span> {user.full_name}
          </p>
          <p>
            <span className="font-medium">Username:</span> {user.user_name}
          </p>
          <p>
            <span className="font-medium">Email:</span> {user.email}
          </p>
          <p>
            <span className="font-medium">Role:</span> {user.role}
          </p>
          <p>
            <span className="font-medium">Divisi:</span> {user.divisi}
          </p>
        </div>
      )}
    </div>
  )
}
