import { AlertTriangle } from "lucide-react"
import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router"
import { toast } from "sonner"
import { getFormA2, submitFormA2 } from "@/api/form-a2"
import { getFormCr9 } from "@/api/form-cr9"
import { A2Timeline } from "@/components/form-a2/a2-timeline"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAuth } from "@/contexts/auth.context"
import { formatDateTime, formatRupiah } from "@/lib/format"
import { ROLES } from "@/lib/rbac"
import type { FormA2Status, FormA2WithDetails } from "@/types/form-a2"
import type { FormCr9 } from "@/types/form-cr9"

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  FormA2Status,
  { label: string; className: string }
> = {
  draft: { label: "Draft", className: "bg-gray-100 text-gray-700" },
  submitted: { label: "Diajukan", className: "bg-blue-100 text-blue-700" },
  pending: { label: "Pending", className: "bg-yellow-100 text-yellow-700" },
  revision: { label: "Revisi", className: "bg-orange-100 text-orange-700" },
  approved: { label: "Disetujui", className: "bg-green-100 text-green-700" },
  rejected: { label: "Ditolak", className: "bg-red-100 text-red-700" },
}

function StatusBadge({ status }: { status: FormA2Status }) {
  const cfg = STATUS_CONFIG[status] ?? {
    label: status,
    className: "bg-gray-100 text-gray-600",
  }
  return <Badge className={cfg.className}>{cfg.label}</Badge>
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FormA2DetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [form, setForm] = useState<FormA2WithDetails | null>(null)
  const [cr9, setCr9] = useState<FormCr9 | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const canManage =
    user?.role === ROLES.ADMIN ||
    (user?.role === ROLES.STAFF && user?.department === "spm")

  const canEdit =
    canManage && (form?.status === "draft" || form?.status === "revision")

  useEffect(() => {
    if (!id) return
    setLoading(true)
    getFormA2(id)
      .then(async (a2) => {
        setForm(a2)
        try {
          const linkedCr9 = await getFormCr9(a2.form_cr9_id)
          setCr9(linkedCr9)
        } catch {
          // CR9 load failure is non-fatal — show A2 data without CR9 extras
        }
      })
      .catch(() => toast.error("Gagal memuat Form A2"))
      .finally(() => setLoading(false))
  }, [id])

  async function handleSubmit() {
    if (!id) return
    setSubmitting(true)
    try {
      await submitFormA2(id)
      setConfirmOpen(false)
      toast.success("Form A2 berhasil diajukan ke Manager Nautica")
      const updated = await getFormA2(id)
      setForm(updated)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal mengajukan Form A2",
      )
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="py-20 text-center text-sm text-muted-foreground">
        Memuat data...
      </div>
    )
  }

  if (!form) {
    return (
      <div className="py-20 text-center text-sm text-muted-foreground">
        Form A2 tidak ditemukan.
      </div>
    )
  }

  const totalDetail = form.details.reduce((sum, d) => sum + Number(d.amount), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold text-gray-900">
            Detail Form A2
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">{form.form_number}</p>
        </div>

        <div className="flex gap-2 shrink-0">
          {canEdit && (
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={() => navigate(`/form-a2/${form.id}/edit`)}
            >
              Edit
            </Button>
          )}
          {canEdit && (
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={submitting}
              onClick={() => setConfirmOpen(true)}
            >
              Ajukan ke Manager Nautica
            </Button>
          )}
        </div>
      </div>

      {/* Info Form */}
      <Card>
        <CardHeader>
          <CardTitle>Informasi Form A2</CardTitle>
          <CardDescription>Detail informasi form A2</CardDescription>
        </CardHeader>
        <CardContent>
          <dl>
            <InfoRow label="Nomor Form A2" value={form.form_number} />
            <InfoRow
              label="Nomor Form CR9"
              value={
                <button
                  type="button"
                  className="text-blue-600 hover:underline"
                  onClick={() => navigate(`/form-cr9/${form.form_cr9_id}`)}
                >
                  {form.cr9_form_number}
                </button>
              }
            />
            <InfoRow
              label="Status A2"
              value={<StatusBadge status={form.status} />}
            />
            <InfoRow label="Cabang" value={form.branch_office} />
            <InfoRow
              label="Tanggal CR9 Diajukan"
              value={
                form.submitted_at
                  ? formatDateTime(form.submitted_at)
                  : undefined
              }
            />
            <InfoRow
              label="Tanggal Pengajuan ke Manager"
              value={
                form.submitted_to_manager_at
                  ? formatDateTime(form.submitted_to_manager_at)
                  : undefined
              }
            />
          </dl>
        </CardContent>
      </Card>

      {/* Data Seaman (dari CR9) */}
      <Card>
        <CardHeader>
          <CardTitle>Detail Pemohon</CardTitle>
          <CardDescription>Detail pemohon/crew dari form CR9</CardDescription>
        </CardHeader>
        <CardContent>
          <dl>
            <InfoRow label="Seafarer Code" value={cr9?.seafarer_code} />
            <InfoRow label="Seaman Code" value={form.seaman_code} />
            <InfoRow label="Seaman Name" value={form.seaman_name} />
            <InfoRow label="Jabatan" value={cr9?.position} />
            <InfoRow label="Kapal" value={form.ship} />
            <InfoRow label="Keluhan (CR9)" value={cr9?.complaint} />
            <InfoRow
              label="Jumlah Biaya (CR9)"
              value={cr9 ? formatRupiah(cr9.amount) : "-"}
            />
            <InfoRow
              label="Diagnosis (A2)"
              value={
                form.diagnosis || (
                  <span className="text-muted-foreground italic font-normal">
                    Belum diisi
                  </span>
                )
              }
            />
          </dl>
        </CardContent>
      </Card>

      {/* Detail Biaya */}
      <Card>
        <CardHeader>
          <CardTitle>Detail Biaya</CardTitle>
          <CardDescription>
            Rincian biaya yang diajukan di form A2
          </CardDescription>
        </CardHeader>
        <CardContent>
          {form.details.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground italic">
              Belum ada uraian biaya.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="w-10">No</TableHead>
                  <TableHead>Uraian</TableHead>
                  <TableHead>Nama RS</TableHead>
                  <TableHead>Kategori RS</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {form.details.map((d, i) => (
                  <TableRow key={d.id}>
                    <TableCell className="text-center text-muted-foreground">
                      {i + 1}
                    </TableCell>
                    <TableCell>{d.description}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {d.hospital_name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {d.hospital_category}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatRupiah(d.amount)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/30 font-semibold">
                  <TableCell colSpan={4} className="text-right">
                    Total
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatRupiah(totalDetail)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dokumen */}
      <Card>
        <CardHeader>
          <CardTitle>Dokumen Pendukung</CardTitle>
          <CardDescription>Dokumen terkait form CR9 dan A2</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <FileCard label="Dokumen CR9" storedPath={cr9?.cr9_url ?? null} />
              {cr9?.cr9_url_added_at && (
                <p className="text-xs text-muted-foreground px-1">
                  Diunggah pada {formatDateTime(cr9.cr9_url_added_at)}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <FileCard
                label="Kwitansi"
                storedPath={cr9?.receipt_url ?? null}
              />
              {cr9?.receipt_url_added_at && (
                <p className="text-xs text-muted-foreground px-1">
                  Diunggah pada {formatDateTime(cr9.receipt_url_added_at)}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <FileCard
                label="Berita Acara"
                storedPath={form.news_url ?? null}
              />
              {form.news_added_at && (
                <p className="text-xs text-muted-foreground px-1">
                  Diunggah pada {formatDateTime(form.news_added_at)}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline Pengajuan */}
      <Card>
        <CardHeader>
          <CardTitle>Timeline Pengajuan</CardTitle>
          <CardDescription>
            Riwayat alur pengajuan dari CR9 hingga persetujuan akhir
          </CardDescription>
        </CardHeader>
        <CardContent>
          <A2Timeline form={form} cr9={cr9} />
        </CardContent>
      </Card>

      {/* Confirm submit dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-lg text-center">
          <DialogHeader className="items-center">
            <AlertTriangle className="h-14 w-14 text-green-600 mb-2" />
            <DialogTitle>Ajukan Form A2?</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin mengajukan form ini ke Manager SPM? Form
              tidak dapat diedit setelah diajukan.
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
