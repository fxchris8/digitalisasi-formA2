import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router"
import { toast } from "sonner"
import { getBranchOffice, updateBranchOffice } from "@/api/branch-office"
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

export default function BranchOfficeEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [form, setForm] = useState({ province: "", city: "" })
  const [errors, setErrors] = useState<{ province?: string; city?: string }>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!id) return
    getBranchOffice(id)
      .then((office) =>
        setForm({ province: office.province, city: office.city }),
      )
      .catch(() => toast.error("Gagal memuat data cabang"))
      .finally(() => setLoading(false))
  }, [id])

  function validate() {
    const e: typeof errors = {}
    if (!form.province.trim()) e.province = "Provinsi wajib diisi"
    if (!form.city.trim()) e.city = "Kota wajib diisi"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!id || !validate()) return
    setSaving(true)
    try {
      await updateBranchOffice(id, { province: form.province, city: form.city })
      toast.success("Cabang berhasil diperbarui")
      navigate(ROUTES.branchOffice.path)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal memperbarui cabang",
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
        <h1 className="text-4xl font-semibold text-gray-900">Edit Cabang</h1>
        <p className="mt-1 text-sm text-gray-500">
          Perbarui informasi kantor cabang.
        </p>
      </div>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Informasi Cabang</CardTitle>
          <CardDescription>
            Ubah provinsi atau kota kantor cabang.
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
                {saving ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
