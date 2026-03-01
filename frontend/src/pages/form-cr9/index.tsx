import {
  Eye,
  Pencil,
  PlusCircle,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react"
import { useState } from "react"
import { Link } from "react-router"
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
import { useAuth } from "@/contexts/auth.context"
import { ROLES } from "@/lib/rbac"
import { ROUTES } from "@/routes/config"

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10

// ─── Types ────────────────────────────────────────────────────────────────────

type FormStatus = "draft" | "diajukan" | "disetujui" | "ditolak"

interface FormCr9Item {
  id: string
  nomor_surat: string
  seaman_code: string
  nama_abk: string
  kapal: string
  jabatan: string
  jenis_keluhan: string
  tanggal: string
  status: FormStatus
  dibuat_oleh: string
  cabang: string
}

interface FilterState {
  nomor_surat: string
  nama_abk: string
  seaman_code: string
  kapal: string
  dari_tanggal: string
  sampai_tanggal: string
}

const EMPTY_FILTER: FilterState = {
  nomor_surat: "",
  nama_abk: "",
  seaman_code: "",
  kapal: "",
  dari_tanggal: "",
  sampai_tanggal: "",
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_FORMS: FormCr9Item[] = [
  {
    id: "1",
    nomor_surat: "CR9/SUB/0001/01/2026",
    seaman_code: "ABK-20240118",
    nama_abk: "Ahmad Fauzi",
    kapal: "KM Nusantara Jaya",
    jabatan: "Mualim I",
    jenis_keluhan: "Demam & Batuk",
    tanggal: "2026-01-18",
    status: "disetujui",
    dibuat_oleh: "Staff Cabang Surabaya",
    cabang: "Surabaya",
  },
  {
    id: "2",
    nomor_surat: "CR9/MKS/0001/01/2026",
    seaman_code: "ABK-20230522",
    nama_abk: "Bagas Prasetyo",
    kapal: "KM Sinar Timur",
    jabatan: "Juru Mudi",
    jenis_keluhan: "Cedera Tangan Kanan",
    tanggal: "2026-01-22",
    status: "diajukan",
    dibuat_oleh: "Staff Cabang Makassar",
    cabang: "Makassar",
  },
  {
    id: "3",
    nomor_surat: "CR9/SPM/0001/01/2026",
    seaman_code: "ABK-20220914",
    nama_abk: "Rizky Kurniawan",
    kapal: "KM Meratus Benoa",
    jabatan: "Kelasi",
    jenis_keluhan: "Hipertensi",
    tanggal: "2026-01-25",
    status: "draft",
    dibuat_oleh: "Staff SPM Satu",
    cabang: "-",
  },
  {
    id: "4",
    nomor_surat: "CR9/SUB/0002/01/2026",
    seaman_code: "ABK-20210307",
    nama_abk: "Doni Setiawan",
    kapal: "KM Nusantara Jaya",
    jabatan: "Masinis II",
    jenis_keluhan: "Infeksi Saluran Pernapasan",
    tanggal: "2026-01-27",
    status: "ditolak",
    dibuat_oleh: "Staff Cabang Surabaya",
    cabang: "Surabaya",
  },
  {
    id: "5",
    nomor_surat: "CR9/MKS/0002/01/2026",
    seaman_code: "ABK-20190615",
    nama_abk: "Hendra Wijaya",
    kapal: "KM Sinar Timur",
    jabatan: "Juru Minyak",
    jenis_keluhan: "Nyeri Punggung",
    tanggal: "2026-01-28",
    status: "draft",
    dibuat_oleh: "Staff Cabang Makassar",
    cabang: "Makassar",
  },
  {
    id: "6",
    nomor_surat: "CR9/SUB/0003/02/2026",
    seaman_code: "ABK-20201130",
    nama_abk: "Fajar Nugroho",
    kapal: "KM Meratus Benoa",
    jabatan: "Mualim II",
    jenis_keluhan: "Vertigo",
    tanggal: "2026-02-03",
    status: "disetujui",
    dibuat_oleh: "Staff Cabang Surabaya",
    cabang: "Surabaya",
  },
  {
    id: "7",
    nomor_surat: "CR9/SPM/0002/02/2026",
    seaman_code: "ABK-20180824",
    nama_abk: "Galih Permana",
    kapal: "KM Nusantara Jaya",
    jabatan: "Juru Masak",
    jenis_keluhan: "Diare",
    tanggal: "2026-02-05",
    status: "diajukan",
    dibuat_oleh: "Staff SPM Satu",
    cabang: "-",
  },
  {
    id: "8",
    nomor_surat: "CR9/MKS/0003/02/2026",
    seaman_code: "ABK-20170412",
    nama_abk: "Irvan Santoso",
    kapal: "KM Sinar Timur",
    jabatan: "Kelasi",
    jenis_keluhan: "Cedera Kaki Kiri",
    tanggal: "2026-02-08",
    status: "ditolak",
    dibuat_oleh: "Staff Cabang Makassar",
    cabang: "Makassar",
  },
  {
    id: "9",
    nomor_surat: "CR9/SUB/0004/02/2026",
    seaman_code: "ABK-20160709",
    nama_abk: "Joko Susilo",
    kapal: "KM Meratus Benoa",
    jabatan: "Masinis III",
    jenis_keluhan: "Asma",
    tanggal: "2026-02-12",
    status: "draft",
    dibuat_oleh: "Staff Cabang Surabaya",
    cabang: "Surabaya",
  },
  {
    id: "10",
    nomor_surat: "CR9/SPM/0003/02/2026",
    seaman_code: "ABK-20150318",
    nama_abk: "Kevin Pratama",
    kapal: "KM Nusantara Jaya",
    jabatan: "Juru Mudi",
    jenis_keluhan: "Sakit Gigi",
    tanggal: "2026-02-15",
    status: "diajukan",
    dibuat_oleh: "Staff SPM Satu",
    cabang: "-",
  },
  {
    id: "11",
    nomor_surat: "CR9/MKS/0004/02/2026",
    seaman_code: "ABK-20140526",
    nama_abk: "Lukman Hakim",
    kapal: "KM Sinar Timur",
    jabatan: "Mualim I",
    jenis_keluhan: "Demam Tinggi",
    tanggal: "2026-02-18",
    status: "disetujui",
    dibuat_oleh: "Staff Cabang Makassar",
    cabang: "Makassar",
  },
  {
    id: "12",
    nomor_surat: "CR9/SUB/0005/02/2026",
    seaman_code: "ABK-20130901",
    nama_abk: "Maulana Arif",
    kapal: "KM Meratus Benoa",
    jabatan: "Juru Minyak",
    jenis_keluhan: "Luka Bakar Ringan",
    tanggal: "2026-02-20",
    status: "draft",
    dibuat_oleh: "Staff Cabang Surabaya",
    cabang: "Surabaya",
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<FormStatus, { label: string; className: string }> =
  {
    draft: { label: "Draft", className: "bg-gray-100 text-gray-600" },
    diajukan: { label: "Diajukan", className: "bg-blue-100 text-blue-700" },
    disetujui: { label: "Disetujui", className: "bg-green-100 text-green-700" },
    ditolak: { label: "Ditolak", className: "bg-red-100 text-red-700" },
  }

function StatusBadge({ status }: { status: FormStatus }) {
  const { label, className } = STATUS_CONFIG[status]
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}
    >
      {label}
    </span>
  )
}

function applyFilter(forms: FormCr9Item[], f: FilterState): FormCr9Item[] {
  return forms.filter((form) => {
    if (
      f.nomor_surat &&
      !form.nomor_surat.toLowerCase().includes(f.nomor_surat.toLowerCase())
    )
      return false
    if (
      f.nama_abk &&
      !form.nama_abk.toLowerCase().includes(f.nama_abk.toLowerCase())
    )
      return false
    if (
      f.seaman_code &&
      !form.seaman_code.toLowerCase().includes(f.seaman_code.toLowerCase())
    )
      return false
    if (f.kapal && !form.kapal.toLowerCase().includes(f.kapal.toLowerCase()))
      return false
    if (f.dari_tanggal && form.tanggal < f.dari_tanggal) return false
    if (f.sampai_tanggal && form.tanggal > f.sampai_tanggal) return false
    return true
  })
}

type PageItem = number | { type: "ellipsis"; id: "left" | "right" }

/** Menghasilkan array nomor halaman + ellipsis dengan id stabil */
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

  const [draft, setDraft] = useState<FilterState>(EMPTY_FILTER)
  const [applied, setApplied] = useState<FilterState>(EMPTY_FILTER)
  const [currentPage, setCurrentPage] = useState(1)

  const filtered = applyFilter(MOCK_FORMS, applied)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const startIdx = (currentPage - 1) * PAGE_SIZE
  const paginated = filtered.slice(startIdx, startIdx + PAGE_SIZE)
  const pageNumbers = buildPageNumbers(currentPage, totalPages)

  /**
   * Bisa create / revisi:
   * - Admin (semua akses)
   * - Staff department cabang
   * - Staff department spm
   */
  const canCreateOrRevise =
    user?.role === ROLES.ADMIN ||
    (user?.role === ROLES.STAFF &&
      (user?.department === "cabang" || user?.department === "spm"))

  /** Hanya admin yang boleh hapus */
  const canDelete = user?.role === ROLES.ADMIN

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Form CR9</h1>
          <p className="mt-1 text-sm text-gray-500">
            Laporan Kesehatan Anak Buah Kapal
          </p>
        </div>
        {canCreateOrRevise && (
          <Button asChild>
            <Link to={ROUTES.formCr9Create.path}>
              <PlusCircle size={16} className="mr-2" />
              Buat Baru
            </Link>
          </Button>
        )}
      </div>

      {/* Filter / Search */}
      <Card>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Nomor Surat CR9 */}
            <div className="space-y-1.5">
              <Label htmlFor="filter-nomor-surat">Nomor Surat CR9</Label>
              <Input
                id="filter-nomor-surat"
                placeholder="Cth: CR9/SUB/0001/01/2026"
                value={draft.nomor_surat}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    nomor_surat: e.target.value,
                  }))
                }
              />
            </div>

            {/* Nama ABK */}
            <div className="space-y-1.5">
              <Label htmlFor="filter-nama-abk">Nama ABK</Label>
              <Input
                id="filter-nama-abk"
                placeholder="Cari nama seaman..."
                value={draft.nama_abk}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, nama_abk: e.target.value }))
                }
              />
            </div>

            {/* Seaman Code */}
            <div className="space-y-1.5">
              <Label htmlFor="filter-seaman-code">Seaman Code</Label>
              <Input
                id="filter-seaman-code"
                placeholder="Cth: ABK-20240118"
                value={draft.seaman_code}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    seaman_code: e.target.value,
                  }))
                }
              />
            </div>

            {/* Kapal */}
            <div className="space-y-1.5">
              <Label htmlFor="filter-kapal">Kapal</Label>
              <Input
                id="filter-kapal"
                placeholder="Cari nama kapal..."
                value={draft.kapal}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, kapal: e.target.value }))
                }
              />
            </div>

            {/* Dari Tanggal */}
            <div className="space-y-1.5">
              <Label htmlFor="filter-dari-tanggal">Dari Tanggal</Label>
              <Input
                id="filter-dari-tanggal"
                type="date"
                value={draft.dari_tanggal}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    dari_tanggal: e.target.value,
                  }))
                }
              />
            </div>

            {/* Sampai Tanggal */}
            <div className="space-y-1.5">
              <Label htmlFor="filter-sampai-tanggal">Sampai Tanggal</Label>
              <Input
                id="filter-sampai-tanggal"
                type="date"
                value={draft.sampai_tanggal}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    sampai_tanggal: e.target.value,
                  }))
                }
              />
            </div>
          </div>

          {/* Tombol aksi filter */}
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw size={14} className="mr-1.5" />
              Reset
            </Button>
            <Button size="sm" onClick={handleSearch}>
              <Search size={14} className="mr-1.5" />
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
              <TableHead>Nama ABK</TableHead>
              <TableHead>Seaman Code</TableHead>
              <TableHead>Kapal</TableHead>
              <TableHead>Keluhan</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  Tidak ada data yang sesuai dengan filter.
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((form, index) => (
                <TableRow key={form.id}>
                  <TableCell className="text-muted-foreground">
                    {startIdx + index + 1}
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {form.nomor_surat}
                  </TableCell>
                  <TableCell className="font-medium">{form.nama_abk}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {form.seaman_code}
                  </TableCell>
                  <TableCell>{form.kapal}</TableCell>
                  <TableCell>{form.jenis_keluhan}</TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {new Date(form.tanggal).toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={form.status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      {/* View — semua role yang punya akses halaman ini */}
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        title="Lihat Detail"
                        className="text-muted-foreground hover:text-blue-600"
                      >
                        <Eye size={15} />
                      </Button>

                      {/* Revisi — admin + staff cabang + staff spm */}
                      {canCreateOrRevise && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="Revisi"
                          className="text-muted-foreground hover:text-amber-600"
                          disabled={form.status === "disetujui"}
                        >
                          <Pencil size={15} />
                        </Button>
                      )}

                      {/* Hapus — admin saja */}
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="Hapus"
                          className="text-muted-foreground hover:text-red-600"
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
            {filtered.length === 0
              ? "Tidak ada data"
              : `Menampilkan ${startIdx + 1}–${Math.min(startIdx + PAGE_SIZE, filtered.length)} dari ${filtered.length} data`}
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
