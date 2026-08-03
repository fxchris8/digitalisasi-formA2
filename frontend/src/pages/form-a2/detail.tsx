import { AlertTriangle, Download, Info } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router"
import { toast } from "sonner"
import {
  approveFormA2,
  rejectFormA2,
  requestRevisionFormA2,
  resolveNominalRevisionFormA2,
} from "@/api/approval"
import {
  exportFormA2Pdf,
  getFormA2,
  requestCabangRevision,
  submitFormA2,
} from "@/api/form-a2"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
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
import { getManagerStep, ROLES } from "@/lib/rbac"
import type {
  ApprovalStep,
  FormA2Status,
  FormA2WithDetails,
  RevisionTargetRole,
} from "@/types/form-a2"
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

const STEP_LABEL: Record<ApprovalStep, string> = {
  spm: "Manager SPM",
  nautica: "Manager Nautica",
  finance: "Finance",
}

function StatusBadge({ status }: { status: FormA2Status }) {
  const cfg = STATUS_CONFIG[status] ?? {
    label: status,
    className: "bg-gray-100 text-gray-600",
  }
  return <Badge className={cfg.className}>{cfg.label}</Badge>
}

/**
 * Preset persentase yang disarankan, tergantung step approver:
 * - Nautica → dihitung dari kategori rumah sakit (swasta 50% / pemerintah 100%)
 * - SPM/Finance → mengikuti nominal yang sudah disetujui step sebelumnya (ACC)
 */
function getCalculatedPreset(
  step: ApprovalStep,
  form: FormA2WithDetails,
): { value: string; label: string } | null {
  if (step === "nautica") {
    const category = form.details[0]?.hospital_category
    if (!category) return null
    const value = category === "pemerintah" ? "100" : "50"
    const categoryLabel = category === "pemerintah" ? "Pemerintah" : "Swasta"
    return { value, label: `Sesuai Kalkulasi (${categoryLabel} ${value}%)` }
  }

  const prevStepName: ApprovalStep = step === "spm" ? "nautica" : "spm"
  const prevLog = [...form.approval_logs]
    .reverse()
    .find((l) => l.step === prevStepName && l.status === "approved")
  if (!prevLog?.percentage) return null

  const pct = Number(prevLog.percentage)
  return {
    value: String(pct),
    label: `Setuju dengan ${STEP_LABEL[prevStepName]} (${pct}%)`,
  }
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

  // ── Approval action state ──────────────────────────────────────────────────
  const [approveOpen, setApproveOpen] = useState(false)
  const [revisionOpen, setRevisionOpen] = useState(false)
  const [rejectOpen, setRejectOpen] = useState(false)
  const [actionNotes, setActionNotes] = useState("")
  const [actionPercentage, setActionPercentage] = useState("")
  const [percentagePreset, setPercentagePreset] = useState<
    "calculated" | "custom"
  >("calculated")
  const [revisionTarget, setRevisionTarget] =
    useState<RevisionTargetRole>("staff_cabang")
  const [acting, setActing] = useState(false)

  // ── Selesaikan revisi nominal (manager Nautica/SPM) ────────────────────────
  const [resolveNominalOpen, setResolveNominalOpen] = useState(false)
  const [nominalPercentage, setNominalPercentage] = useState("")
  const [nominalNotes, setNominalNotes] = useState("")

  const [exportingPdf, setExportingPdf] = useState(false)

  // ── Revisi pra-chain (staff SPM kirim balik ke cabang, sebelum pernah
  // diajukan ke manager) ────────────────────────────────────────────────────
  const [cabangRevisionOpen, setCabangRevisionOpen] = useState(false)
  const [cabangRevisionNotes, setCabangRevisionNotes] = useState("")
  const [sendingCabangRevision, setSendingCabangRevision] = useState(false)

  const canManage =
    user?.role === ROLES.ADMIN ||
    (user?.role === ROLES.ADMIN_SPM && user?.department === "spm")

  const myStep = user ? getManagerStep(user) : null
  const canApprove =
    myStep !== null &&
    form?.status === "pending" &&
    form?.current_step === myStep

  const revisionWaitingOnCabang =
    form?.status === "revision" &&
    form.active_revision?.target_role === "staff_cabang"

  const canEdit =
    canManage &&
    !canApprove &&
    (form?.status === "draft" ||
      (form?.status === "revision" && !revisionWaitingOnCabang))

  // Admin SPM cuma bisa minta revisi ke cabang SEBELUM form pernah diajukan
  // ke manager sama sekali (masih draft, belum ada submitted_to_manager_at).
  const canRequestCabangRevision =
    canManage && form?.status === "draft" && !form.submitted_to_manager_at

  // Revisi nominal — manager Nautica/SPM menyelesaikan revisi nominal yang
  // diminta step SETELAHnya (SPM minta ke Nautica, Finance minta ke SPM).
  const expectedNominalRevisionTarget: RevisionTargetRole | null =
    myStep === "nautica"
      ? "manager_nautica"
      : myStep === "spm"
        ? "manager_spm"
        : null
  const canResolveNominalRevision =
    form?.status === "revision" &&
    expectedNominalRevisionTarget !== null &&
    form.active_revision?.target_role === expectedNominalRevisionTarget

  // Export PDF gabungan hanya tersedia setelah Finance approve penuh.
  const canExportPdf =
    form?.status === "approved" &&
    (user?.role === ROLES.ADMIN || user?.department === "finance")

  async function handleExportPdf() {
    if (!id || !form) return
    setExportingPdf(true)
    try {
      const blob = await exportFormA2Pdf(id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `A2-${form.form_number}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengekspor PDF")
    } finally {
      setExportingPdf(false)
    }
  }

  // Label tujuan pengajuan berikutnya — dinamis: pengajuan pertama selalu ke
  // Nautica, resubmit setelah revisi kembali ke step yang minta revisi.
  const nextStepLabel = !form
    ? STEP_LABEL.nautica
    : form.status === "draft"
      ? STEP_LABEL.nautica
      : form.active_revision
        ? STEP_LABEL[form.active_revision.step]
        : STEP_LABEL.nautica

  const loadDetail = useCallback(async () => {
    if (!id) return
    const a2 = await getFormA2(id)
    setForm(a2)
    // Data CR9 hanya pelengkap (dokumen & info pembuat) — progres timeline
    // sepenuhnya diambil dari data A2, jadi kegagalan di sini tidak membuat
    // timeline salah tampil.
    try {
      setCr9(await getFormCr9(a2.form_cr9_id))
    } catch {
      setCr9(null)
    }
  }, [id])

  useEffect(() => {
    if (!id) return
    setLoading(true)
    loadDetail()
      .catch(() => toast.error("Gagal memuat Form A2"))
      .finally(() => setLoading(false))
  }, [id, loadDetail])

  /** Muat ulang SELURUH data detail (A2 + CR9) setelah ada aksi approval. */
  async function refresh() {
    await loadDetail()
  }

  async function handleSubmit() {
    if (!id) return
    setSubmitting(true)
    try {
      await submitFormA2(id)
      setConfirmOpen(false)
      toast.success(`Form A2 berhasil diajukan ke ${nextStepLabel}`)
      await refresh()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal mengajukan Form A2",
      )
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRequestCabangRevision() {
    if (!id || !cabangRevisionNotes.trim()) return
    setSendingCabangRevision(true)
    try {
      await requestCabangRevision(id, { notes: cabangRevisionNotes })
      setCabangRevisionOpen(false)
      setCabangRevisionNotes("")
      toast.success("Revisi berhasil diajukan ke staff cabang")
      await refresh()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal mengajukan revisi",
      )
    } finally {
      setSendingCabangRevision(false)
    }
  }

  const pct = Number(actionPercentage)
  const pctValid =
    actionPercentage !== "" && !Number.isNaN(pct) && pct >= 0 && pct <= 100

  const cr9Amount = Number(form?.cr9_amount ?? 0)
  const approvedAmount = pctValid ? (cr9Amount * pct) / 100 : null

  const calculatedPreset =
    myStep && form ? getCalculatedPreset(myStep, form) : null

  // CR9 Reimbursement + kecelakaan kerja = persentase terkunci 100% di
  // setiap step approval, approver tidak bisa mengubahnya.
  const isWorkAccidentLocked =
    form?.cr9_type === "reimbursement" && !!form?.cr9_is_work_accident

  function openApproveDialog() {
    if (isWorkAccidentLocked) {
      setActionPercentage("100")
    } else if (calculatedPreset) {
      setPercentagePreset("calculated")
      setActionPercentage(calculatedPreset.value)
    } else {
      setPercentagePreset("custom")
      setActionPercentage("")
    }
    setActionNotes("")
    setApproveOpen(true)
  }

  function handlePresetChange(val: "calculated" | "custom") {
    setPercentagePreset(val)
    if (val === "calculated" && calculatedPreset) {
      setActionPercentage(calculatedPreset.value)
    } else {
      setActionPercentage("")
    }
  }

  async function handleApprove() {
    if (!id || !pctValid) return
    setActing(true)
    try {
      await approveFormA2(id, {
        percentage: pct,
        notes: actionNotes || undefined,
      })
      setApproveOpen(false)
      toast.success("Form A2 berhasil disetujui")
      await refresh()
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
      await requestRevisionFormA2(id, {
        notes: actionNotes,
        target: revisionTarget,
      })
      setRevisionOpen(false)
      toast.success("Revisi berhasil diajukan")
      await refresh()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal mengajukan revisi",
      )
    } finally {
      setActing(false)
    }
  }

  const nominalPct = Number(nominalPercentage)
  const nominalPctValid =
    nominalPercentage !== "" &&
    !Number.isNaN(nominalPct) &&
    nominalPct >= 0 &&
    nominalPct <= 100

  function openResolveNominalDialog() {
    if (isWorkAccidentLocked) {
      setNominalPercentage("100")
    } else {
      // Default: persentase yang sebelumnya disetujui manager ini sendiri
      // di step yang sama, sebelum revisi nominal diminta.
      const ownPriorLog = myStep
        ? [...(form?.approval_logs ?? [])]
            .reverse()
            .find((l) => l.step === myStep && l.status === "approved")
        : undefined
      setNominalPercentage(
        ownPriorLog?.percentage ? String(Number(ownPriorLog.percentage)) : "",
      )
    }
    setNominalNotes("")
    setResolveNominalOpen(true)
  }

  async function handleResolveNominalRevision() {
    if (!id || !nominalPctValid) return
    setActing(true)
    try {
      await resolveNominalRevisionFormA2(id, {
        percentage: nominalPct,
        notes: nominalNotes || undefined,
      })
      setResolveNominalOpen(false)
      toast.success("Revisi nominal berhasil diselesaikan")
      await refresh()
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Gagal menyelesaikan revisi nominal",
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
      await refresh()
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

        {(canEdit || canRequestCabangRevision || canExportPdf) && (
          <div className="flex gap-2 shrink-0">
            {canExportPdf && (
              <Button
                variant="outline"
                className="gap-1.5"
                disabled={exportingPdf}
                onClick={handleExportPdf}
              >
                <Download className="size-4" />
                {exportingPdf ? "Mengekspor..." : "Export PDF"}
              </Button>
            )}
            {canRequestCabangRevision && (
              <Button
                variant="outline"
                className="border-orange-300 text-orange-700 hover:bg-orange-50"
                onClick={() => setCabangRevisionOpen(true)}
              >
                Kirim Revisi ke Cabang
              </Button>
            )}
            {canEdit && (
              <>
                <Button
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                  onClick={() => navigate(`/form-a2/${form.id}/edit`)}
                >
                  Edit
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white"
                  disabled={submitting}
                  onClick={() => setConfirmOpen(true)}
                >
                  Ajukan ke {nextStepLabel}
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Banner: menunggu revisi dari cabang */}
      {revisionWaitingOnCabang && (
        <div className="flex items-start gap-3 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
          <Info className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">
              Menunggu revisi data kelengkapan dari staff cabang
            </p>
            {form.active_revision?.notes && (
              <p className="mt-0.5 text-orange-700">
                Catatan: {form.active_revision.notes}
              </p>
            )}
            <button
              type="button"
              className="mt-1 text-orange-900 underline hover:no-underline"
              onClick={() => navigate(`/form-cr9/${form.form_cr9_id}/edit`)}
            >
              Buka Form CR9 untuk memperbaiki data →
            </button>
          </div>
        </div>
      )}

      {/* Banner: berita acara sudah ada tapi form belum diajukan ke manager */}
      {canEdit && form.status === "draft" && form.news_url && (
        <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <Info className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">
              Berita acara sudah diupload, tapi form belum diajukan
            </p>
            <p className="mt-0.5 text-blue-700">
              Klik tombol "Ajukan ke {nextStepLabel}" di atas supaya form masuk
              ke antrian approval.
            </p>
          </div>
        </div>
      )}

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
            <InfoRow
              label="Jenis CR9"
              value={
                form.cr9_type === "reimbursement"
                  ? "CR9 Reimbursement"
                  : "CR9 Perusahaan"
              }
            />
            {form.cr9_type === "reimbursement" && (
              <InfoRow
                label="Kecelakaan Kerja"
                value={
                  form.cr9_is_work_accident ? (
                    <Badge className="bg-amber-100 text-amber-800">
                      Ya — reimbursement 100% (terkunci)
                    </Badge>
                  ) : (
                    "Tidak"
                  )
                }
              />
            )}
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
            <InfoRow label="Diagnosis" value={form.diagnosis} />
          </dl>
        </CardContent>
      </Card>

      {/* Detail Biaya */}
      <Card>
        <CardHeader>
          <CardTitle>Detail Biaya</CardTitle>
          <CardDescription>
            Rincian biaya yang diajukan — {form.details[0]?.hospital_name}
            {form.details[0]?.hospital_category &&
              ` (${form.details[0].hospital_category})`}
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
                    <TableCell className="text-right font-mono">
                      {formatRupiah(d.amount)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/30 font-semibold">
                  <TableCell colSpan={2} className="text-right">
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
            {cr9?.receipts && cr9.receipts.length > 0 ? (
              cr9.receipts.map((r, i) => (
                <div key={r.id} className="space-y-1">
                  <FileCard
                    label={`Kwitansi ${cr9.receipts?.length === 1 ? "" : i + 1}`}
                    storedPath={r.storage_path}
                  />
                  <p className="text-xs text-muted-foreground px-1">
                    Diunggah pada {formatDateTime(r.added_at)}
                    {r.added_by_name && ` oleh ${r.added_by_name}`}
                  </p>
                </div>
              ))
            ) : (
              <div className="space-y-1">
                <FileCard label="Kwitansi" storedPath={null} />
              </div>
            )}
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

      {/* Aksi Approval — hanya tampil untuk approver di step saat ini */}
      {canApprove && (
        <div className="flex justify-end gap-2 py-4">
          <Button
            size="lg"
            className="bg-red-600 hover:bg-red-700 text-white"
            onClick={() => {
              setActionNotes("")
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
              setRevisionTarget("staff_cabang")
              setRevisionOpen(true)
            }}
          >
            Revisi
          </Button>
          <Button
            size="lg"
            className="bg-green-600 hover:bg-green-700 text-white"
            onClick={openApproveDialog}
          >
            Terima
          </Button>
        </div>
      )}

      {/* Aksi Selesaikan Revisi Nominal — manager Nautica/SPM yang jadi target */}
      {canResolveNominalRevision && (
        <div className="flex justify-end gap-2 py-4">
          <Button
            size="lg"
            className="bg-green-600 hover:bg-green-700 text-white"
            onClick={openResolveNominalDialog}
          >
            Selesaikan Revisi Nominal
          </Button>
        </div>
      )}

      {/* Confirm submit dialog (staff SPM) */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-lg text-center">
          <DialogHeader className="items-center">
            <AlertTriangle className="h-14 w-14 text-green-600 mb-2" />
            <DialogTitle>Ajukan Form A2?</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin mengajukan form ini ke {nextStepLabel}?
              Form tidak dapat diedit setelah diajukan.
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
              <Label>
                Persentase <span className="text-red-500">*</span>
              </Label>
              {isWorkAccidentLocked ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  Kecelakaan kerja — persentase terkunci 100%
                </div>
              ) : (
                <>
                  <RadioGroup
                    value={percentagePreset}
                    onValueChange={(v) =>
                      handlePresetChange(v as "calculated" | "custom")
                    }
                    className="flex flex-col gap-2"
                  >
                    {calculatedPreset && (
                      <label
                        htmlFor="pct-calculated"
                        className="flex items-center gap-2 cursor-pointer text-sm"
                      >
                        <RadioGroupItem
                          value="calculated"
                          id="pct-calculated"
                        />
                        {calculatedPreset.label}
                      </label>
                    )}
                    <label
                      htmlFor="pct-custom"
                      className="flex items-center gap-2 cursor-pointer text-sm"
                    >
                      <RadioGroupItem value="custom" id="pct-custom" />
                      Custom
                    </label>
                  </RadioGroup>
                  {percentagePreset === "custom" && (
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      placeholder="0 – 100"
                      value={actionPercentage}
                      onChange={(e) => setActionPercentage(e.target.value)}
                    />
                  )}
                </>
              )}
              {approvedAmount !== null && (
                <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
                  Jumlah disetujui:{" "}
                  <span className="font-semibold font-mono">
                    {formatRupiah(approvedAmount)}
                  </span>{" "}
                  <span className="text-blue-500">
                    dari {formatRupiah(cr9Amount)}
                  </span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="approve-notes">Catatan</Label>
              <Textarea
                id="approve-notes"
                placeholder="Catatan bersifat opsional."
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

      {/* Dialog: Selesaikan Revisi Nominal */}
      <Dialog open={resolveNominalOpen} onOpenChange={setResolveNominalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Selesaikan Revisi Nominal?</DialogTitle>
            <DialogDescription>
              Perbaiki persentase, lalu form akan langsung diajukan kembali ke
              step yang meminta revisi ini.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>
                Persentase <span className="text-red-500">*</span>
              </Label>
              {isWorkAccidentLocked ? (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  Kecelakaan kerja — persentase terkunci 100%
                </div>
              ) : (
                <Input
                  type="number"
                  min={0}
                  max={100}
                  placeholder="0 – 100"
                  value={nominalPercentage}
                  onChange={(e) => setNominalPercentage(e.target.value)}
                />
              )}
              {nominalPctValid && (
                <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700">
                  Jumlah disetujui:{" "}
                  <span className="font-semibold font-mono">
                    {formatRupiah((cr9Amount * nominalPct) / 100)}
                  </span>{" "}
                  <span className="text-blue-500">
                    dari {formatRupiah(cr9Amount)}
                  </span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="resolve-nominal-notes">Catatan</Label>
              <Textarea
                id="resolve-nominal-notes"
                placeholder="Catatan bersifat opsional."
                rows={3}
                value={nominalNotes}
                onChange={(e) => setNominalNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setResolveNominalOpen(false)}
              disabled={acting}
            >
              Batal
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={handleResolveNominalRevision}
              disabled={acting || !nominalPctValid}
            >
              {acting ? "Memproses..." : "Ya, Selesaikan"}
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
              Pilih bagian mana yang perlu direvisi — form akan dikembalikan ke
              role yang tepat untuk memperbaikinya.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>
                Revisi Ditujukan Ke <span className="text-red-500">*</span>
              </Label>
              <RadioGroup
                value={revisionTarget}
                onValueChange={(v) =>
                  setRevisionTarget(v as RevisionTargetRole)
                }
                className="flex flex-col gap-2"
              >
                <label
                  htmlFor="target-cabang"
                  className="flex items-center gap-2 cursor-pointer text-sm"
                >
                  <RadioGroupItem value="staff_cabang" id="target-cabang" />
                  Data Kelengkapan Lain (diagnosis, rincian biaya, dokumen —
                  kembali ke staff cabang)
                </label>
                <label
                  htmlFor="target-spm"
                  className="flex items-center gap-2 cursor-pointer text-sm"
                >
                  <RadioGroupItem value="staff_spm" id="target-spm" />
                  Berita Acara (kembali ke Admin SPM)
                </label>
                {myStep === "spm" && (
                  <label
                    htmlFor="target-manager-nautica"
                    className="flex items-center gap-2 cursor-pointer text-sm"
                  >
                    <RadioGroupItem
                      value="manager_nautica"
                      id="target-manager-nautica"
                    />
                    Revisi Nominal (kembali ke Manager Nautica)
                  </label>
                )}
                {myStep === "finance" && (
                  <label
                    htmlFor="target-manager-spm"
                    className="flex items-center gap-2 cursor-pointer text-sm"
                  >
                    <RadioGroupItem
                      value="manager_spm"
                      id="target-manager-spm"
                    />
                    Revisi Nominal (kembali ke Manager SPM)
                  </label>
                )}
              </RadioGroup>
            </div>
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

      {/* Dialog: Kirim Revisi ke Cabang (pra-chain, staff SPM) */}
      <Dialog open={cabangRevisionOpen} onOpenChange={setCabangRevisionOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Kirim Revisi ke Staff Cabang?</DialogTitle>
            <DialogDescription>
              Form akan dikembalikan ke staff cabang untuk perbaikan data
              (seafarer code, dokumen, dll). Form belum pernah diajukan ke
              manager, jadi ini tidak mempengaruhi approval chain.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="cabang-revision-notes">
              Catatan Revisi <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="cabang-revision-notes"
              placeholder="Tuliskan data/dokumen apa yang perlu diperbaiki..."
              rows={4}
              value={cabangRevisionNotes}
              onChange={(e) => setCabangRevisionNotes(e.target.value)}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setCabangRevisionOpen(false)}
              disabled={sendingCabangRevision}
            >
              Batal
            </Button>
            <Button
              className="bg-amber-500 hover:bg-amber-600 text-white"
              onClick={handleRequestCabangRevision}
              disabled={sendingCabangRevision || !cabangRevisionNotes.trim()}
            >
              {sendingCabangRevision ? "Memproses..." : "Ya, Kirim Revisi"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
