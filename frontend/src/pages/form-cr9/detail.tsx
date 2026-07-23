import { AlertTriangle, Info } from "lucide-react"
import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router"
import { toast } from "sonner"
import { getFormA2ByCr9Id } from "@/api/form-a2"
import { getFormCr9, submitFormCr9 } from "@/api/form-cr9"
import { Cr9Timeline } from "@/components/form-cr9/cr9-timeline"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { FileCard } from "@/components/ui/file-card"
import { InfoRow } from "@/components/ui/info-row"
import { useAuth } from "@/contexts/auth.context"
import { formatDateTime, formatRupiah } from "@/lib/format"
import { ROLES } from "@/lib/rbac"
import { ROUTES } from "@/routes/config"
import type { FormA2WithDetails } from "@/types/form-a2"
import type { FormCr9, FormCr9Status } from "@/types/form-cr9"

// Status badge
const STATUS_CONFIG: Record<
  FormCr9Status,
  { label: string; className: string }
> = {
  draft: { label: "Draft", className: "bg-gray-100 text-gray-600" },
  submitted: { label: "Diajukan", className: "bg-blue-100 text-blue-700" },
  approved: { label: "Disetujui", className: "bg-green-100 text-green-700" },
  rejected: { label: "Ditolak", className: "bg-red-100 text-red-700" },
}

// Status badge component
function StatusBadge({ status }: { status: FormCr9Status }) {
  const cfg = STATUS_CONFIG[status] ?? {
    label: status,
    className: "bg-gray-100 text-gray-600",
  }
  return <Badge className={cfg.className}>{cfg.label}</Badge>
}

// Page component
export default function FormCr9DetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState<FormCr9 | null>(null)
  const [a2, setA2] = useState<FormA2WithDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const canManage =
    user?.role === ROLES.ADMIN ||
    (user?.role === ROLES.STAFF &&
      (user?.department === "cabang" || user?.department === "spm"))

  const canEdit =
    canManage && (form?.status === "draft" || form?.needs_cabang_revision)
  const canSubmit = canManage && form?.status === "draft"

  async function handleSubmit() {
    if (!id) return
    setSubmitting(true)
    try {
      await submitFormCr9(id)
      setConfirmOpen(false)
      toast.success("Form CR9 berhasil diajukan ke SPM")
      const [cr9, formA2] = await Promise.all([
        getFormCr9(id),
        getFormA2ByCr9Id(id).catch(() => null),
      ])
      setForm(cr9)
      setA2(formA2)
    } catch {
      toast.error("Gagal mengajukan Form CR9")
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    if (!id) return
    Promise.all([getFormCr9(id), getFormA2ByCr9Id(id).catch(() => null)])
      .then(([cr9, formA2]) => {
        setForm(cr9)
        setA2(formA2)
      })
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
        <div>
          <h1 className="text-4xl font-semibold text-gray-900">
            Detail Form CR9
          </h1>
          <p className="mt-0.5 text-sm font-mono text-gray-500">
            {form.form_number}
          </p>
        </div>
        {(canEdit || canSubmit) && (
          <div className="flex items-center gap-2">
            {canEdit && (
              <Button
                onClick={() => navigate(`/form-cr9/${form.id}/edit`)}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                Edit
              </Button>
            )}
            {canSubmit && (
              <Button
                onClick={() => setConfirmOpen(true)}
                disabled={submitting}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Ajukan ke SPM
              </Button>
            )}
          </div>
        )}
      </div>

      {form.needs_cabang_revision && (
        <div className="flex items-start gap-3 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
          <Info className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">
              Staff SPM meminta revisi data kelengkapan
            </p>
            {form.revision_notes && (
              <p className="mt-0.5 text-orange-700">
                Catatan: {form.revision_notes}
              </p>
            )}
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Informasi CR9</CardTitle>
          <CardDescription>Detail informasi form CR9</CardDescription>
        </CardHeader>
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
              value={formatDateTime(form.created_at)}
            />
            {form.submitted_at && (
              <InfoRow
                label="Tanggal Diajukan"
                value={formatDateTime(form.submitted_at)}
              />
            )}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detail Pemohon</CardTitle>
          <CardDescription>Detail pemohon/crew dari form CR9</CardDescription>
        </CardHeader>
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
        <CardHeader>
          <CardTitle>Dokumen Pendukung</CardTitle>
          <CardDescription>Dokumen pendukung untuk form CR9</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <FileCard label="Dokumen CR9" storedPath={form.cr9_url} />
              {form.cr9_url_added_at && (
                <p className="text-xs text-muted-foreground px-1">
                  Diunggah pada {formatDateTime(form.cr9_url_added_at)}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <FileCard label="Kwitansi" storedPath={form.receipt_url} />
              {form.receipt_url_added_at && (
                <p className="text-xs text-muted-foreground px-1">
                  Diunggah pada {formatDateTime(form.receipt_url_added_at)}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Timeline Pengajuan</CardTitle>
          <CardDescription>
            Riwayat alur pengajuan dari CR9 hingga persetujuan akhir
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Cr9Timeline form={form} a2={a2} />
        </CardContent>
      </Card>

      {/* Confirm submit dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-lg text-center">
          <DialogHeader className="items-center">
            <AlertTriangle className="h-14 w-14 text-green-600 mb-2" />
            <DialogTitle>Ajukan Form CR9?</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin mengajukan form ini ke SPM? Form tidak
              dapat diedit setelah diajukan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="justify-center sm:justify-center gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={submitting}
            >
              Batal
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {submitting ? "Mengajukan..." : "Ya, Ajukan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
