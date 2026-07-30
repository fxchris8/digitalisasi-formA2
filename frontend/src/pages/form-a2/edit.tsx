import { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router"
import { toast } from "sonner"
import { getFormA2, updateFormA2 } from "@/api/form-a2"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { InfoRow } from "@/components/ui/info-row"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAuth } from "@/contexts/auth.context"
import { formatRupiah } from "@/lib/format"
import { ROLES } from "@/lib/rbac"
import { getStorageUrl, MAX_FILE_SIZE, uploadFile } from "@/lib/storage"
import { ROUTES } from "@/routes/config"
import type { FormA2WithDetails } from "@/types/form-a2"

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

  const [form, setForm] = useState<FormA2WithDetails | null>(null)
  const [loading, setLoading] = useState(true)

  const [newsFile, setNewsFile] = useState<File | null>(null)
  const [newsStatus, setNewsStatus] = useState<UploadStatus>("idle")
  const [saving, setSaving] = useState(false)

  const canManage =
    user?.role === ROLES.ADMIN ||
    (user?.role === ROLES.ADMIN_SPM && user?.department === "spm")

  const loadForm = useCallback(async () => {
    if (!id) return
    try {
      const data = await getFormA2(id)
      setForm(data)
    } catch {
      toast.error("Gagal memuat Form A2")
    }
  }, [id])

  useEffect(() => {
    setLoading(true)
    loadForm().finally(() => setLoading(false))
  }, [loadForm])

  useEffect(() => {
    if (form && form.status !== "draft" && form.status !== "revision") {
      toast.error("Form A2 tidak dapat diedit pada status ini")
      navigate(`/form-a2/${id}`)
      return
    }
    if (
      form?.status === "revision" &&
      form.active_revision?.target_role !== "staff_spm"
    ) {
      toast.error("Form ini menunggu revisi data kelengkapan dari staff cabang")
      navigate(`/form-a2/${id}`)
      return
    }
    if (form && !canManage) {
      navigate(ROUTES.formA2.path)
    }
  }, [form, canManage, id, navigate])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== "application/pdf") {
      toast.error("Hanya file PDF yang diperbolehkan")
      e.target.value = ""
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`Ukuran file maksimal ${MAX_FILE_SIZE / 1024 / 1024} MB`)
      e.target.value = ""
      return
    }
    setNewsFile(file)
  }

  async function handleSaveInfo() {
    if (!id || !newsFile) return
    setSaving(true)
    try {
      setNewsStatus("uploading")
      let newsUrl: string
      try {
        newsUrl = await uploadFile(newsFile, "berita-acara")
        setNewsStatus("done")
      } catch (err) {
        setNewsStatus("error")
        toast.error(
          err instanceof Error ? err.message : "Gagal mengupload berita acara",
        )
        return
      }

      await updateFormA2(id, { news_url: newsUrl })

      setNewsFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ""
      setNewsStatus("idle")

      // Simpan berita acara BUKAN akhir alur — form masih 'draft' sampai
      // diajukan ke manager. Arahkan balik ke halaman detail supaya tombol
      // "Ajukan ke Manager Nautica" langsung terlihat, jangan biarkan user
      // mengira formnya sudah terkirim.
      toast.success(
        "Berita acara tersimpan — lanjutkan dengan klik 'Ajukan ke Manager Nautica'",
      )
      navigate(`/form-a2/${id}`)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal menyimpan Form A2",
      )
    } finally {
      setSaving(false)
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

      {/* Diagnosis & Detail Biaya — read-only, diisi staff cabang di tahap CR9 */}
      <Card>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">
              Diagnosis (diisi staff cabang)
            </Label>
            <p className="mt-1 text-sm">{form.diagnosis}</p>
          </div>

          {form.details.length > 0 && (
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-10 text-center">No</TableHead>
                    <TableHead>Uraian</TableHead>
                    <TableHead>Rumah Sakit</TableHead>
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
                        {d.hospital_category && ` (${d.hospital_category})`}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatRupiah(d.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/30 font-semibold">
                    <TableCell colSpan={3} className="text-right">
                      Total
                    </TableCell>
                    <TableCell className="text-right">
                      {formatRupiah(totalDetail)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Berita Acara — satu-satunya yang bisa diisi staff SPM */}
      <Card>
        <CardContent>
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

          <div className="flex justify-end mt-4">
            <Button
              className="bg-blue-500 hover:bg-blue-600 text-white"
              disabled={saving || newsStatus === "uploading" || !newsFile}
              onClick={handleSaveInfo}
            >
              {newsStatus === "uploading"
                ? "Mengupload..."
                : saving
                  ? "Menyimpan..."
                  : "Simpan Berita Acara"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
