import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"
import { getSeamenStats, listSeamen, syncSeamen } from "@/api/seaman"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
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
import type { PaginatedResponse } from "@/types/api"
import type { Seaman, SeamanStats } from "@/types/seaman"

const LIMIT = 20

function DetailRow({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-2 gap-2 py-1.5 border-b last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-medium wrap-reak-words">
        {value ?? "-"}
      </span>
    </div>
  )
}

export default function SeamanPage() {
  const [data, setData] = useState<PaginatedResponse<Seaman> | null>(null)
  const [, setStats] = useState<SeamanStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [clearing] = useState(false)

  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [page, setPage] = useState(1)

  const [selectedSeaman, setSelectedSeaman] = useState<Seaman | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const loadStats = useCallback(async () => {
    try {
      const s = await getSeamenStats()
      setStats(s)
    } catch {
      // non-critical
    }
  }, [])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await listSeamen({
        page,
        limit: LIMIT,
        search: search || undefined,
      })
      setData(res)
    } catch {
      toast.error("Gagal memuat data seaman")
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  function handleSearch() {
    setPage(1)
    setSearch(searchInput)
  }

  function handleReset() {
    setSearchInput("")
    setSearch("")
    setPage(1)
  }

  async function handleSync() {
    setSyncing(true)
    try {
      const result = await syncSeamen()
      toast.success(`Berhasil sinkronisasi ${result.synced} data seaman`)
      await Promise.all([loadData(), loadStats()])
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Gagal sinkronisasi data",
      )
    } finally {
      setSyncing(false)
    }
  }

  function handleOpenDetail(s: Seaman) {
    setSelectedSeaman(s)
    setDetailOpen(true)
  }

  const totalPages = data?.total_pages ?? 1

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold text-gray-900">
            Kelola Seaman
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manajemen data Seaman dari CITRIX.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button
            className="bg-red-600 hover:bg-red-700 text-white"
            disabled={syncing || clearing}
            onClick={handleSync}
          >
            {syncing ? "Menyinkronkan..." : "Fetch Data - Citrix"}
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="flex-1 space-y-1.5">
              <Label htmlFor="search">Cari Seaman</Label>
              <Input
                id="search"
                placeholder="Cari nama atau seaman code..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
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

      {/* Table */}
      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-10 text-center">No</TableHead>
              <TableHead>Seaman Code</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead>Jabatan Terakhir</TableHead>
              <TableHead>Kapal Terakhir</TableHead>
              <TableHead>Fleet</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Sisa Hari</TableHead>
              <TableHead className="text-center">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="text-center py-10 text-muted-foreground text-sm"
                >
                  Memuat data...
                </TableCell>
              </TableRow>
            ) : !data || data.data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="text-center py-10 text-muted-foreground text-sm italic"
                >
                  {search
                    ? "Tidak ada data yang cocok."
                    : 'Belum ada data seaman. Klik "Fetch Data Baru" untuk sinkronisasi.'}
                </TableCell>
              </TableRow>
            ) : (
              data.data.map((s, i) => (
                <TableRow key={s.seamancode}>
                  <TableCell className="text-center text-muted-foreground">
                    {(page - 1) * LIMIT + i + 1}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {s.seamancode}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {s.name}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {s.last_position ?? "-"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {s.last_location ?? "-"}
                  </TableCell>
                  <TableCell>{s.fleet ?? "-"}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        s.status === "ON BOARD"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {s.status ?? "-"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {s.day_remains != null ? s.day_remains : "-"}
                  </TableCell>
                  <TableCell className="text-center">
                    <Button
                      size="xs"
                      onClick={() => handleOpenDetail(s)}
                      className="text-white text-[10px] bg-blue-500 hover:bg-blue-600"
                    >
                      Detail
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Halaman {page} dari {totalPages} · Total{" "}
            {data?.total.toLocaleString("id")} data
          </span>
          <Pagination className="w-auto mx-0 justify-end">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    if (page > 1 && !loading) setPage((p) => p - 1)
                  }}
                  aria-disabled={page <= 1 || loading}
                  className={
                    page <= 1 || loading ? "pointer-events-none opacity-50" : ""
                  }
                />
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    if (page < totalPages && !loading) setPage((p) => p + 1)
                  }}
                  aria-disabled={page >= totalPages || loading}
                  className={
                    page >= totalPages || loading
                      ? "pointer-events-none opacity-50"
                      : ""
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail Seaman — {selectedSeaman?.name}</DialogTitle>
          </DialogHeader>

          {selectedSeaman && (
            <div className="space-y-4 text-sm">
              {/* Identitas */}
              <div>
                <p className="font-semibold text-gray-700 mb-1">Identitas</p>
                <div className="rounded-md border px-3 py-1">
                  <DetailRow
                    label="Seaman Code"
                    value={selectedSeaman.seamancode}
                  />
                  <DetailRow
                    label="Seafarer Code"
                    value={selectedSeaman.seafarercode}
                  />
                  <DetailRow label="Nama" value={selectedSeaman.name} />
                  <DetailRow label="Gender" value={selectedSeaman.gender} />
                  <DetailRow
                    label="Tempat Lahir"
                    value={selectedSeaman.birthplace}
                  />
                  <DetailRow
                    label="Tanggal Lahir"
                    value={selectedSeaman.birthdate}
                  />
                  <DetailRow label="Usia" value={selectedSeaman.age} />
                </div>
              </div>

              {/* Pendidikan & Pengalaman */}
              <div>
                <p className="font-semibold text-gray-700 mb-1">
                  Pendidikan & Pengalaman
                </p>
                <div className="rounded-md border px-3 py-1">
                  <DetailRow
                    label="Tingkat Pendidikan"
                    value={selectedSeaman.edu_level}
                  />
                  <DetailRow
                    label="Sertifikat"
                    value={selectedSeaman.certificate}
                  />
                  <DetailRow
                    label="Pengalaman"
                    value={selectedSeaman.experience}
                  />
                </div>
              </div>

              {/* Penugasan */}
              <div>
                <p className="font-semibold text-gray-700 mb-1">Penugasan</p>
                <div className="rounded-md border px-3 py-1">
                  <DetailRow label="Fleet" value={selectedSeaman.fleet} />
                  <DetailRow
                    label="Karyawan Aktif"
                    value={selectedSeaman.is_active_employee}
                  />
                  <DetailRow
                    label="Status"
                    value={
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          selectedSeaman.status === "ON BOARD"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {selectedSeaman.status ?? "-"}
                      </span>
                    }
                  />
                  <DetailRow
                    label="Tanggal Mulai"
                    value={selectedSeaman.start_date}
                  />
                  <DetailRow
                    label="Tanggal Selesai"
                    value={selectedSeaman.end_date}
                  />
                  <DetailRow
                    label="Hari Berlalu"
                    value={selectedSeaman.day_elapsed}
                  />
                  <DetailRow
                    label="Sisa Hari"
                    value={selectedSeaman.day_remains}
                  />
                </div>
              </div>

              {/* Posisi */}
              <div>
                <p className="font-semibold text-gray-700 mb-1">Posisi</p>
                <div className="rounded-md border px-3 py-1">
                  <DetailRow
                    label="Jabatan Terakhir"
                    value={selectedSeaman.last_position}
                  />
                  <DetailRow
                    label="Kapal Terakhir"
                    value={selectedSeaman.last_location}
                  />
                  <DetailRow
                    label="ID Kapal Terakhir"
                    value={selectedSeaman.last_vesselid}
                  />
                  <DetailRow
                    label="Jabatan Sebelumnya"
                    value={selectedSeaman.prevposition}
                  />
                  <DetailRow
                    label="Kapal Sebelumnya"
                    value={selectedSeaman.prevlocation}
                  />
                </div>
              </div>

              {/* Kontak */}
              <div>
                <p className="font-semibold text-gray-700 mb-1">Kontak</p>
                <div className="rounded-md border px-3 py-1">
                  <DetailRow
                    label="PIC Crewing"
                    value={selectedSeaman.pic_crewing}
                  />
                  <DetailRow
                    label="No. Telepon 1"
                    value={selectedSeaman.phone_number_1}
                  />
                  <DetailRow
                    label="No. Telepon 2"
                    value={selectedSeaman.phone_number_2}
                  />
                  <DetailRow
                    label="No. Telepon 3"
                    value={selectedSeaman.phone_number_3}
                  />
                  <DetailRow
                    label="No. Telepon 4"
                    value={selectedSeaman.phone_number_4}
                  />
                </div>
              </div>

              {/* Sistem */}
              <div>
                <p className="font-semibold text-gray-700 mb-1">Sistem</p>
                <div className="rounded-md border px-3 py-1">
                  <DetailRow
                    label="Terakhir Disinkronkan"
                    value={new Date(selectedSeaman.synced_at).toLocaleString(
                      "id-ID",
                    )}
                  />
                  <DetailRow
                    label="Diperbarui"
                    value={new Date(selectedSeaman.updated_at).toLocaleString(
                      "id-ID",
                    )}
                  />
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
