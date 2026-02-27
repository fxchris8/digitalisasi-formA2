import { ShieldOff } from "lucide-react"
import { useNavigate } from "react-router"
import { Button } from "@/components/ui/button"

export default function ForbiddenPage() {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
      <ShieldOff className="h-16 w-16 text-red-600" />
      <h1 className="text-3xl font-bold">403 - Akses Ditolak</h1>
      <p className="text-muted-foreground">
        Anda tidak memiliki izin untuk mengakses halaman ini.
      </p>
      <Button onClick={() => navigate(-1)}>Kembali</Button>
    </div>
  )
}
