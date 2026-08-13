import { useState } from "react"
import { useNavigate } from "react-router"
import { toast } from "sonner"
import { createShip } from "@/api/ships"
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

export default function ShipCreatePage() {
  const navigate = useNavigate()
  const [name, setName] = useState("")
  const [error, setError] = useState<string | undefined>()
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError("Nama kapal wajib diisi")
      return
    }

    setSaving(true)
    try {
      await createShip({ name: name.trim() })
      toast.success("Kapal berhasil ditambahkan")
      navigate(ROUTES.ship.path)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal menambahkan kapal!",
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-semibold text-gray-900">Tambah Kapal</h1>
        <p className="mt-1 text-sm text-gray-500">
          Tambahkan kapal baru ke master data.
        </p>
      </div>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Informasi Kapal</CardTitle>
          <CardDescription>Isi nama kapal.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">
                Nama Kapal <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Cth: KM. SPIL Ningsih"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  if (error) setError(undefined)
                }}
              />
              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(ROUTES.ship.path)}
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
