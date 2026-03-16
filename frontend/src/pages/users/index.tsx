import { useCallback, useEffect, useState } from "react"
import { Link, useNavigate } from "react-router"
import { toast } from "sonner"
import { listUsers } from "@/api/users"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
import type { UserItem } from "@/types/user"

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

function RoleBadge({ role }: { role: string }) {
  const map: Record<string, string> = {
    admin: "bg-purple-100 text-purple-700",
    manager: "bg-blue-100 text-blue-700",
    staff: "bg-green-100 text-green-700",
    user: "bg-gray-100 text-gray-600",
  }
  const cls = map[role] ?? "bg-gray-100 text-gray-600"
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${cls}`}
    >
      {role}
    </span>
  )
}

export default function UsersPage() {
  const navigate = useNavigate()

  const [search, setSearch] = useState("")
  const [appliedSearch, setAppliedSearch] = useState("")
  const [currentPage, setCurrentPage] = useState(1)

  const [users, setUsers] = useState<UserItem[]>([])
  const [totalPages, setTotalPages] = useState(0)
  const [totalRows, setTotalRows] = useState(0)
  const [loading, setLoading] = useState(false)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const result = await listUsers({
        page: currentPage,
        limit: PAGE_SIZE,
        search: appliedSearch || undefined,
      })
      setUsers(result.data)
      setTotalPages(result.total_pages)
      setTotalRows(result.total)
    } catch {
      toast.error("Gagal memuat data users")
    } finally {
      setLoading(false)
    }
  }, [currentPage, appliedSearch])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  function handleSearch() {
    setAppliedSearch(search)
    setCurrentPage(1)
  }

  function handleReset() {
    setSearch("")
    setAppliedSearch("")
    setCurrentPage(1)
  }

  function goToPage(page: number) {
    if (page >= 1 && page <= totalPages) setCurrentPage(page)
  }

  const startIdx = (currentPage - 1) * PAGE_SIZE
  const pageNumbers = buildPageNumbers(currentPage, totalPages)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-semibold text-gray-900">Kelola Users</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manajemen akun pengguna sistem.
          </p>
        </div>
        <Button asChild className="bg-red-600 hover:bg-red-700 text-white">
          <Link to={ROUTES.userCreate.path}>Tambah User</Link>
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="search">Cari User</Label>
              <Input
                id="search"
                placeholder="Cari nama, username, atau email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
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
              <TableHead>Nama Lengkap</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Cabang</TableHead>
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
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  Tidak ada user yang ditemukan.
                </TableCell>
              </TableRow>
            ) : (
              users.map((u, index) => (
                <TableRow key={u.id}>
                  <TableCell className="text-center text-muted-foreground">
                    {startIdx + index + 1}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {u.full_name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {u.username}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {u.email}
                  </TableCell>
                  <TableCell>
                    <RoleBadge role={u.role} />
                  </TableCell>
                  <TableCell className="text-muted-foreground capitalize">
                    {u.department ?? "-"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {u.branch_office ?? "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        size="xs"
                        className="text-white text-[10px] bg-blue-500 hover:bg-blue-600"
                        onClick={() => navigate(`/users/${u.id}`)}
                      >
                        DETAIL
                      </Button>
                      <Button
                        size="xs"
                        className="text-white text-[10px] bg-amber-600 hover:bg-amber-700"
                        onClick={() => navigate(`/users/${u.id}/edit`)}
                      >
                        EDIT
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/30">
          <p className="text-xs text-muted-foreground">
            {loading
              ? "Memuat..."
              : totalRows === 0
                ? "Tidak ada data"
                : `Menampilkan ${startIdx + 1}–${Math.min(startIdx + PAGE_SIZE, totalRows)} dari ${totalRows} user`}
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
    </div>
  )
}
