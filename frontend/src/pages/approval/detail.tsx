import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router"
import { toast } from "sonner"
import {
  approveFormA2,
  rejectFormA2,
  requestRevisionFormA2,
} from "@/api/approval"
import { getFormA2 } from "@/api/form-a2"
import { getFormCr9 } from "@/api/form-cr9"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/contexts/auth.context"
import { formatDateTime, formatRupiah } from "@/lib/format"
import { getManagerStep } from "@/lib/rbac"
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

export default function ApprovalDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [form, setForm] = useState<FormA2WithDetails | null>(null)
  const [cr9, setCr9] = useState<FormCr9 | null>(null)
  const [loading, setLoading] = useState(true)

  const [approveOpen, setApproveOpen] = useState(false)
  const [revisionOpen, setRevisionOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [actionNotes, setActionNotes] = useState("")
  const [actionPercentage, setActionPercentage] = useState("")
  const [acting, setActing] = useState(false)

  const myStep = user ? getManagerStep(user) : null
  const canApprove =
    myStep !== null &&
    form?.status === "pending" &&
    form?.current_step === myStep

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
          // non-fatal
        }
      })
      .catch(() => toast.error("Gagal memuat Form A2"))
      .finally(() => setLoading(false))
  }, [id])

  const pct = Number(actionPercentage)
  const pctValid =
    actionPercentage !== "" && !Number.isNaN(pct) && pct >= 0 && pct <= 100

  async function handleApprove() {
    if (!id || !pctValid) return
    setActing(true)
    try {
      await approveFormA2(id, { percentage: pct })
      setApproveOpen(false)
      toast.success("Form A2 berhasil disetujui")
      navigate("/approval")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyetujui form")
    } finally {
      setActing(false)
    }
  }

  async function handleRevision() {
    if (!id || !actionNotes.trim()) return
    setActing(true)
    try {
      await requestRevisionFormA2(id, { notes: actionNotes })
      setRevisionOpen(false)
      toast.success("Revisi berhasil diajukan")
      navigate("/approval")
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal mengajukan revisi",
      )
    } finally {
      setActing(false)
    }
  }

  async function handleReject() {
    if (!id || !actionNotes.trim()) return
    setActing(true)
    try {
      await rejectFormA2(id, { notes: actionNotes })
      setRejectOpen(false)
      toast.success("Form A2 berhasil ditolak")
      navigate("/approval")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menolak form")
    } finally {
      setActing(false)
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

  if (!canApprove) {
    return (
      <div className="py-20 text-center text-sm text-muted-foreground">
        Form ini tidak dalam antrian approval Anda.
      </div>
    )
  }

  const totalDetail = form.details.reduce((sum, d) => sum + Number(d.amount), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-semibold text-gray-900">Cek Pengajuan</h1>
        <p className="mt-0.5 text-sm text-gray-500">{form.form_number}</p>
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
            <InfoRow label="Nomor Form CR9" value={form.cr9_form_number} />
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

      {/* Data Seaman */}
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

      {/* Action Buttons */}
      <div className="flex justify-end gap-2 py-4">
        <Button
          size="lg"
          className="bg-red-600 hover:bg-red-700 text-white"
          onClick={() => {
            setActionNotes("")
            setActionPercentage("")
            setRejectOpen(true)
          }}
        >
          Tolak
        </Button>
        <Button
          size="lg"
          className="bg-amber-500 hover:bg-amber-600 text-white"
          onClick={() => {
            setActionNotes("")
            setActionPercentage("")
            setRevisionOpen(true)
          }}
        >
          Revisi
        </Button>
        <Button
          size="lg"
          className="bg-green-600 hover:bg-green-700 text-white"
          onClick={() => {
            setActionPercentage("")
            setApproveOpen(true)
          }}
        >
          Terima
        </Button>
      </div>

      {/* Dialog: Terima */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Setujui Form A2?</DialogTitle>
            <DialogDescription>
              Tindakan ini tidak dapat dibatalkan. Form akan diteruskan ke tahap
              berikutnya.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="approve-percentage">
                Persentase <span className="text-red-500">*</span>
              </Label>
              <Input
                id="approve-percentage"
                type="number"
                min={0}
                max={100}
                placeholder="0 – 100"
                value={actionPercentage}
                onChange={(e) => setActionPercentage(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="approve-notes">Catatan</Label>
              <Textarea
                id="approve-notes"
                placeholder={`Catatan bersifat opsional.`}
                rows={3}
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setApproveOpen(false)}
              disabled={acting}
            >
              Batal
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={handleApprove}
              disabled={acting || !pctValid}
            >
              {acting ? "Memproses..." : "Ya, Terima"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Revisi */}
      <Dialog open={revisionOpen} onOpenChange={setRevisionOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Ajukan Revisi?</DialogTitle>
            <DialogDescription>
              Form akan dikembalikan ke staff SPM untuk diperbaiki.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="revision-notes">
              Catatan Revisi <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="revision-notes"
              placeholder="Tuliskan hal yang perlu diperbaiki..."
              rows={4}
              value={actionNotes}
              onChange={(e) => setActionNotes(e.target.value)}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setRevisionOpen(false)}
              disabled={acting}
            >
              Batal
            </Button>
            <Button
              className="bg-amber-500 hover:bg-amber-600 text-white"
              onClick={handleRevision}
              disabled={acting || !actionNotes.trim()}
            >
              {acting ? "Memproses..." : "Ya, Ajukan Revisi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Tolak */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader className="text-center">
            <DialogTitle>Tolak Form A2?</DialogTitle>
            <DialogDescription>
              Tindakan ini tidak dapat dibatalkan. Form akan ditolak secara
              permanen.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-notes">
              Alasan Penolakan <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="reject-notes"
              placeholder="Tuliskan alasan penolakan..."
              rows={4}
              value={actionNotes}
              onChange={(e) => setActionNotes(e.target.value)}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setRejectOpen(false)}
              disabled={acting}
            >
              Batal
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleReject}
              disabled={acting || !actionNotes.trim()}
            >
              {acting ? "Memproses..." : "Ya, Tolak"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
