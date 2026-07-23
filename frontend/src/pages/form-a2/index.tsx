import { AlertTriangle } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { Link, useNavigate } from "react-router"
import { toast } from "sonner"
import { listPendingApproval } from "@/api/approval"
import { listFormA2, submitFormA2 } from "@/api/form-a2"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAuth } from "@/contexts/auth.context"
import { formatDate } from "@/lib/format"
import { getManagerStep, ROLES } from "@/lib/rbac"
import { ROUTES } from "@/routes/config"
import type { FormA2, FormA2Status } from "@/types/form-a2"

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10

// ─── Types ────────────────────────────────────────────────────────────────────

interface FilterState {
  form_number: string
  seaman_name: string
  from_date: string
  to_date: string
}

const EMPTY_FILTER: FilterState = {
  form_number: "",
  seaman_name: "",
  from_date: "",
  to_date: "",
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  FormA2Status,
  { label: string; className: string }
> = {
  draft: { label: "Draft", className: "bg-gray-100 text-gray-600" },
  submitted: { label: "Diajukan", className: "bg-blue-100 text-blue-700" },
  pending: { label: "Pending", className: "bg-yellow-100 text-yellow-700" },
  revision: { label: "Revisi", className: "bg-orange-100 text-orange-700" },
  approved: { label: "Disetujui", className: "bg-green-100 text-green-700" },
  rejected: { label: "Ditolak", className: "bg-red-100 text-red-700" },
}

// Tujuan pengajuan tidak selalu Manager Nautica — kalau ini resubmit setelah
// revisi, tujuannya adalah step yang tadi minta revisi (bisa SPM atau Finance).
const STEP_LABEL: Record<string, string> = {
  nautica: "Manager Nautica",
  spm: "Manager SPM",
  finance: "Finance",
}

function StatusBadge({ status }: { status: FormA2Status }) {
  const cfg = STATUS_CONFIG[status] ?? {
    label: status,
    className: "bg-gray-100 text-gray-600",
  }
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.className}`}
    >
      {cfg.label}
    </span>
  )
}

type PageItem = number | { type: "ellipsis"; id: "left" | "right" }

function buildPageNumbers(current: number, total: number): PageItem[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const pages: PageItem[] = [1]
  if (current > 3) pages.push({ type: "ellipsis", id: "left" })
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  for (let i = start; i <= end; i++) pages.push(i)
  if (current < total - 2) pages.push({ type: "ellipsis", id: "right" })
  pages.push(total)
  return pages
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FormA2Page() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [draft, setDraft] = useState<FilterState>(EMPTY_FILTER)
  const [applied, setApplied] = useState<FilterState>(EMPTY_FILTER)
  const [currentPage, setCurrentPage] = useState(1)

  const [forms, setForms] = useState<FormA2[]>([])
  const [totalPages, setTotalPages] = useState(0)
  const [totalRows, setTotalRows] = useState(0)
  const [loading, setLoading] = useState(false)
  const [submitTarget, setSubmitTarget] = useState<FormA2 | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [onlyPendingApproval, setOnlyPendingApproval] = useState(false)

  const canManage =
    user?.role === ROLES.ADMIN ||
    (user?.role === ROLES.STAFF && user?.department === "spm")

  const myStep = user ? getManagerStep(user) : null

  const fetchForms = useCallback(async () => {
    setLoading(true)
    try {
      if (onlyPendingApproval && myStep) {
        const rows = await listPendingApproval()
        setForms(rows)
        setTotalPages(1)
        setTotalRows(rows.length)
        return
      }

      const result = await listFormA2({
        page: currentPage,
        limit: PAGE_SIZE,
        form_number: applied.form_number || undefined,
        seaman_name: applied.seaman_name || undefined,
        from_date: applied.from_date || undefined,
        to_date: applied.to_date || undefined,
      })
      setForms(result.data)
      setTotalPages(result.total_pages)
      setTotalRows(result.total)
    } catch {
      toast.error("Gagal memuat data Form A2")
    } finally {
      setLoading(false)
    }
  }, [currentPage, applied, onlyPendingApproval, myStep])

  useEffect(() => {
    fetchForms()
  }, [fetchForms])

  function handleSearch() {
    setApplied({ ...draft })
    setCurrentPage(1)
  }

  function handleReset() {
    setDraft(EMPTY_FILTER)
    setApplied(EMPTY_FILTER)
    setCurrentPage(1)
  }

  function goToPage(page: number) {
    if (page >= 1 && page <= totalPages) setCurrentPage(page)
  }

  async function handleSubmit() {
    if (!submitTarget) return
    setSubmitting(true)
    try {
      const result = await submitFormA2(submitTarget.id)
      setSubmitTarget(null)
      const destination = result.current_step
        ? (STEP_LABEL[result.current_step] ?? result.current_step)
        : "manager"
      toast.success(`Form A2 berhasil diajukan ke ${destination}`)
      fetchForms()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal mengajukan Form A2",
      )
    } finally {
      setSubmitting(false)
    }
  }

  const startIdx = (currentPage - 1) * PAGE_SIZE
  const pageNumbers = buildPageNumbers(currentPage, totalPages)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-semibold text-gray-900">Form A2</h1>
          <p className="mt-1 text-sm text-gray-500">
            Informasi Pengajuan Form A2 untuk Klaim Asuransi Kesehatan Seaman.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {myStep && (
            <Button
              variant={onlyPendingApproval ? "default" : "outline"}
              className={
                onlyPendingApproval
                  ? "bg-yellow-500 hover:bg-yellow-600 text-white"
                  : ""
              }
              onClick={() => {
                setOnlyPendingApproval((prev) => !prev)
                setCurrentPage(1)
              }}
            >
              {onlyPendingApproval
                ? "Menampilkan: Perlu Approval Saya"
                : "Tampilkan yang Perlu Approval Saya"}
            </Button>
          )}
          {canManage && (
            <Button asChild className="bg-red-600 hover:bg-red-700 text-white">
              <Link to={ROUTES.formA2Create.path}>Buat Baru</Link>
            </Button>
          )}
        </div>
      </div>

      {/* Filter */}
      <Card>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="filter-form-number">Nomor Surat</Label>
              <Input
                id="filter-form-number"
                placeholder="Cth: A2/0001/01/2026"
                value={draft.form_number}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, form_number: e.target.value }))
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="filter-seaman-name">Seaman Name</Label>
              <Input
                id="filter-seaman-name"
                placeholder="Cari nama seaman..."
                value={draft.seaman_name}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    seaman_name: e.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="filter-from-date">Dari Tanggal</Label>
              <Input
                id="filter-from-date"
                type="date"
                value={draft.from_date}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, from_date: e.target.value }))
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="filter-to-date">Sampai Tanggal</Label>
              <Input
                id="filter-to-date"
                type="date"
                value={draft.to_date}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, to_date: e.target.value }))
                }
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={handleReset}>
              Reset
            </Button>
            <Button
              onClick={handleSearch}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Cari
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabel */}
      <div className="rounded-lg border bg-white overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-10">No</TableHead>
              <TableHead>Nomor Surat A2</TableHead>
              <TableHead>Nomor Surat CR9</TableHead>
              <TableHead>Seaman Name</TableHead>
              <TableHead>Seaman Code</TableHead>
              <TableHead>Kapal</TableHead>
              <TableHead>Cabang</TableHead>
              <TableHead>Tanggal Pengajuan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  Memuat data...
                </TableCell>
              </TableRow>
            ) : forms.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  Tidak ada data yang sesuai dengan filter.
                </TableCell>
              </TableRow>
            ) : (
              forms.map((form, index) => (
                <TableRow key={form.id}>
                  <TableCell className="whitespace-nowrap text-center text-muted-foreground">
                    {startIdx + index + 1}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {form.form_number}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {form.cr9_form_number}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {form.seaman_name}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {form.seaman_code}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {form.ship}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {form.branch_office}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDate(form.created_at)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <StatusBadge status={form.status} />
                      {myStep && form.current_step === myStep && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-yellow-100 text-yellow-800">
                          Perlu Approval Anda
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        size="xs"
                        title="Lihat Detail"
                        className="text-white text-[10px] bg-blue-500 hover:bg-blue-600"
                        onClick={() => navigate(`/form-a2/${form.id}`)}
                      >
                        DETAIL
                      </Button>

                      {canManage &&
                        (form.status === "draft" ||
                          form.status === "revision") && (
                          <Button
                            size="xs"
                            title="Edit"
                            className="text-white text-[10px] bg-amber-600 hover:bg-amber-700"
                            onClick={() => navigate(`/form-a2/${form.id}/edit`)}
                          >
                            EDIT
                          </Button>
                        )}

                      {canManage &&
                        (form.status === "draft" ||
                          form.status === "revision") && (
                          <Button
                            size="xs"
                            title="Ajukan ke Manager"
                            className="text-white text-[10px] bg-green-600 hover:bg-green-700"
                            onClick={() => setSubmitTarget(form)}
                          >
                            AJUKAN
                          </Button>
                        )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Footer: info + pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/30">
          <p className="text-xs text-muted-foreground">
            {loading
              ? "Memuat..."
              : totalRows === 0
                ? "Tidak ada data"
                : `Menampilkan ${startIdx + 1}–${Math.min(startIdx + PAGE_SIZE, totalRows)} dari ${totalRows} data`}
          </p>

          {totalPages > 1 && (
            <Pagination className="w-auto mx-0">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={(e) => {
                      e.preventDefault()
                      goToPage(currentPage - 1)
                    }}
                    aria-disabled={currentPage === 1}
                    className={
                      currentPage === 1
                        ? "pointer-events-none opacity-50"
                        : "cursor-pointer"
                    }
                  />
                </PaginationItem>

                {pageNumbers.map((page) =>
                  typeof page === "object" ? (
                    <PaginationItem key={`ellipsis-${page.id}`}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={page}>
                      <PaginationLink
                        isActive={page === currentPage}
                        onClick={(e) => {
                          e.preventDefault()
                          goToPage(page)
                        }}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  ),
                )}

                <PaginationItem>
                  <PaginationNext
                    onClick={(e) => {
                      e.preventDefault()
                      goToPage(currentPage + 1)
                    }}
                    aria-disabled={currentPage === totalPages}
                    className={
                      currentPage === totalPages
                        ? "pointer-events-none opacity-50"
                        : "cursor-pointer"
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      </div>

      {/* Dialog Konfirmasi Ajukan */}
      <Dialog
        open={submitTarget !== null}
        onOpenChange={(open) => {
          if (!open) setSubmitTarget(null)
        }}
      >
        <DialogContent className="sm:max-w-lg text-center">
          <DialogHeader className="items-center">
            <AlertTriangle className="h-14 w-14 text-green-600 mb-2" />
            <DialogTitle>Ajukan Form A2?</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin mengajukan form ini ke manager? Form tidak
              dapat diedit setelah diajukan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="justify-center sm:justify-center gap-2">
            <Button
              variant="outline"
              onClick={() => setSubmitTarget(null)}
              disabled={submitting}
            >
              Batal
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {submitting ? "Mengajukan..." : "Ya, Ajukan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
