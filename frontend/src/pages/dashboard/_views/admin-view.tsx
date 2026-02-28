import { Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useAuth } from "@/contexts/auth.context"

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="w-32 shrink-0 text-muted-foreground">{label}</span>
      <span className="font-medium break-all">{value}</span>
    </div>
  )
}

export default function AdminView() {
  const { user } = useAuth()

  if (!user) return null

  return (
    <div>
      <div className="flex items-center gap-4">
        <h1 className="text-4xl font-semibold">Halo, {user.full_name}!</h1>

        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="bg-blue-100 text-blue-500 hover:bg-blue-200 hover:text-blue-500"
            >
              <Info size={20} />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Informasi Akun</DialogTitle>
            </DialogHeader>
            <div className="mt-2 space-y-3 text-sm">
              <Row label="ID" value={user.id} />
              <Row label="Nama Lengkap" value={user.full_name} />
              <Row label="Username" value={user.username} />
              <Row label="Email" value={user.email} />
              <Row label="Role" value={user.role} />
              <Row label="Department" value={user.department ?? "-"} />
              <Row label="Kantor Cabang" value={user.branch_office ?? "-"} />
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Konten spesifik admin — tambahkan di sini */}
    </div>
  )
}
