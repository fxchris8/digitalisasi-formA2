import type { LucideIcon } from "lucide-react"
import {
  CheckCircle,
  Clock,
  Info,
  RotateCcw,
  Send,
  XCircle,
} from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { getManagerStats } from "@/api/dashboard"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { useAuth } from "@/contexts/auth.context"
import { getManagerStep } from "@/lib/rbac"
import type { ManagerStats } from "@/types/dashboard"

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="w-32 shrink-0 text-muted-foreground">{label}</span>
      <span className="font-medium break-all">{value}</span>
    </div>
  )
}

function StatCard({
  label,
  value,
  loading,
  icon: Icon,
  iconBg,
  iconColor,
}: {
  label: string
  value: number
  loading: boolean
  icon: LucideIcon
  iconBg: string
  iconColor: string
}) {
  return (
    <Card>
      <CardContent>
        <div className="flex items-start gap-4">
          <div
            className={`w-16 h-16 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}
          >
            <Icon size={24} className={iconColor} />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-1 text-4xl font-bold text-gray-900">
              {loading ? "—" : value}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function GeneralView() {
  const { user } = useAuth()
  const step = user ? getManagerStep(user) : null

  const [stats, setStats] = useState<ManagerStats | null>(null)
  const [loading, setLoading] = useState(!!step)

  useEffect(() => {
    if (!step) return
    getManagerStats()
      .then(setStats)
      .catch(() => toast.error("Gagal memuat statistik dashboard"))
      .finally(() => setLoading(false))
  }, [step])

  if (!user) return null

  const s = stats

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-4xl font-semibold">Halo, {user.full_name}!</h1>
        </div>

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
              <InfoRow label="ID" value={user.id} />
              <InfoRow label="Nama Lengkap" value={user.full_name} />
              <InfoRow label="Username" value={user.username} />
              <InfoRow label="Email" value={user.email} />
              <InfoRow label="Role" value={user.role} />
              <InfoRow label="Department" value={user.department ?? "-"} />
              <InfoRow
                label="Kantor Cabang"
                value={user.branch_office ?? "-"}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stat cards — hanya tampil jika user adalah approver */}
      {step && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            label="Total Diajukan"
            value={s?.submitted ?? 0}
            loading={loading}
            icon={Send}
            iconBg="bg-red-100"
            iconColor="text-red-600"
          />
          <StatCard
            label="Butuh Approval"
            value={s?.pending ?? 0}
            loading={loading}
            icon={Clock}
            iconBg="bg-red-100"
            iconColor="text-red-600"
          />
          <StatCard
            label="Diterima"
            value={s?.approved ?? 0}
            loading={loading}
            icon={CheckCircle}
            iconBg="bg-red-100"
            iconColor="text-red-600"
          />
          <StatCard
            label="Direvisi"
            value={s?.revision ?? 0}
            loading={loading}
            icon={RotateCcw}
            iconBg="bg-red-100"
            iconColor="text-red-600"
          />
          <StatCard
            label="Ditolak"
            value={s?.rejected ?? 0}
            loading={loading}
            icon={XCircle}
            iconBg="bg-red-100"
            iconColor="text-red-600"
          />
        </div>
      )}
    </div>
  )
}
