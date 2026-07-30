import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router"
import { toast } from "sonner"
import { listBranchOffices } from "@/api/branch-office"
import { getUser, updateUser } from "@/api/users"
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { BranchOffice } from "@/types/branch-office"
import type { UserItem } from "@/types/user"

// ─── Types ────────────────────────────────────────────────────────────────────

type FormState = {
  full_name: string
  username: string
  email: string
  role: string
  department: string
  branch_office: string
}

type FormErrors = Partial<Record<keyof FormState, string>>

const ROLES = ["admin", "staff", "admin_spm", "manager", "user"]
const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  staff: "Staff",
  admin_spm: "Admin SPM",
  manager: "Manager",
  user: "User",
}
const DEPARTMENTS = ["spm", "nautica", "finance", "cabang"]

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

function validate(form: FormState): FormErrors {
  const errors: FormErrors = {}
  if (!form.full_name.trim()) errors.full_name = "Nama lengkap wajib diisi"
  if (!form.username.trim()) errors.username = "Username wajib diisi"
  else if (form.username.length < 3)
    errors.username = "Username minimal 3 karakter"
  else if (!/^[a-zA-Z0-9_]+$/.test(form.username))
    errors.username = "Username hanya boleh huruf, angka, dan underscore"
  if (!form.email.trim()) errors.email = "Email wajib diisi"
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
    errors.email = "Format email tidak valid"
  if (!form.role) errors.role = "Role wajib dipilih"
  if (form.department === "cabang" && !form.branch_office)
    errors.branch_office = "Branch office wajib diisi untuk department cabang"
  return errors
}

function userToForm(u: UserItem): FormState {
  return {
    full_name: u.full_name,
    username: u.username,
    email: u.email,
    role: u.role,
    department: u.department ?? "",
    branch_office: u.branch_office ?? "",
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UsersEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [form, setForm] = useState<FormState | null>(null)
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [offices, setOffices] = useState<BranchOffice[]>([])
  const [loadingUser, setLoadingUser] = useState(true)

  useEffect(() => {
    if (!id) return
    Promise.all([getUser(id), listBranchOffices({ limit: 100 })])
      .then(([u, officeList]) => {
        setForm(userToForm(u))
        setOffices(officeList.data)
      })
      .catch(() => toast.error("Gagal memuat data user"))
      .finally(() => setLoadingUser(false))
  }, [id])

  function handleChange(field: keyof FormState, value: string) {
    setForm((prev) => {
      if (!prev) return prev
      const next = { ...prev, [field]: value }
      if (field === "department" && value !== "cabang") {
        next.branch_office = ""
      }
      return next
    })
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form) return

    const errs = validate(form)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    setSubmitting(true)
    try {
      await updateUser(id as string, {
        full_name: form.full_name.trim(),
        username: form.username.trim(),
        email: form.email.trim(),
        role: form.role,
        department: form.department || null,
        branch_office: form.department === "cabang" ? form.branch_office : null,
      })
      toast.success("User berhasil diperbarui")
      navigate(`/users/${id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memperbarui user")
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingUser) {
    return (
      <div className="py-20 text-center text-sm text-muted-foreground">
        Memuat data user...
      </div>
    )
  }

  if (!form) {
    return (
      <div className="py-20 text-center text-sm text-red-500">
        User tidak ditemukan.
      </div>
    )
  }

  const showBranchSelect = form.department === "cabang"

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-semibold text-gray-900">Edit User</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Perbarui informasi akun pengguna.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Informasi User</CardTitle>
            <CardDescription>
              Ubah field yang perlu diperbarui. Password dikelola terpisah dari
              halaman detail.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Field
                id="full_name"
                label="Nama Lengkap"
                error={errors.full_name}
              >
                <Input
                  id="full_name"
                  placeholder="Nama lengkap user"
                  value={form.full_name}
                  onChange={(e) => handleChange("full_name", e.target.value)}
                  disabled={submitting}
                />
              </Field>

              <Field id="username" label="Username" error={errors.username}>
                <Input
                  id="username"
                  placeholder="Cth: john_doe"
                  value={form.username}
                  onChange={(e) => handleChange("username", e.target.value)}
                  disabled={submitting}
                />
              </Field>

              <Field id="email" label="Email" error={errors.email}>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  value={form.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  disabled={submitting}
                />
              </Field>

              <Field id="role" label="Role" error={errors.role}>
                <Select
                  value={form.role}
                  onValueChange={(v) => handleChange("role", v)}
                  disabled={submitting}
                >
                  <SelectTrigger id="role" className="w-full">
                    <SelectValue placeholder="-- Pilih Role --" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Role</SelectLabel>
                      {ROLES.map((r) => (
                        <SelectItem key={r} value={r}>
                          {ROLE_LABELS[r] ?? r}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              <Field
                id="department"
                label="Department"
                error={errors.department}
              >
                <Select
                  value={form.department}
                  onValueChange={(v) => handleChange("department", v)}
                  disabled={submitting}
                >
                  <SelectTrigger id="department" className="w-full">
                    <SelectValue placeholder="-- Pilih Department (opsional) --" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Department</SelectLabel>
                      {DEPARTMENTS.map((d) => (
                        <SelectItem key={d} value={d} className="capitalize">
                          {d}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>

              {showBranchSelect && (
                <Field
                  id="branch_office"
                  label="Kantor Cabang"
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
                          <SelectItem key={o.id} value={o.city}>
                            {o.city}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(`/users/${id}`)}
                disabled={submitting}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={submitting}
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
