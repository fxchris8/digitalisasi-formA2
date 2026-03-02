import { Pencil } from "lucide-react"
import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router"
import { toast } from "sonner"
import { getFormCr9 } from "@/api/form-cr9"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { FileCard } from "@/components/ui/file-card"
import { useAuth } from "@/contexts/auth.context"
import { formatRupiah } from "@/lib/format"
import { ROLES } from "@/lib/rbac"
import { ROUTES } from "@/routes/config"
import type { FormCr9, FormCr9Status } from "@/types/form-cr9"

const STATUS_CONFIG: Record<
  FormCr9Status,
  { label: string; className: string }
> = {
  draft: { label: "Draft", className: "bg-gray-100 text-gray-600" },
  submitted: { label: "Diajukan", className: "bg-blue-100 text-blue-700" },
  approved: { label: "Disetujui", className: "bg-green-100 text-green-700" },
  rejected: { label: "Ditolak", className: "bg-red-100 text-red-700" },
}

function StatusBadge({ status }: { status: FormCr9Status }) {
  const cfg = STATUS_CONFIG[status] ?? {
    label: status,
    className: "bg-gray-100 text-gray-600",
  }
  return <Badge className={cfg.className}>{cfg.label}</Badge>
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:gap-4 py-2.5 border-b last:border-0">
      <dt className="text-sm text-muted-foreground w-44 shrink-0">{label}</dt>
      <dd className="text-sm font-medium text-gray-900 mt-0.5 sm:mt-0">
        {value}
      </dd>
    </div>
  )
}

export default function FormCr9DetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState<FormCr9 | null>(null)
  const [loading, setLoading] = useState(true)

  const canEdit =
    (user?.role === ROLES.ADMIN ||
      (user?.role === ROLES.STAFF &&
        (user?.department === "cabang" || user?.department === "spm"))) &&
    form?.status !== "approved"

  useEffect(() => {
    if (!id) return
    getFormCr9(id)
      .then(setForm)
      .catch(() => {
        toast.error("Gagal memuat Form CR9")
        navigate(ROUTES.formCr9.path)
      })
      .finally(() => setLoading(false))
  }, [id, navigate])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
        Memuat data...
      </div>
    )
  }

  if (!form) return null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-4xl font-semibold text-gray-900">
              Detail Form CR9
            </h1>
            <p className="mt-0.5 text-sm font-mono text-gray-500">
              {form.form_number}
            </p>
          </div>
        </div>
        {canEdit && (
          <Button
            variant="outline"
            onClick={() => navigate(`/form-cr9/${form.id}/edit`)}
          >
            <Pencil size={15} className="mr-2" />
            Edit
          </Button>
        )}
      </div>

      <Card>
        <CardContent>
          <dl>
            <InfoRow label="Nomor Surat" value={form.form_number} />
            <InfoRow
              label="Status"
              value={<StatusBadge status={form.status} />}
            />
            <InfoRow label="Cabang" value={form.branch_office} />
            <InfoRow label="Dibuat Oleh" value={form.creator_name} />
            <InfoRow
              label="Tanggal Dibuat"
              value={new Date(form.created_at).toLocaleDateString("id-ID", {
                day: "2-digit",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            />
            {form.submitted_at && (
              <InfoRow
                label="Tanggal Diajukan"
                value={new Date(form.submitted_at).toLocaleDateString("id-ID", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              />
            )}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <dl>
            <InfoRow label="Seafarer Code" value={form.seafarer_code} />
            <InfoRow label="Seaman Code" value={form.seaman_code} />
            <InfoRow label="Seaman Name" value={form.seaman_name} />
            <InfoRow label="Jabatan" value={form.position} />
            <InfoRow label="Kapal" value={form.ship} />
            <InfoRow label="Jenis Keluhan" value={form.complaint} />
            <InfoRow label="Jumlah Biaya" value={formatRupiah(form.amount)} />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4">
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FileCard label="Dokumen CR9" storedPath={form.cr9_url} />
              <FileCard label="Kwitansi" storedPath={form.receipt_url} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
