import { useCallback, useEffect, useState } from "react"
import { Link, useNavigate } from "react-router"
import { toast } from "sonner"
import { deleteShip, listShips } from "@/api/ships"
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
import type { Ship } from "@/types/ship"

const PAGE_SIZE = 15

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

export default function ShipPage() {
  const navigate = useNavigate()

  const [draft, setDraft] = useState("")
  const [applied, setApplied] = useState("")
  const [currentPage, setCurrentPage] = useState(1)

  const [ships, setShips] = useState<Ship[]>([])
  const [totalPages, setTotalPages] = useState(0)
  const [totalRows, setTotalRows] = useState(0)
  const [loading, setLoading] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<Ship | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchShips = useCallback(async () => {
    setLoading(true)
    try {
      const result = await listShips({
        page: currentPage,
        limit: PAGE_SIZE,
        search: applied || undefined,
      })
      setShips(result.data)
      setTotalPages(result.total_pages)
      setTotalRows(result.total)
    } catch {
      toast.error("Gagal memuat data kapal")
    } finally {
      setLoading(false)
    }
  }, [currentPage, applied])

  useEffect(() => {
    fetchShips()
  }, [fetchShips])

  function handleSearch() {
    setApplied(draft)
    setCurrentPage(1)
  }

  function handleReset() {
    setDraft("")
    setApplied("")
    setCurrentPage(1)
  }

  function goToPage(page: number) {
    if (page >= 1 && page <= totalPages) setCurrentPage(page)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteShip(deleteTarget.id)
      toast.success("Kapal berhasil dihapus")
      setDeleteTarget(null)
      fetchShips()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus kapal")
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
          <h1 className="text-4xl font-semibold text-gray-900">Kelola Kapal</h1>
          <p className="mt-1 text-sm text-gray-500">
            Master data kapal — dipakai untuk pengisian Form CR9.
          </p>
        </div>
        <Button asChild className="bg-red-600 hover:bg-red-700 text-white">
          <Link to={ROUTES.shipCreate.path}>Tambah Kapal</Link>
        </Button>
      </div>

      {/* Filter */}
      <Card>
        <CardContent>
          <div className="space-y-1.5">
            <Label htmlFor="filter-search">Cari</Label>
            <Input
              id="filter-search"
              placeholder="Cari nama kapal..."
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
            />
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
              <TableHead>Nama Kapal</TableHead>
              <TableHead className="text-center">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  Memuat data...
                </TableCell>
              </TableRow>
            ) : ships.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={3}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  Tidak ada data yang sesuai.
                </TableCell>
              </TableRow>
            ) : (
              ships.map((ship, index) => (
                <TableRow key={ship.id}>
                  <TableCell className="text-center text-muted-foreground">
                    {startIdx + index + 1}
                  </TableCell>
                  <TableCell className="font-medium">{ship.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        size="xs"
                        className="text-white text-[10px] bg-amber-600 hover:bg-amber-700"
                        onClick={() => navigate(`/ships/${ship.id}/edit`)}
                      >
                        EDIT
                      </Button>
                      <Button
                        size="xs"
                        className="text-white text-[10px] bg-red-600 hover:bg-red-700"
                        onClick={() => setDeleteTarget(ship)}
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
            <DialogTitle>Hapus Kapal</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus{" "}
              <span className="font-semibold">{deleteTarget?.name}</span>?
              Tindakan ini tidak dapat dibatalkan.
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
