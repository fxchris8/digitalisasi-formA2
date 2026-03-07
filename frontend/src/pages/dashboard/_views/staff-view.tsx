import type { LucideIcon } from "lucide-react"
import {
  CheckCircle,
  ClipboardList,
  Info,
  RotateCcw,
  Send,
  XCircle,
} from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { getBranchStats } from "@/api/dashboard"
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
import type { BranchStats } from "@/types/dashboard"

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

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
      {children}
    </p>
  )
}

export default function StaffView() {
  const { user } = useAuth()
  const [stats, setStats] = useState<BranchStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getBranchStats()
      .then(setStats)
      .catch(() => toast.error("Gagal memuat statistik cabang"))
      .finally(() => setLoading(false))
  }, [])

  if (!user) return null

  const s = stats

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
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

      {/* Form CR9 */}
      <div className="space-y-3">
        <SectionLabel>Form CR9</SectionLabel>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatCard
            label="Draft"
            value={s?.form_cr9.draft ?? 0}
            loading={loading}
            icon={ClipboardList}
            iconBg="bg-red-100"
            iconColor="text-red-600"
          />
          <StatCard
            label="Diajukan"
            value={s?.form_cr9.submitted ?? 0}
            loading={loading}
            icon={Send}
            iconBg="bg-red-100"
            iconColor="text-red-600"
          />
        </div>
      </div>

      {/* Form A2 */}
      <div className="space-y-3">
        <SectionLabel>Form A2</SectionLabel>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Disetujui"
            value={s?.form_a2.approved ?? 0}
            loading={loading}
            icon={CheckCircle}
            iconBg="bg-red-100"
            iconColor="text-red-600"
          />
          <StatCard
            label="Revisi"
            value={s?.form_a2.revision ?? 0}
            loading={loading}
            icon={RotateCcw}
            iconBg="bg-red-100"
            iconColor="text-red-600"
          />
          <StatCard
            label="Ditolak"
            value={s?.form_a2.rejected ?? 0}
            loading={loading}
            icon={XCircle}
            iconBg="bg-red-100"
            iconColor="text-red-600"
          />
        </div>
      </div>
    </div>
  )
}
