import { useState } from "react"
import { useNavigate } from "react-router"
import { toast } from "sonner"
import { createFormCr9 } from "@/api/form-cr9"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { uploadFile } from "@/lib/storage"
import { ROUTES } from "@/routes/config"
import type { CreateFormCr9Payload } from "@/types/form-cr9"

// ─── Types ────────────────────────────────────────────────────────────────────

type FormState = {
  seafarer_code: string
  seaman_code: string
  seaman_name: string
  position: string
  ship: string
  complaint: string
  cr9_url: string
  receipt_url: string
  amount: string
}

type FormErrors = Partial<Record<keyof FormState, string>>

type UploadStatus = "idle" | "uploading" | "done" | "error"

const EMPTY_FORM: FormState = {
  seafarer_code: "",
  seaman_code: "",
  seaman_name: "",
  position: "",
  ship: "",
  complaint: "",
  cr9_url: "",
  receipt_url: "",
  amount: "",
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validate(form: FormState): FormErrors {
  const errors: FormErrors = {}
  if (!form.seafarer_code.trim())
    errors.seafarer_code = "Seafarer code wajib diisi"
  if (!form.seaman_code.trim()) errors.seaman_code = "Seaman code wajib diisi"
  if (!form.seaman_name.trim()) errors.seaman_name = "Seaman name wajib diisi"
  if (!form.position.trim()) errors.position = "Jabatan wajib diisi"
  if (!form.ship.trim()) errors.ship = "Nama kapal wajib diisi"
  if (!form.complaint.trim()) errors.complaint = "Jenis keluhan wajib diisi"
  if (!form.cr9_url.trim()) errors.cr9_url = "Dokumen CR9 wajib diupload"
  if (!form.receipt_url.trim()) errors.receipt_url = "Kwitansi wajib diupload"
  const amt = Number(form.amount)
  if (!form.amount.trim()) {
    errors.amount = "Jumlah biaya wajib diisi"
  } else if (Number.isNaN(amt) || amt <= 0) {
    errors.amount = "Jumlah biaya harus lebih dari 0"
  }
  return errors
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Field({
  id,
  label,
  error,
  children,
}: {
  id: string
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

function UploadHint({ status }: { status: UploadStatus }) {
  if (status === "uploading")
    return <p className="text-xs text-muted-foreground">Mengupload file...</p>
  if (status === "done")
    return <p className="text-xs text-green-600">File berhasil diupload</p>
  if (status === "error")
    return (
      <p className="text-xs text-red-500">Upload gagal — pilih file lagi</p>
    )
  return null
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FormCr9CreatePage() {
  const navigate = useNavigate()
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)

  const [cr9Status, setCr9Status] = useState<UploadStatus>("idle")
  const [receiptStatus, setReceiptStatus] = useState<UploadStatus>("idle")

  function handleChange(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  async function handleFileChange(
    e: React.ChangeEvent<HTMLInputElement>,
    folder: string,
    field: "cr9_url" | "receipt_url",
    setStatus: (s: UploadStatus) => void,
  ) {
    const file = e.target.files?.[0]
    if (!file) return

    setStatus("uploading")
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))

    try {
      const storedPath = await uploadFile(file, folder)
      handleChange(field, storedPath)
      setStatus("done")
    } catch {
      setStatus("error")
      toast.error("Gagal mengupload file, coba lagi")
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate(form)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    setSubmitting(true)
    try {
      const payload: CreateFormCr9Payload = {
        seafarer_code: form.seafarer_code.trim(),
        seaman_code: form.seaman_code.trim(),
        seaman_name: form.seaman_name.trim(),
        position: form.position.trim(),
        ship: form.ship.trim(),
        complaint: form.complaint.trim(),
        cr9_url: form.cr9_url,
        receipt_url: form.receipt_url,
        amount: Number(form.amount),
      }
      await createFormCr9(payload)
      toast.success("Form CR9 berhasil dibuat")
      navigate(ROUTES.formCr9.path)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membuat Form CR9")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-4xl font-semibold text-gray-900">
            Buat Form CR9
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Pengajuan Laporan Form CR9 Crew Kapal.
            <br />
            Pastikan Semua Data Sudah Benar Sebelum Menyimpan.
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Informasi Form CR9</CardTitle>
            <CardDescription>
              Isi form berikut dengan data yang benar dan lengkap. Setelah
              disimpan, form akan masuk ke tahap review oleh staff SPM.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Field
                id="seafarer_code"
                label="Seafarer Code"
                error={errors.seafarer_code}
              >
                <Input
                  id="seafarer_code"
                  placeholder="Cth: SF-20240118"
                  value={form.seafarer_code}
                  onChange={(e) =>
                    handleChange("seafarer_code", e.target.value)
                  }
                />
              </Field>

              <Field
                id="seaman_code"
                label="Seaman Code"
                error={errors.seaman_code}
              >
                <Input
                  id="seaman_code"
                  placeholder="Cth: ABK-20240118"
                  value={form.seaman_code}
                  onChange={(e) => handleChange("seaman_code", e.target.value)}
                />
              </Field>

              <Field
                id="seaman_name"
                label="Seaman Name"
                error={errors.seaman_name}
              >
                <Input
                  id="seaman_name"
                  placeholder="Nama lengkap seaman"
                  value={form.seaman_name}
                  onChange={(e) => handleChange("seaman_name", e.target.value)}
                />
              </Field>

              <Field id="position" label="Jabatan" error={errors.position}>
                <Input
                  id="position"
                  placeholder="Cth: Mualim I, Masinis II"
                  value={form.position}
                  onChange={(e) => handleChange("position", e.target.value)}
                />
              </Field>

              <Field id="ship" label="Nama Kapal" error={errors.ship}>
                <Input
                  id="ship"
                  placeholder="Cth: KM Nusantara Jaya"
                  value={form.ship}
                  onChange={(e) => handleChange("ship", e.target.value)}
                />
              </Field>

              <Field
                id="complaint"
                label="Jenis Keluhan / Sakit"
                error={errors.complaint}
              >
                <Input
                  id="complaint"
                  placeholder="Cth: Demam & Batuk, Cedera Tangan"
                  value={form.complaint}
                  onChange={(e) => handleChange("complaint", e.target.value)}
                />
              </Field>

              <Field
                id="cr9_file"
                label="Dokumen CR9 (PDF)"
                error={errors.cr9_url}
              >
                <input
                  id="cr9_file"
                  type="file"
                  accept=".pdf,application/pdf"
                  disabled={cr9Status === "uploading" || submitting}
                  className="block w-full text-sm text-gray-700 border rounded-md p-0.5 cursor-pointer file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
                  onChange={(e) =>
                    handleFileChange(e, "cr9", "cr9_url", setCr9Status)
                  }
                />
                <UploadHint status={cr9Status} />
              </Field>

              <Field
                id="receipt_file"
                label="Kwitansi (PDF)"
                error={errors.receipt_url}
              >
                <input
                  id="receipt_file"
                  type="file"
                  accept=".pdf,application/pdf"
                  disabled={receiptStatus === "uploading" || submitting}
                  className="block w-full text-sm text-gray-700 border rounded-md p-0.5 cursor-pointer file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
                  onChange={(e) =>
                    handleFileChange(
                      e,
                      "receipt",
                      "receipt_url",
                      setReceiptStatus,
                    )
                  }
                />
                <UploadHint status={receiptStatus} />
              </Field>

              <Field
                id="amount"
                label="Jumlah Biaya (Rp)"
                error={errors.amount}
              >
                <Input
                  id="amount"
                  type="text"
                  inputMode="numeric"
                  placeholder="Cth: 150000"
                  value={form.amount}
                  onChange={(e) =>
                    handleChange("amount", e.target.value.replace(/\D/g, ""))
                  }
                />
              </Field>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(ROUTES.formCr9.path)}
                disabled={submitting}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={
                  submitting ||
                  cr9Status === "uploading" ||
                  receiptStatus === "uploading"
                }
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {submitting ? "Menyimpan..." : "Simpan Form CR9"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
