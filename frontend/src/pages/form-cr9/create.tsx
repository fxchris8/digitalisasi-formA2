import { Sparkles } from "lucide-react"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router"
import { toast } from "sonner"
import { listBranchOffices } from "@/api/auth"
import { extractReceipt } from "@/api/extraction"
import { createFormCr9 } from "@/api/form-cr9"
import { CostDetailSection } from "@/components/form-cr9/cost-detail-section"
import { ReceiptUploadSection } from "@/components/form-cr9/receipt-upload-section"
import { SeamanAutocompleteField } from "@/components/form-cr9/seaman-autocomplete-field"
import { ShipAutocompleteField } from "@/components/form-cr9/ship-autocomplete-field"
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/contexts/auth.context"
import { shipFromSeamanLocation } from "@/lib/seaman-ship"
import { uploadFile } from "@/lib/storage"
import { ROUTES } from "@/routes/config"
import type {
  CostDetailItem,
  Cr9Type,
  CreateFormCr9Payload,
} from "@/types/form-cr9"
import type { Hospital } from "@/types/hospital"
import type { Seaman } from "@/types/seaman"
import { formCr9Schema } from "@/validations/form-cr9.validation"

// ─── Types ────────────────────────────────────────────────────────────────────

type FormState = {
  seafarer_code: string
  seaman_code: string
  seaman_name: string
  position: string
  ship: string
  complaint: string
  cr9_url: string
  diagnosis: string
  cr9_type: Cr9Type
  hospital_id: string
  hospital_name_manual: string
  branch_office: string
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
  diagnosis: "",
  cr9_type: "perusahaan",
  hospital_id: "",
  hospital_name_manual: "",
  branch_office: "",
}

// ─── Validation ───────────────────────────────────────────────────────────────

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
  const { user } = useAuth()
  const needsBranchSelect = !user?.branch_office

  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [offices, setOffices] = useState<string[]>([])

  const [hospitalLabel, setHospitalLabel] = useState("")
  // Berisi status darat seaman (mis. "DARAT BIASA") kalau dia sedang tidak
  // bertugas di kapal — dipakai untuk membuka input kapal manual.
  const [shipStatus, setShipStatus] = useState<string | null>(null)
  const [isWorkAccident, setIsWorkAccident] = useState(false)
  const [details, setDetails] = useState<CostDetailItem[]>([])
  const [detailsError, setDetailsError] = useState<string | undefined>()

  const [cr9Status, setCr9Status] = useState<UploadStatus>("idle")
  const [receiptPaths, setReceiptPaths] = useState<string[]>([])
  const [receiptPathsError, setReceiptPathsError] = useState<
    string | undefined
  >()
  const [extracting, setExtracting] = useState(false)

  useEffect(() => {
    if (!needsBranchSelect) return
    listBranchOffices()
      .then(setOffices)
      .catch(() => toast.error("Gagal memuat daftar cabang"))
  }, [needsBranchSelect])

  function handleChange(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  // Seafarer code/nama/jabatan/kapal ikut terisi & terkunci begitu seaman
  // dipilih dari dropdown-search — tidak ada input manual. Khusus kapal:
  // kalau seaman sedang tidak bertugas (last_location berisi status darat),
  // field dibiarkan kosong & bisa dipilih manual dari master kapal.
  function handleSeamanSelect(seaman: Seaman) {
    const ship = shipFromSeamanLocation(seaman.last_location)
    setShipStatus(ship ? null : (seaman.last_location?.trim() ?? null))
    setForm((prev) => ({
      ...prev,
      seafarer_code: seaman.seafarercode ?? "",
      seaman_code: seaman.seamancode,
      seaman_name: seaman.name,
      position: seaman.last_position ?? "",
      ship: ship ?? "",
    }))
    setErrors((prev) => ({
      ...prev,
      seafarer_code: undefined,
      seaman_code: undefined,
      seaman_name: undefined,
      position: undefined,
      ship: undefined,
    }))
  }

  function handleHospitalSelect(hospital: Hospital) {
    setHospitalLabel(`${hospital.name} — ${hospital.city}`)
    handleChange("hospital_id", hospital.id)
  }

  // Ganti tipe CR9 mereset field rumah sakit — dropdown master-data & isian
  // manual tidak boleh nyampur (lihat validasi XOR di formCr9Schema).
  function handleCr9TypeChange(value: Cr9Type) {
    setForm((prev) => ({
      ...prev,
      cr9_type: value,
      hospital_id: "",
      hospital_name_manual: "",
    }))
    setHospitalLabel("")
    if (value === "perusahaan") setIsWorkAccident(false)
  }

  async function handleFileChange(
    e: React.ChangeEvent<HTMLInputElement>,
    folder: string,
    field: "cr9_url",
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
    } catch (err) {
      setStatus("error")
      toast.error(
        err instanceof Error ? err.message : "Gagal mengupload file, coba lagi",
      )
    }
  }

  // Baca kwitansi yang sudah diupload pakai AI, pre-fill rumah sakit & rincian
  // biaya — hasilnya tetap harus dicek manual sebelum disimpan (bukan final).
  async function handleExtract() {
    if (receiptPaths.length === 0) return
    setExtracting(true)
    try {
      const result = await extractReceipt(receiptPaths)

      if (result.hospital_name) {
        toast.info(
          `Nota terbaca atas nama "${result.hospital_name}" — pilih rumah sakit secara manual`,
        )
      }

      if (result.details.length > 0) {
        setDetails(
          result.details.map((d) => ({
            description: d.description,
            amount: d.amount,
          })),
        )
      }

      toast.success(
        "Data berhasil diekstrak dari kwitansi — periksa kembali sebelum menyimpan",
      )
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal mengekstrak data kwitansi",
      )
    } finally {
      setExtracting(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate(form)

    if (needsBranchSelect && !form.branch_office) {
      errs.branch_office = "Cabang wajib dipilih"
    }

    let detailsErr: string | undefined
    if (details.length === 0) {
      detailsErr = "Minimal satu uraian biaya wajib diisi"
    } else if (details.some((d) => !d.description.trim() || d.amount <= 0)) {
      detailsErr = "Setiap uraian harus punya deskripsi dan jumlah > 0"
    }
    setDetailsError(detailsErr)

    const receiptErr =
      receiptPaths.length === 0
        ? "Minimal satu kwitansi wajib diupload"
        : undefined
    setReceiptPathsError(receiptErr)

    if (Object.keys(errs).length > 0 || detailsErr || receiptErr) {
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
        receipt_urls: receiptPaths,
        diagnosis: form.diagnosis.trim(),
        cr9_type: form.cr9_type,
        ...(form.cr9_type === "reimbursement"
          ? {
              hospital_name_manual: form.hospital_name_manual.trim(),
              is_work_accident: isWorkAccident,
            }
          : { hospital_id: form.hospital_id }),
        details: details.map((d) => ({
          description: d.description.trim(),
          amount: d.amount,
        })),
        ...(needsBranchSelect && { branch_office: form.branch_office }),
      }
      await createFormCr9(payload)
      toast.success("Form CR9 dan Form A2 berhasil dibuat")
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
      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Informasi Form CR9</CardTitle>
            <CardDescription>
              Isi form berikut dengan data yang benar dan lengkap. Setelah
              disimpan, Form A2 akan otomatis dibuat dan menunggu berita acara
              dari staff SPM.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Jenis CR9</Label>
              <RadioGroup
                value={form.cr9_type}
                onValueChange={(v) => handleCr9TypeChange(v as Cr9Type)}
                className="flex flex-col sm:flex-row gap-4"
              >
                <label
                  htmlFor="cr9-type-perusahaan"
                  className="flex items-center gap-2 cursor-pointer text-sm"
                >
                  <RadioGroupItem value="perusahaan" id="cr9-type-perusahaan" />
                  CR9 Perusahaan (rumah sakit dari master data)
                </label>
                <label
                  htmlFor="cr9-type-reimbursement"
                  className="flex items-center gap-2 cursor-pointer text-sm"
                >
                  <RadioGroupItem
                    value="reimbursement"
                    id="cr9-type-reimbursement"
                  />
                  CR9 Reimbursement (rumah sakit ketik bebas)
                </label>
              </RadioGroup>
            </div>

            {form.cr9_type === "reimbursement" && (
              <div className="space-y-1.5">
                <Label>Kecelakaan Kerja</Label>
                <RadioGroup
                  value={isWorkAccident ? "yes" : "no"}
                  onValueChange={(v) => setIsWorkAccident(v === "yes")}
                  className="flex flex-col sm:flex-row gap-4"
                >
                  <label
                    htmlFor="work-accident-yes"
                    className="flex items-center gap-2 cursor-pointer text-sm"
                  >
                    <RadioGroupItem value="yes" id="work-accident-yes" />
                    Ya, kecelakaan kerja
                  </label>
                  <label
                    htmlFor="work-accident-no"
                    className="flex items-center gap-2 cursor-pointer text-sm"
                  >
                    <RadioGroupItem value="no" id="work-accident-no" />
                    Bukan kecelakaan kerja
                  </label>
                </RadioGroup>
                <p className="text-xs text-muted-foreground">
                  {isWorkAccident
                    ? "Reimbursement otomatis 100% — manager tidak bisa mengubah persentasenya."
                    : "Persentase reimbursement ditentukan manager saat approval."}
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {needsBranchSelect && (
                <Field
                  id="branch_office"
                  label="Cabang"
                  error={errors.branch_office}
                >
                  <Select
                    value={form.branch_office}
                    onValueChange={(v) => handleChange("branch_office", v)}
                    disabled={submitting}
                  >
                    <SelectTrigger id="branch_office" className="w-full">
                      <SelectValue placeholder="-- Pilih Cabang --" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectLabel>Kantor Cabang</SelectLabel>
                        {offices.map((o) => (
                          <SelectItem key={o} value={o}>
                            {o}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              )}

              <SeamanAutocompleteField
                id="seaman_code"
                label="Seaman Code"
                value={
                  form.seaman_code
                    ? `${form.seaman_code} - ${form.seaman_name}`
                    : ""
                }
                onSelect={handleSeamanSelect}
                error={errors.seaman_code}
                disabled={submitting}
              />

              <Field
                id="seafarer_code"
                label="Seafarer Code"
                error={errors.seafarer_code}
              >
                <Input
                  id="seafarer_code"
                  placeholder="Terisi otomatis setelah pilih Seaman Code"
                  value={form.seafarer_code}
                  disabled
                />
              </Field>

              <Field
                id="seaman_name"
                label="Seaman Name"
                error={errors.seaman_name}
              >
                <Input
                  id="seaman_name"
                  placeholder="Terisi otomatis setelah pilih Seaman Code"
                  value={form.seaman_name}
                  disabled
                />
              </Field>

              <Field id="position" label="Jabatan" error={errors.position}>
                <Input
                  id="position"
                  placeholder="Terisi otomatis setelah pilih Seaman Code"
                  value={form.position}
                  disabled
                />
              </Field>

              {form.ship && !shipStatus ? (
                // Kapal terisi otomatis dari data seaman — dikunci seperti
                // seafarer code/jabatan, tidak perlu diisi manual lagi.
                <Field id="ship" label="Nama Kapal" error={errors.ship}>
                  <Input id="ship" value={form.ship} disabled />
                  <p className="text-xs text-muted-foreground">
                    Terisi otomatis dari kapal terakhir seaman.
                  </p>
                </Field>
              ) : (
                <div className="space-y-1.5">
                  <ShipAutocompleteField
                    id="ship"
                    label="Nama Kapal"
                    value={form.ship}
                    onChange={(v) => handleChange("ship", v)}
                    error={errors.ship}
                    disabled={submitting}
                  />
                  {shipStatus && (
                    <p className="text-xs text-amber-600">
                      Seaman sedang tidak bertugas di kapal ({shipStatus}) —
                      pilih kapal secara manual.
                    </p>
                  )}
                </div>
              )}

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
            </div>

            <div className="space-y-1.5">
              <ReceiptUploadSection
                label="Kwitansi (PDF)"
                folder="receipt"
                paths={receiptPaths}
                onPathsChange={setReceiptPaths}
                disabled={submitting}
                error={receiptPathsError}
              />
              {receiptPaths.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-1 gap-1.5 border-purple-300 text-purple-700 hover:bg-purple-50"
                  disabled={extracting}
                  onClick={handleExtract}
                >
                  <Sparkles className="size-3.5" />
                  {extracting
                    ? "Mengekstrak..."
                    : "Ekstrak Otomatis dari Kwitansi"}
                </Button>
              )}
            </div>

            <Field id="diagnosis" label="Diagnosis" error={errors.diagnosis}>
              <Textarea
                id="diagnosis"
                rows={3}
                placeholder="Tulis diagnosis medis..."
                value={form.diagnosis}
                onChange={(e) => handleChange("diagnosis", e.target.value)}
              />
            </Field>
          </CardContent>
        </Card>

        <CostDetailSection
          mode={form.cr9_type === "reimbursement" ? "manual" : "master-data"}
          hospitalLabel={hospitalLabel}
          onHospitalSelect={handleHospitalSelect}
          hospitalNameManual={form.hospital_name_manual}
          onHospitalNameManualChange={(v) =>
            handleChange("hospital_name_manual", v)
          }
          hospitalError={errors.hospital_id}
          details={details}
          onDetailsChange={setDetails}
          detailsError={detailsError}
          disabled={submitting}
        />

        {/* Actions */}
        <div className="flex justify-end gap-3">
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
            disabled={submitting || cr9Status === "uploading"}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {submitting ? "Menyimpan..." : "Simpan Form CR9"}
          </Button>
        </div>
      </form>
    </div>
  )
}
