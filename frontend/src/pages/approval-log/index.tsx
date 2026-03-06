import { useCallback, useEffect, useState } from "react"
import { useNavigate } from "react-router"
import { toast } from "sonner"
import { listApprovalLogs } from "@/api/approval"
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
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatDateTime } from "@/lib/format"
import { ROUTES } from "@/routes/config"
import type { ApprovalLogItem } from "@/types/approval"
import type { ApprovalStatus, ApprovalStep } from "@/types/form-a2"

const PAGE_SIZE = 15

const STEP_LABEL: Record<ApprovalStep, string> = {
  spm: "Manager SPM",
  nautica: "Manager Nautica",
  finance: "Finance",
}

const STATUS_LABEL: Record<ApprovalStatus, string> = {
  pending: "Pending",
  approved: "Disetujui",
  revision: "Revisi",
  rejected: "Ditolak",
}

const STATUS_CLASS: Record<ApprovalStatus, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-green-100 text-green-700",
  revision: "bg-orange-100 text-orange-700",
  rejected: "bg-red-100 text-red-700",
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

function StatusBadge({ status }: { status: ApprovalStatus }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_CLASS[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  )
}

export default function ApprovalLogPage() {
  const navigate = useNavigate()

  // filter state (draft — belum di-apply)
  const [formNumber, setFormNumber] = useState("")
  const [seamanName, setSeamanName] = useState("")
  const [step, setStep] = useState<string>("all")
  const [status, setStatus] = useState<string>("all")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")

  // applied filter (yang benar-benar dikirim ke API)
  const [applied, setApplied] = useState({
    formNumber: "",
    seamanName: "",
    step: "all",
    status: "all",
    fromDate: "",
    toDate: "",
  })

  const [currentPage, setCurrentPage] = useState(1)
  const [rows, setRows] = useState<ApprovalLogItem[]>([])
  const [totalPages, setTotalPages] = useState(0)
  const [totalRows, setTotalRows] = useState(0)
  const [loading, setLoading] = useState(false)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const result = await listApprovalLogs({
        page: currentPage,
        limit: PAGE_SIZE,
        form_number: applied.formNumber || undefined,
        seaman_name: applied.seamanName || undefined,
        step:
          applied.step !== "all" ? (applied.step as ApprovalStep) : undefined,
        status:
          applied.status !== "all"
            ? (applied.status as ApprovalStatus)
            : undefined,
        from_date: applied.fromDate || undefined,
        to_date: applied.toDate || undefined,
      })
      setRows(result.data)
      setTotalPages(result.total_pages)
      setTotalRows(result.total)
    } catch {
      toast.error("Gagal memuat approval log")
    } finally {
      setLoading(false)
    }
  }, [currentPage, applied])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  function handleSearch() {
    setApplied({ formNumber, seamanName, step, status, fromDate, toDate })
    setCurrentPage(1)
  }

  function handleReset() {
    setFormNumber("")
    setSeamanName("")
    setStep("all")
    setStatus("all")
    setFromDate("")
    setToDate("")
    setApplied({
      formNumber: "",
      seamanName: "",
      step: "all",
      status: "all",
      fromDate: "",
      toDate: "",
    })
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
      <div>
        <h1 className="text-4xl font-semibold text-gray-900">Approval Log</h1>
        <p className="mt-1 text-sm text-gray-500">
          Riwayat seluruh tindakan approval Form A2.
        </p>
      </div>

      {/* Filter */}
      <Card>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="form-number">Nomor Form</Label>
              <Input
                id="form-number"
                placeholder="Cari nomor A2 atau CR9..."
                value={formNumber}
                onChange={(e) => setFormNumber(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="seaman-name">Nama Seaman</Label>
              <Input
                id="seaman-name"
                placeholder="Cari nama seaman..."
                value={seamanName}
                onChange={(e) => setSeamanName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Step</Label>
              <Select value={step} onValueChange={setStep}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Semua step" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Step</SelectLabel>
                    <SelectItem value="all">Semua Step</SelectItem>
                    <SelectItem value="spm">Manager SPM</SelectItem>
                    <SelectItem value="nautica">Manager Nautica</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Semua status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Status</SelectLabel>
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="approved">Disetujui</SelectItem>
                    <SelectItem value="revision">Revisi</SelectItem>
                    <SelectItem value="rejected">Ditolak</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="from-date">Dari Tanggal</Label>
              <Input
                id="from-date"
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="to-date">Sampai Tanggal</Label>
              <Input
                id="to-date"
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end gap-2">
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
              <TableHead>Nomor Form A2</TableHead>
              <TableHead>Nomor CR9</TableHead>
              <TableHead>Nama Seaman</TableHead>
              <TableHead>Kapal</TableHead>
              <TableHead>Cabang</TableHead>
              <TableHead>Step</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Persentase</TableHead>
              <TableHead>Aktioner</TableHead>
              <TableHead>Waktu Aksi</TableHead>
              <TableHead className="text-center">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={12}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  Memuat data...
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={12}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  Tidak ada data approval log.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, index) => (
                <TableRow key={row.id}>
                  <TableCell className="text-center text-muted-foreground">
                    {startIdx + index + 1}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {row.form_a2_number}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {row.cr9_form_number}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {row.seaman_name}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {row.ship}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {row.branch_office}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {STEP_LABEL[row.step]}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={row.status} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {row.percentage != null ? `${row.percentage}%` : "-"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {row.actioner_name}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {formatDateTime(row.actioned_at)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center">
                      <Button
                        size="xs"
                        className="text-white text-[10px] bg-blue-500 hover:bg-blue-600"
                        onClick={() =>
                          navigate(
                            `${ROUTES.formA2Detail.path.replace(":id", row.form_a2_id)}`,
                          )
                        }
                      >
                        LIHAT FORM
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
                : `Menampilkan ${startIdx + 1}–${Math.min(startIdx + PAGE_SIZE, totalRows)} dari ${totalRows} log`}
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
