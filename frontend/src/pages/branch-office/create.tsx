import { useState } from "react"
import { useNavigate } from "react-router"
import { toast } from "sonner"
import { createBranchOffice } from "@/api/branch-office"
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
import { ROUTES } from "@/routes/config"

export default function BranchOfficeCreatePage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ province: "", city: "" })
  const [errors, setErrors] = useState<{ province?: string; city?: string }>({})
  const [saving, setSaving] = useState(false)

  function validate() {
    const e: typeof errors = {}
    if (!form.province.trim()) e.province = "Provinsi wajib diisi"
    if (!form.city.trim()) e.city = "Kota wajib diisi"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      await createBranchOffice({ province: form.province, city: form.city })
      toast.success("Cabang berhasil ditambahkan")
      navigate(ROUTES.branchOffice.path)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal menambahkan cabang",
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-semibold text-gray-900">Tambah Cabang</h1>
        <p className="mt-1 text-sm text-gray-500">
          Tambahkan kantor cabang baru ke sistem.
        </p>
      </div>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Informasi Cabang</CardTitle>
          <CardDescription>
            Isi provinsi dan kota kantor cabang.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="province">
                Provinsi <span className="text-red-500">*</span>
              </Label>
              <Input
                id="province"
                placeholder="Cth: Jawa Timur"
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
                Kota <span className="text-red-500">*</span>
              </Label>
              <Input
                id="city"
                placeholder="Cth: Surabaya"
                value={form.city}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, city: e.target.value }))
                }
              />
              {errors.city && (
                <p className="text-xs text-red-500">{errors.city}</p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(ROUTES.branchOffice.path)}
                disabled={saving}
              >
                Batal
              </Button>
              <Button
                type="submit"
                className="bg-red-600 hover:bg-red-700 text-white"
                disabled={saving}
              >
                {saving ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
