import type { LucideIcon } from "lucide-react"
import { ClipboardList, FileText, Info, Users } from "lucide-react"
import { useEffect, useState } from "react"
import { toast } from "sonner"
import { getAdminStats } from "@/api/dashboard"
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
import type { AdminStats } from "@/types/dashboard"

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <span className="w-32 shrink-0 text-muted-foreground">{label}</span>
      <span className="font-medium break-all">{value}</span>
    </div>
  )
}

function SummaryCard({
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

function StatRow({
  label,
  value,
  colorClass,
  loading,
}: {
  label: string
  value: number
  colorClass: string
  loading: boolean
}) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm font-semibold ${colorClass}`}>
        {loading ? "—" : value}
      </span>
    </div>
  )
}

function BreakdownCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardContent>
        <p className="text-sm font-semibold text-gray-700 mb-3">{title}</p>
        {children}
      </CardContent>
    </Card>
  )
}

export default function AdminView() {
  const { user } = useAuth()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAdminStats()
      .then(setStats)
      .catch(() => toast.error("Gagal memuat statistik dashboard"))
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

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Total Pengguna"
          value={s?.users.total ?? 0}
          loading={loading}
          icon={Users}
          iconBg="bg-red-100"
          iconColor="text-red-600"
        />
        <SummaryCard
          label="Total Form CR9"
          value={s?.form_cr9.total ?? 0}
          loading={loading}
          icon={ClipboardList}
          iconBg="bg-red-100"
          iconColor="text-red-600"
        />
        <SummaryCard
          label="Total Form A2"
          value={s?.form_a2.total ?? 0}
          loading={loading}
          icon={FileText}
          iconBg="bg-red-100"
          iconColor="text-red-600"
        />
      </div>

      {/* Breakdown cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <BreakdownCard title="Pengguna per Role">
          <StatRow
            label="Admin"
            value={s?.users.admin ?? 0}
            colorClass="text-purple-600"
            loading={loading}
          />
          <StatRow
            label="Manager"
            value={s?.users.manager ?? 0}
            colorClass="text-blue-600"
            loading={loading}
          />
          <StatRow
            label="Staff"
            value={s?.users.staff ?? 0}
            colorClass="text-green-600"
            loading={loading}
          />
          <StatRow
            label="User"
            value={s?.users.user ?? 0}
            colorClass="text-gray-500"
            loading={loading}
          />
        </BreakdownCard>

        <BreakdownCard title="Form CR9 per Status">
          <StatRow
            label="Draft"
            value={s?.form_cr9.draft ?? 0}
            colorClass="text-gray-500"
            loading={loading}
          />
          <StatRow
            label="Submitted"
            value={s?.form_cr9.submitted ?? 0}
            colorClass="text-blue-600"
            loading={loading}
          />
        </BreakdownCard>

        <BreakdownCard title="Form A2 per Status">
          <StatRow
            label="Draft"
            value={s?.form_a2.draft ?? 0}
            colorClass="text-gray-500"
            loading={loading}
          />
          <StatRow
            label="Submitted"
            value={s?.form_a2.submitted ?? 0}
            colorClass="text-blue-600"
            loading={loading}
          />
          <StatRow
            label="Pending"
            value={s?.form_a2.pending ?? 0}
            colorClass="text-yellow-600"
            loading={loading}
          />
          <StatRow
            label="Revisi"
            value={s?.form_a2.revision ?? 0}
            colorClass="text-orange-600"
            loading={loading}
          />
          <StatRow
            label="Disetujui"
            value={s?.form_a2.approved ?? 0}
            colorClass="text-green-600"
            loading={loading}
          />
          <StatRow
            label="Ditolak"
            value={s?.form_a2.rejected ?? 0}
            colorClass="text-red-600"
            loading={loading}
          />
        </BreakdownCard>
      </div>
    </div>
  )
}
