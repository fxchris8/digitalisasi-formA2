import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router"
import { toast } from "sonner"
import { getShip, updateShip } from "@/api/ships"
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

export default function ShipEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [name, setName] = useState("")
  const [error, setError] = useState<string | undefined>()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!id) return
    getShip(id)
      .then((ship) => setName(ship.name))
      .catch(() => toast.error("Gagal memuat data kapal"))
      .finally(() => setLoading(false))
  }, [id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!id) return
    if (!name.trim()) {
      setError("Nama kapal wajib diisi")
      return
    }

    setSaving(true)
    try {
      await updateShip(id, { name: name.trim() })
      toast.success("Kapal berhasil diperbarui")
      navigate(ROUTES.ship.path)
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal memperbarui kapal",
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
        <h1 className="text-4xl font-semibold text-gray-900">Edit Kapal</h1>
        <p className="mt-1 text-sm text-gray-500">Perbarui nama kapal.</p>
      </div>

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Informasi Kapal</CardTitle>
          <CardDescription>Ubah nama kapal di bawah ini.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">
                Nama Kapal <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
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
                {saving ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
