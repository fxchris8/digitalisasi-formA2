import { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router"
import { toast } from "sonner"
import {
  addFormA2Detail,
  getFormA2,
  removeFormA2Detail,
  updateFormA2,
} from "@/api/form-a2"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
import { formatRupiah } from "@/lib/format"
import { ROLES } from "@/lib/rbac"
import { getStorageUrl, MAX_FILE_SIZE, uploadFile } from "@/lib/storage"
import { ROUTES } from "@/routes/config"
import type { AddDetailPayload, FormA2WithDetails } from "@/types/form-a2"

// ─── Constants ────────────────────────────────────────────────────────────────

const EMPTY_DETAIL: AddDetailPayload = {
  description: "",
  hospital_name: "",
  hospital_category: "",
  amount: 0,
}

// ─── Types & helpers ──────────────────────────────────────────────────────────

type UploadStatus = "idle" | "uploading" | "done" | "error"

function UploadHint({ status }: { status: UploadStatus }) {
  if (status === "uploading")
    return <p className="text-xs text-muted-foreground">Mengupload file...</p>
  if (status === "done")
    return (
      <p className="text-xs text-green-600">File baru berhasil diupload ✓</p>
    )
  if (status === "error")
    return (
      <p className="text-xs text-red-500">Upload gagal — pilih file lagi</p>
    )
  return null
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FormA2EditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Remote state ────────────────────────────────────────────────────────────
  const [form, setForm] = useState<FormA2WithDetails | null>(null)
  const [loading, setLoading] = useState(true)

  // ── Info fields ─────────────────────────────────────────────────────────────
  const [diagnosis, setDiagnosis] = useState("")
  const [newsFile, setNewsFile] = useState<File | null>(null)
  const [newsStatus, setNewsStatus] = useState<UploadStatus>("idle")
  const [saving, setSaving] = useState(false)

  // ── Detail items ─────────────────────────────────────────────────────────────
  const [newDetail, setNewDetail] = useState<AddDetailPayload>(EMPTY_DETAIL)
  const [addingDetail, setAddingDetail] = useState(false)
  const [deletingDetailId, setDeletingDetailId] = useState<string | null>(null)

  // ── Access guard ─────────────────────────────────────────────────────────────
  const canManage =
    user?.role === ROLES.ADMIN ||
    (user?.role === ROLES.STAFF && user?.department === "spm")

  // ─── Load ────────────────────────────────────────────────────────────────────

  const loadForm = useCallback(async () => {
    if (!id) return
    try {
      const data = await getFormA2(id)
      setForm(data)
      setDiagnosis(data.diagnosis ?? "")
    } catch {
      toast.error("Gagal memuat Form A2")
    }
  }, [id])

  useEffect(() => {
    setLoading(true)
    loadForm().finally(() => setLoading(false))
  }, [loadForm])

  // Redirect if not editable
  useEffect(() => {
    if (form && form.status !== "draft" && form.status !== "revision") {
      toast.error("Form A2 tidak dapat diedit pada status ini")
      navigate(`/form-a2/${id}`)
    }
    if (form && !canManage) {
      navigate(ROUTES.formA2.path)
    }
  }, [form, canManage, id, navigate])

  // ─── Handlers ────────────────────────────────────────────────────────────────

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== "application/pdf") {
      toast.error("Hanya file PDF yang diperbolehkan")
      e.target.value = ""
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error("Ukuran file maksimal 3 MB")
      e.target.value = ""
      return
    }
    setNewsFile(file)
  }

  async function handleSaveInfo() {
    if (!id) return
    setSaving(true)
    try {
      let newsUrl = form?.news_url ?? undefined

      if (newsFile) {
        setNewsStatus("uploading")
        try {
          newsUrl = await uploadFile(newsFile, "berita-acara")
          setNewsStatus("done")
        } catch {
          setNewsStatus("error")
          toast.error("Gagal mengupload berita acara")
          return
        }
      }

      await updateFormA2(id, {
        diagnosis: diagnosis || undefined,
        news_url: newsUrl,
      })

      toast.success("Informasi Form A2 berhasil disimpan")
      setNewsFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ""
      setNewsStatus("idle")
      await loadForm()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal menyimpan Form A2",
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleAddDetail() {
    if (!id) return
    if (!newDetail.description.trim()) {
      toast.error("Uraian wajib diisi")
      return
    }
    if (!newDetail.hospital_name.trim()) {
      toast.error("Nama rumah sakit wajib diisi")
      return
    }
    if (!newDetail.hospital_category.trim()) {
      toast.error("Kategori rumah sakit wajib diisi")
      return
    }
    if (newDetail.amount <= 0) {
      toast.error("Jumlah harus lebih dari 0")
      return
    }

    setAddingDetail(true)
    try {
      await addFormA2Detail(id, newDetail)
      toast.success("Detail biaya berhasil ditambahkan")
      setNewDetail(EMPTY_DETAIL)
      await loadForm()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal menambah detail biaya",
      )
    } finally {
      setAddingDetail(false)
    }
  }

  async function handleRemoveDetail(detailId: string) {
    if (!id) return
    setDeletingDetailId(detailId)
    try {
      await removeFormA2Detail(id, detailId)
      toast.success("Detail biaya berhasil dihapus")
      await loadForm()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal menghapus detail biaya",
      )
    } finally {
      setDeletingDetailId(null)
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

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
          <h1 className="text-4xl font-semibold text-gray-900">Edit Form A2</h1>
          <p className="mt-1 text-sm text-gray-500">{form.form_number}</p>
        </div>
        <Button variant="outline" onClick={() => navigate(`/form-a2/${id}`)}>
          Kembali
        </Button>
      </div>

      {/* Info CR9 (read-only) */}
      <Card>
        <CardContent>
          <dl>
            <InfoRow label="Nomor CR9" value={form.cr9_form_number} />
            <InfoRow label="Seaman Code" value={form.seaman_code} />
            <InfoRow label="Seaman Name" value={form.seaman_name} />
            <InfoRow label="Kapal" value={form.ship} />
            <InfoRow label="Cabang" value={form.branch_office} />
          </dl>
        </CardContent>
      </Card>

      {/* Diagnosis & Berita Acara */}
      <Card>
        <CardContent>
          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-1.5">
              <Label htmlFor="diagnosis">Diagnosis</Label>
              <Textarea
                id="diagnosis"
                rows={3}
                placeholder="Tulis diagnosis medis..."
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="news-file">Berita Acara (PDF)</Label>
              {form.news_url && newsStatus === "idle" && (
                <a
                  href={getStorageUrl(form.news_url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-xs text-blue-600 hover:underline mb-1"
                >
                  Lihat dokumen saat ini
                </a>
              )}
              <input
                id="news-file"
                type="file"
                accept=".pdf,application/pdf"
                ref={fileInputRef}
                disabled={newsStatus === "uploading" || saving}
                className="block w-full text-sm text-gray-700 border rounded-md p-0.5 cursor-pointer file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
                onChange={handleFileChange}
              />
              {newsStatus === "idle" && form.news_url && (
                <p className="text-xs text-muted-foreground">
                  Pilih file baru untuk mengganti berita acara
                </p>
              )}
              <UploadHint status={newsStatus} />
            </div>

            <div className="flex justify-end">
              <Button
                className="bg-blue-500 hover:bg-blue-600 text-white"
                disabled={saving || newsStatus === "uploading"}
                onClick={handleSaveInfo}
              >
                {newsStatus === "uploading"
                  ? "Mengupload..."
                  : saving
                    ? "Menyimpan..."
                    : "Simpan Informasi"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detail Biaya */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Detail Biaya</CardTitle>
          <CardDescription>
            Tambah uraian biaya. Total harus sesuai dengan jumlah di Form CR9.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Tabel detail */}
          {form.details.length > 0 ? (
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-10 text-center">No</TableHead>
                    <TableHead>Uraian</TableHead>
                    <TableHead>Nama RS</TableHead>
                    <TableHead>Kategori RS</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                    <TableHead className="text-center">Aksi</TableHead>
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
                      <TableCell className="text-right">
                        {formatRupiah(d.amount)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          size="xs"
                          className="text-[10px] bg-red-600 hover:bg-red-700 text-white"
                          disabled={deletingDetailId === d.id}
                          onClick={() => handleRemoveDetail(d.id)}
                        >
                          {deletingDetailId === d.id ? "..." : "HAPUS"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Total row */}
                  <TableRow className="bg-muted/30 font-semibold">
                    <TableCell colSpan={4} className="text-right">
                      Total
                    </TableCell>
                    <TableCell className="text-right">
                      {formatRupiah(totalDetail)}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic text-center py-4">
              Belum ada uraian biaya.
            </p>
          )}

          {/* Perbandingan total vs CR9 */}
          {(() => {
            const cr9Amount = Number(form.cr9_amount)
            const isMatch = Math.abs(totalDetail - cr9Amount) <= 0.01
            return (
              <div
                className={`flex items-center justify-between rounded-lg px-4 py-2.5 text-sm border ${
                  isMatch
                    ? "bg-green-50 border-green-200 text-green-700"
                    : "bg-red-50 border-red-200 text-red-700"
                }`}
              >
                <span>
                  {isMatch
                    ? "Total uraian sesuai dengan jumlah CR9"
                    : "Total uraian belum sesuai dengan jumlah CR9"}
                </span>
                <span className="font-mono font-medium">
                  {formatRupiah(totalDetail)} / {formatRupiah(cr9Amount)}
                </span>
              </div>
            )
          })()}

          {/* Form tambah detail */}
          <div className="rounded-lg border p-4 space-y-4 bg-muted/20">
            <p className="text-sm font-medium">Tambah Uraian Biaya</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="detail-description">Uraian</Label>
                <Input
                  id="detail-description"
                  placeholder="Contoh: Rawat inap 3 hari"
                  value={newDetail.description}
                  onChange={(e) =>
                    setNewDetail((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="detail-hospital">Nama Rumah Sakit</Label>
                <Input
                  id="detail-hospital"
                  placeholder="Contoh: RS Mitra Keluarga"
                  value={newDetail.hospital_name}
                  onChange={(e) =>
                    setNewDetail((prev) => ({
                      ...prev,
                      hospital_name: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="detail-category">Kategori RS</Label>
                <Input
                  id="detail-category"
                  placeholder="Contoh: Swasta, Tipe A, Klinik, dll."
                  value={newDetail.hospital_category}
                  onChange={(e) =>
                    setNewDetail((prev) => ({
                      ...prev,
                      hospital_category: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="detail-amount">Jumlah (Rp)</Label>
                <Input
                  id="detail-amount"
                  type="number"
                  min={0}
                  placeholder="0"
                  value={newDetail.amount === 0 ? "" : newDetail.amount}
                  onChange={(e) =>
                    setNewDetail((prev) => ({
                      ...prev,
                      amount: Number(e.target.value) || 0,
                    }))
                  }
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                className="bg-blue-500 hover:bg-blue-600 text-white"
                disabled={addingDetail}
                onClick={handleAddDetail}
              >
                {addingDetail ? "Menambah..." : "Tambah Uraian"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
