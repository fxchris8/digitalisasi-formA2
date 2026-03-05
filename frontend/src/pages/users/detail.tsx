import { AlertTriangle } from "lucide-react"
import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router"
import { toast } from "sonner"
import { changeUserPassword, deleteUser, getUser } from "@/api/users"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/contexts/auth.context"
import { formatDate } from "@/lib/format"
import { ROUTES } from "@/routes/config"
import type { UserItem } from "@/types/user"

// ─── Info row helper ──────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center py-2 border-b last:border-0">
      <span className="sm:w-40 text-sm font-medium text-gray-600">{label}</span>
      <span className="text-sm text-gray-900 capitalize">{value}</span>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UsersDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()

  const [user, setUser] = useState<UserItem | null>(null)
  const [loading, setLoading] = useState(true)

  // Change password state
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [pwErrors, setPwErrors] = useState<{
    newPassword?: string
    confirmPassword?: string
  }>({})
  const [changingPw, setChangingPw] = useState(false)

  // Delete dialog state
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!id) return
    getUser(id)
      .then(setUser)
      .catch(() => toast.error("Gagal memuat data user"))
      .finally(() => setLoading(false))
  }, [id])

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    const errs: typeof pwErrors = {}
    if (!newPassword) errs.newPassword = "Password baru wajib diisi"
    else if (newPassword.length < 8)
      errs.newPassword = "Password minimal 8 karakter"
    if (!confirmPassword)
      errs.confirmPassword = "Konfirmasi password wajib diisi"
    else if (newPassword !== confirmPassword)
      errs.confirmPassword = "Password tidak cocok"

    if (Object.keys(errs).length > 0) {
      setPwErrors(errs)
      return
    }

    setChangingPw(true)
    try {
      await changeUserPassword(id as string, newPassword)
      toast.success("Password berhasil diubah")
      setNewPassword("")
      setConfirmPassword("")
      setPwErrors({})
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal mengubah password",
      )
    } finally {
      setChangingPw(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteUser(id as string)
      toast.success("User berhasil dihapus")
      navigate(ROUTES.users.path)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus user")
      setDeleting(false)
      setDeleteOpen(false)
    }
  }

  const isSelf = currentUser?.id === id

  if (loading) {
    return (
      <div className="py-20 text-center text-sm text-muted-foreground">
        Memuat data user...
      </div>
    )
  }

  if (!user) {
    return (
      <div className="py-20 text-center text-sm text-red-500">
        User tidak ditemukan.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-semibold text-gray-900">Detail User</h1>
          <p className="mt-0.5 text-sm text-gray-500">{user.full_name}</p>
        </div>
      </div>

      {/* Info */}
      <Card>
        <CardHeader>
          <CardTitle>Informasi Akun</CardTitle>
        </CardHeader>
        <CardContent>
          <InfoRow label="Nama Lengkap" value={user.full_name} />
          <InfoRow label="Username" value={user.username} />
          <InfoRow label="Email" value={user.email} />
          <InfoRow label="Role" value={user.role} />
          <InfoRow label="Department" value={user.department ?? "-"} />
          <InfoRow label="Kantor Cabang" value={user.branch_office ?? "-"} />
          <InfoRow label="Dibuat" value={formatDate(user.created_at)} />
          <InfoRow label="Diperbarui" value={formatDate(user.updated_at)} />
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle>Ubah Password</CardTitle>
          <CardDescription>
            Masukkan password baru untuk user ini.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="new_password">Password Baru</Label>
                <Input
                  id="new_password"
                  type="password"
                  placeholder="Minimal 8 karakter"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value)
                    if (pwErrors.newPassword)
                      setPwErrors((p) => ({ ...p, newPassword: undefined }))
                  }}
                  disabled={changingPw}
                />
                {pwErrors.newPassword && (
                  <p className="text-xs text-red-500">{pwErrors.newPassword}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm_password">Konfirmasi Password</Label>
                <Input
                  id="confirm_password"
                  type="password"
                  placeholder="Ulangi password baru"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value)
                    if (pwErrors.confirmPassword)
                      setPwErrors((p) => ({ ...p, confirmPassword: undefined }))
                  }}
                  disabled={changingPw}
                />
                {pwErrors.confirmPassword && (
                  <p className="text-xs text-red-500">
                    {pwErrors.confirmPassword}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={changingPw}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {changingPw ? "Menyimpan..." : "Ubah Password"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Delete */}
      {!isSelf && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">Hapus User</CardTitle>
            <CardDescription>
              Tindakan ini tidak dapat dibatalkan. User yang dihapus tidak bisa
              dipulihkan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
              Hapus User Ini
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-lg text-center">
          <DialogHeader className="items-center">
            <AlertTriangle className="h-14 w-14 text-red-500 mb-2" />
            <DialogTitle>Hapus User?</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus akun{" "}
              <span className="font-semibold">{user.full_name}</span>? Tindakan
              ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="justify-center sm:justify-center gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Menghapus..." : "Ya, Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
