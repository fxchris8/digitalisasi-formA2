import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router"
import { toast } from "sonner"
import { getFormCr9, updateFormCr9 } from "@/api/form-cr9"
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
import { getStorageUrl, uploadFile } from "@/lib/storage"
import { ROUTES } from "@/routes/config"
import type { FormCr9, UpdateFormCr9Payload } from "@/types/form-cr9"
import { formCr9Schema } from "@/validations/form-cr9.validation"

// ─── Types ────────────────────────────────────────────────────────────────────

type FormState = {
  seafarer_code: string
  seaman_code: string
  seaman_name: string
  position: string
  ship: string
  complaint: string
  cr9_url: string // stored path, e.g. "cr9/uuid.pdf"
  receipt_url: string // stored path, e.g. "receipt/uuid.pdf"
  amount: string
}

type FormErrors = Partial<Record<keyof FormState, string>>

type UploadStatus = "idle" | "uploading" | "done" | "error"

function validate(form: FormState): FormErrors {
  const result = formCr9Schema.safeParse(form)
  if (result.success) return {}
  const errors: FormErrors = {}
  for (const issue of result.error.issues) {
    const field = issue.path[0] as keyof FormErrors
    if (!errors[field]) errors[field] = issue.message
  }
  return errors
}

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
    return (
      <p className="text-xs text-green-600">File baru berhasil diupload ✓</p>
    )
  if (status === "error")
    return (
      <p className="text-xs text-red-500">Upload gagal — pilih file lagi</p>
    )
  return null
}

function toFormState(form: FormCr9): FormState {
  return {
    seafarer_code: form.seafarer_code,
    seaman_code: form.seaman_code,
    seaman_name: form.seaman_name,
    position: form.position,
    ship: form.ship,
    complaint: form.complaint,
    cr9_url: form.cr9_url,
    receipt_url: form.receipt_url,
    amount: form.amount,
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FormCr9EditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [form, setForm] = useState<FormState | null>(null)
  const [errors, setErrors] = useState<FormErrors>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formNumber, setFormNumber] = useState("")

  const [cr9Status, setCr9Status] = useState<UploadStatus>("idle")
  const [receiptStatus, setReceiptStatus] = useState<UploadStatus>("idle")

  useEffect(() => {
    if (!id) return
    getFormCr9(id)
      .then((data) => {
        if (data.status === "approved") {
          toast.error("Form yang sudah disetujui tidak dapat diedit")
          navigate(`/form-cr9/${id}`)
          return
        }
        setForm(toFormState(data))
        setFormNumber(data.form_number)
      })
      .catch(() => {
        toast.error("Gagal memuat Form CR9")
        navigate(ROUTES.formCr9.path)
      })
      .finally(() => setLoading(false))
  }, [id, navigate])

  function handleChange(field: keyof FormState, value: string) {
    setForm((prev) => (prev ? { ...prev, [field]: value } : null))
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
    if (!form || !id) return

    const errs = validate(form)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    setSubmitting(true)
    try {
      const payload: UpdateFormCr9Payload = {
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
      await updateFormCr9(id, payload)
      toast.success("Form CR9 berhasil diupdate")
      navigate(`/form-cr9/${id}`)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal mengupdate Form CR9",
      )
    } finally {
      setSubmitting(false)
    }
  }

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
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-4xl font-semibold text-gray-900">
            Edit Form CR9
          </h1>
          <p className="mt-0.5 text-sm font-mono text-gray-500">{formNumber}</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Informasi Form CR9</CardTitle>
            <CardDescription>
              Perbarui data Form CR9 sesuai kebutuhan. Dokumen yang sudah
              diupload tetap berlaku jika tidak diganti.
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
                  value={form.seaman_name}
                  onChange={(e) => handleChange("seaman_name", e.target.value)}
                />
              </Field>

              <Field id="position" label="Jabatan" error={errors.position}>
                <Input
                  id="position"
                  value={form.position}
                  onChange={(e) => handleChange("position", e.target.value)}
                />
              </Field>

              <Field id="ship" label="Nama Kapal" error={errors.ship}>
                <Input
                  id="ship"
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
                  value={form.complaint}
                  onChange={(e) => handleChange("complaint", e.target.value)}
                />
              </Field>

              <Field
                id="cr9_file"
                label="Dokumen CR9 (PDF)"
                error={errors.cr9_url}
              >
                {form.cr9_url && cr9Status === "idle" && (
                  <a
                    href={getStorageUrl(form.cr9_url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-xs text-blue-600 hover:underline mb-1"
                  >
                    Lihat dokumen saat ini
                  </a>
                )}
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
                {cr9Status === "idle" && form.cr9_url && (
                  <p className="text-xs text-muted-foreground">
                    Pilih file baru untuk mengganti dokumen
                  </p>
                )}
                <UploadHint status={cr9Status} />
              </Field>

              <Field
                id="receipt_file"
                label="Kwitansi (PDF)"
                error={errors.receipt_url}
              >
                {form.receipt_url && receiptStatus === "idle" && (
                  <a
                    href={getStorageUrl(form.receipt_url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-xs text-blue-600 hover:underline mb-1"
                  >
                    Lihat kwitansi saat ini
                  </a>
                )}
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
                {receiptStatus === "idle" && form.receipt_url && (
                  <p className="text-xs text-muted-foreground">
                    Pilih file baru untuk mengganti kwitansi
                  </p>
                )}
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
                onClick={() => navigate(`/form-cr9/${id}`)}
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
                {submitting ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
