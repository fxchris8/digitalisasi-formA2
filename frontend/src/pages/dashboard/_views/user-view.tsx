import { useAuth } from "@/contexts/auth.context"

export default function UserView() {
  const { user } = useAuth()

  if (!user) return null

  return (
    <div>
      <h1 className="text-4xl font-semibold">Halo, {user.full_name}!</h1>
      <p className="mt-3 text-muted-foreground">
        Anda login sebagai{" "}
        <span className="font-medium text-foreground">user</span>, sehingga Anda
        tidak memiliki hak akses apapun. Hubungi administrator untuk mendapatkan
        akses ke fitur yang tersedia.
      </p>
    </div>
  )
}
