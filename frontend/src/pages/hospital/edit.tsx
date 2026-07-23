import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router"
import { toast } from "sonner"
import { getHospital, updateHospital } from "@/api/hospitals"
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
import { ROUTES } from "@/routes/config"
import type { HospitalCategory } from "@/types/hospital"

interface FormState {
  name: string
  province: string
  city: string
  category: HospitalCategory | ""
  owner_type: string
}

const EMPTY_FORM: FormState = {
  name: "",
  province: "",
  city: "",
  category: "",
  owner_type: "",
}

type FormErrors = Partial<Record<keyof FormState, string>>

export default function HospitalEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<FormErrors>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!id) return
    getHospital(id)
      .then((hospital) =>
        setForm({
          name: hospital.name,
          province: hospital.province,
          city: hospital.city,
          category: hospital.category,
          owner_type: hospital.owner_type ?? "",
        }),
      )
      .catch(() => toast.error("Gagal memuat data rumah sakit"))
      .finally(() => setLoading(false))
  }, [id])

  function validate(): FormErrors {
    const e: FormErrors = {}
    if (!form.name.trim()) e.name = "Nama rumah sakit wajib diisi"
    if (!form.province.trim()) e.province = "Provinsi wajib diisi"
    if (!form.city.trim()) e.city = "Kab/Kota wajib diisi"
    if (!form.category) e.category = "Kategori wajib dipilih"
    return e
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!id) return
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    setSaving(true)
    try {
      await updateHospital(id, {
        name: form.name.trim(),
        province: form.province.trim(),
        city: form.city.trim(),
        category: form.category as HospitalCategory,
        owner_type: form.owner_type.trim() || undefined,
      })
      toast.success("Rumah sakit berhasil diperbarui")
      navigate(ROUTES.hospital.path)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal memperbarui rumah sakit",
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-semibold text-gray-900">
          Edit Rumah Sakit
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Perbarui informasi rumah sakit.
        </p>
      </div>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Informasi Rumah Sakit</CardTitle>
          <CardDescription>Ubah data rumah sakit di bawah ini.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">
                Nama Rumah Sakit <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
              />
              {errors.name && (
                <p className="text-xs text-red-500">{errors.name}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="province">
                Provinsi <span className="text-red-500">*</span>
              </Label>
              <Input
                id="province"
                value={form.province}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, province: e.target.value }))
                }
              />
              {errors.province && (
                <p className="text-xs text-red-500">{errors.province}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="city">
                Kab/Kota <span className="text-red-500">*</span>
              </Label>
              <Input
                id="city"
                value={form.city}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, city: e.target.value }))
                }
              />
              {errors.city && (
                <p className="text-xs text-red-500">{errors.city}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>
                Kategori <span className="text-red-500">*</span>
              </Label>
              <RadioGroup
                value={form.category}
                onValueChange={(v) =>
                  setForm((prev) => ({
                    ...prev,
                    category: v as HospitalCategory,
                  }))
                }
                className="flex gap-6 pt-1"
              >
                <label
                  htmlFor="cat-swasta"
                  className="flex items-center gap-2 cursor-pointer text-sm"
                >
                  <RadioGroupItem value="swasta" id="cat-swasta" />
                  Swasta
                </label>
                <label
                  htmlFor="cat-pemerintah"
                  className="flex items-center gap-2 cursor-pointer text-sm"
                >
                  <RadioGroupItem value="pemerintah" id="cat-pemerintah" />
                  Pemerintah
                </label>
              </RadioGroup>
              {errors.category && (
                <p className="text-xs text-red-500">{errors.category}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="owner_type">Pemilik</Label>
              <Input
                id="owner_type"
                placeholder="Cth: Pemkab, BUMN, TNI AL (opsional)"
                value={form.owner_type}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, owner_type: e.target.value }))
                }
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(ROUTES.hospital.path)}
                disabled={saving}
              >
                Batal
              </Button>
              <Button
                type="submit"
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={saving}
              >
                {saving ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
