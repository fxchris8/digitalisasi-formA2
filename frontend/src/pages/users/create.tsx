import { useEffect, useState } from "react"
import { useNavigate } from "react-router"
import { toast } from "sonner"
import { listBranchOffices } from "@/api/branch-office"
import { createUser } from "@/api/users"
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
import { ROUTES } from "@/routes/config"
import type { BranchOffice } from "@/types/branch-office"
import type { CreateUserPayload } from "@/types/user"

// ─── Types ────────────────────────────────────────────────────────────────────

type FormState = {
  full_name: string
  username: string
  email: string
  password: string
  role: string
  department: string
  branch_office: string
}

type FormErrors = Partial<Record<keyof FormState, string>>

const EMPTY_FORM: FormState = {
  full_name: "",
  username: "",
  email: "",
  password: "",
  role: "",
  department: "",
  branch_office: "",
}

const ROLES = ["admin", "staff", "manager", "user"]
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
  if (!form.password) errors.password = "Password wajib diisi"
  else if (form.password.length < 8)
    errors.password = "Password minimal 8 karakter"
  if (!form.role) errors.role = "Role wajib dipilih"
  if (form.department === "cabang" && !form.branch_office)
    errors.branch_office = "Branch office wajib diisi untuk department cabang"
  return errors
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UsersCreatePage() {
  const navigate = useNavigate()
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [offices, setOffices] = useState<BranchOffice[]>([])

  const showBranchSelect = form.department === "cabang"

  useEffect(() => {
    listBranchOffices({ limit: 100 })
      .then((res) => setOffices(res.data))
      .catch(() => toast.error("Gagal memuat daftar cabang"))
  }, [])

  function handleChange(field: keyof FormState, value: string) {
    setForm((prev) => {
      const next = { ...prev, [field]: value }
      // reset branch_office jika department bukan cabang
      if (field === "department" && value !== "cabang") {
        next.branch_office = ""
      }
      return next
    })
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }))
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
      const payload: CreateUserPayload = {
        full_name: form.full_name.trim(),
        username: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        department: form.department || null,
        branch_office: form.department === "cabang" ? form.branch_office : null,
      }
      await createUser(payload)
      toast.success("User berhasil dibuat")
      navigate(ROUTES.users.path)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membuat user")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-semibold text-gray-900">Tambah User</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Buat akun pengguna baru untuk sistem.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Informasi User</CardTitle>
            <CardDescription>
              Isi semua field yang diperlukan. Password dapat diubah kembali
              dari halaman detail user.
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

              <Field id="password" label="Password" error={errors.password}>
                <Input
                  id="password"
                  type="password"
                  placeholder="Minimal 8 karakter"
                  value={form.password}
                  onChange={(e) => handleChange("password", e.target.value)}
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
                        <SelectItem key={r} value={r} className="capitalize">
                          {r}
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
                onClick={() => navigate(ROUTES.users.path)}
                disabled={submitting}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {submitting ? "Menyimpan..." : "Simpan User"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
