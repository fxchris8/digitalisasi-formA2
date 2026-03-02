import { Eye, Pencil, Trash2 } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { Link, useNavigate } from "react-router"
import { toast } from "sonner"
import { deleteFormCr9, listFormCr9 } from "@/api/form-cr9"
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
import { ROLES } from "@/lib/rbac"
import { ROUTES } from "@/routes/config"
import type { FormCr9, FormCr9Status } from "@/types/form-cr9"

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10

// ─── Types ────────────────────────────────────────────────────────────────────

interface FilterState {
  form_number: string
  seaman_name: string
  seaman_code: string
  ship: string
  from_date: string
  to_date: string
}

const EMPTY_FILTER: FilterState = {
  form_number: "",
  seaman_name: "",
  seaman_code: "",
  ship: "",
  from_date: "",
  to_date: "",
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  FormCr9Status,
  { label: string; className: string }
> = {
  draft: { label: "Draft", className: "bg-gray-100 text-gray-600" },
  submitted: { label: "Diajukan", className: "bg-blue-100 text-blue-700" },
  approved: { label: "Disetujui", className: "bg-green-100 text-green-700" },
  rejected: { label: "Ditolak", className: "bg-red-100 text-red-700" },
}

function StatusBadge({ status }: { status: FormCr9Status }) {
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

export default function FormCr9Page() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [draft, setDraft] = useState<FilterState>(EMPTY_FILTER)
  const [applied, setApplied] = useState<FilterState>(EMPTY_FILTER)
  const [currentPage, setCurrentPage] = useState(1)

  const [forms, setForms] = useState<FormCr9[]>([])
  const [totalPages, setTotalPages] = useState(0)
  const [totalRows, setTotalRows] = useState(0)
  const [loading, setLoading] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<FormCr9 | null>(null)
  const [deleting, setDeleting] = useState(false)

  const canCreateOrRevise =
    user?.role === ROLES.ADMIN ||
    (user?.role === ROLES.STAFF &&
      (user?.department === "cabang" || user?.department === "spm"))

  const canDelete = user?.role === ROLES.ADMIN

  const fetchForms = useCallback(async () => {
    setLoading(true)
    try {
      const result = await listFormCr9({
        page: currentPage,
        limit: PAGE_SIZE,
        form_number: applied.form_number || undefined,
        seaman_name: applied.seaman_name || undefined,
        seaman_code: applied.seaman_code || undefined,
        ship: applied.ship || undefined,
        from_date: applied.from_date || undefined,
        to_date: applied.to_date || undefined,
      })
      setForms(result.data)
      setTotalPages(result.total_pages)
      setTotalRows(result.total)
    } catch {
      toast.error("Gagal memuat data Form CR9")
    } finally {
      setLoading(false)
    }
  }, [currentPage, applied])

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

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteFormCr9(deleteTarget.id)
      toast.success("Form CR9 berhasil dihapus")
      setDeleteTarget(null)
      fetchForms()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal menghapus Form CR9",
      )
    } finally {
      setDeleting(false)
    }
  }

  const startIdx = (currentPage - 1) * PAGE_SIZE
  const pageNumbers = buildPageNumbers(currentPage, totalPages)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-semibold text-gray-900">Form CR9</h1>
          <p className="mt-1 text-sm text-gray-500">
            Informasi Pengajuan dan Form CR9 Crew Kapal.
          </p>
        </div>
        {canCreateOrRevise && (
          <Button asChild className="bg-blue-500 hover:bg-blue-600 text-white">
            <Link to={ROUTES.formCr9Create.path}>Buat Baru</Link>
          </Button>
        )}
      </div>

      {/* Filter / Search */}
      <Card>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="filter-form-number">Nomor Surat CR9</Label>
              <Input
                id="filter-form-number"
                placeholder="Cth: CR9/Surabaya/0001/01/2026"
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
                  setDraft((prev) => ({ ...prev, seaman_name: e.target.value }))
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="filter-seaman-code">Seaman Code</Label>
              <Input
                id="filter-seaman-code"
                placeholder="Cth: ABK-20240118"
                value={draft.seaman_code}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, seaman_code: e.target.value }))
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="filter-ship">Kapal</Label>
              <Input
                id="filter-ship"
                placeholder="Cari nama kapal..."
                value={draft.ship}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, ship: e.target.value }))
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
      <div className="rounded-lg border bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-10">No</TableHead>
              <TableHead>Nomor Surat</TableHead>
              <TableHead>Seaman Name</TableHead>
              <TableHead>Seaman Code</TableHead>
              <TableHead>Kapal</TableHead>
              <TableHead>Tanggal Pengajuan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  Memuat data...
                </TableCell>
              </TableRow>
            ) : forms.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
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
                    {form.seaman_name}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {form.seaman_code}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {form.ship}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {new Date(form.created_at).toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={form.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title="Lihat Detail"
                        className="text-muted-foreground hover:text-blue-600"
                        onClick={() => navigate(`/form-cr9/${form.id}`)}
                      >
                        <Eye size={15} />
                      </Button>

                      {canCreateOrRevise && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="Edit"
                          className="text-muted-foreground hover:text-amber-600"
                          disabled={form.status === "approved"}
                          onClick={() => navigate(`/form-cr9/${form.id}/edit`)}
                        >
                          <Pencil size={15} />
                        </Button>
                      )}

                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="Hapus"
                          className="text-muted-foreground hover:text-red-600"
                          onClick={() => setDeleteTarget(form)}
                        >
                          <Trash2 size={15} />
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

      {/* Dialog Konfirmasi Hapus */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Form CR9</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus form{" "}
              <span className="font-mono font-semibold">
                {deleteTarget?.form_number}
              </span>
              ? Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
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
