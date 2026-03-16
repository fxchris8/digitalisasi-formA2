import { useCallback, useEffect, useState } from "react"
import { Link, useNavigate } from "react-router"
import { toast } from "sonner"
import { deleteBranchOffice, listBranchOffices } from "@/api/branch-office"
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
import { ROUTES } from "@/routes/config"
import type { BranchOffice } from "@/types/branch-office"

const PAGE_SIZE = 15

interface FilterState {
  province: string
  city: string
}

const EMPTY_FILTER: FilterState = { province: "", city: "" }

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

export default function BranchOfficePage() {
  const navigate = useNavigate()

  const [draft, setDraft] = useState<FilterState>(EMPTY_FILTER)
  const [applied, setApplied] = useState<FilterState>(EMPTY_FILTER)
  const [currentPage, setCurrentPage] = useState(1)

  const [offices, setOffices] = useState<BranchOffice[]>([])
  const [totalPages, setTotalPages] = useState(0)
  const [totalRows, setTotalRows] = useState(0)
  const [loading, setLoading] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<BranchOffice | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchOffices = useCallback(async () => {
    setLoading(true)
    try {
      const result = await listBranchOffices({
        page: currentPage,
        limit: PAGE_SIZE,
        province: applied.province || undefined,
        city: applied.city || undefined,
      })
      setOffices(result.data)
      setTotalPages(result.total_pages)
      setTotalRows(result.total)
    } catch {
      toast.error("Gagal memuat data cabang")
    } finally {
      setLoading(false)
    }
  }, [currentPage, applied])

  useEffect(() => {
    fetchOffices()
  }, [fetchOffices])

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
      await deleteBranchOffice(deleteTarget.id)
      toast.success("Cabang berhasil dihapus")
      setDeleteTarget(null)
      fetchOffices()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus cabang")
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
          <h1 className="text-4xl font-semibold text-gray-900">
            Kantor Cabang
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Kelola daftar kantor cabang yang tersedia.
          </p>
        </div>
        <Button asChild className="bg-red-600 hover:bg-red-700 text-white">
          <Link to={ROUTES.branchOfficeCreate.path}>Tambah Cabang</Link>
        </Button>
      </div>

      {/* Filter */}
      <Card>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="filter-province">Provinsi</Label>
              <Input
                id="filter-province"
                placeholder="Cari provinsi..."
                value={draft.province}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, province: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="filter-city">Kota</Label>
              <Input
                id="filter-city"
                placeholder="Cari kota..."
                value={draft.city}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, city: e.target.value }))
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
              <TableHead className="w-10 text-center">No</TableHead>
              <TableHead>Provinsi</TableHead>
              <TableHead>Kota</TableHead>
              <TableHead className="text-center">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  Memuat data...
                </TableCell>
              </TableRow>
            ) : offices.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  Tidak ada data yang sesuai.
                </TableCell>
              </TableRow>
            ) : (
              offices.map((office, index) => (
                <TableRow key={office.id}>
                  <TableCell className="text-center text-muted-foreground">
                    {startIdx + index + 1}
                  </TableCell>
                  <TableCell>{office.province}</TableCell>
                  <TableCell>{office.city}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        size="xs"
                        className="text-white text-[10px] bg-amber-600 hover:bg-amber-700"
                        onClick={() =>
                          navigate(`/branch-offices/${office.id}/edit`)
                        }
                      >
                        EDIT
                      </Button>
                      <Button
                        size="xs"
                        className="text-white text-[10px] bg-red-600 hover:bg-red-700"
                        onClick={() => setDeleteTarget(office)}
                      >
                        HAPUS
                      </Button>
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

      {/* Dialog Hapus */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus Cabang</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus cabang{" "}
              <span className="font-semibold">
                {deleteTarget?.city}, {deleteTarget?.province}
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
