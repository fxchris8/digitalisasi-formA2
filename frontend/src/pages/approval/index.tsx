import { useEffect, useState } from "react"
import { useNavigate } from "react-router"
import { toast } from "sonner"
import { listPendingApproval } from "@/api/approval"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAuth } from "@/contexts/auth.context"
import { formatRupiah } from "@/lib/format"
import { getManagerStep } from "@/lib/rbac"
import type { FormA2 } from "@/types/form-a2"

const STEP_LABEL: Record<string, string> = {
  spm: "Manager SPM",
  nautica: "Manager Nautica",
  finance: "Finance",
}

export default function ApprovalPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [rows, setRows] = useState<FormA2[]>([])
  const [loading, setLoading] = useState(true)

  const step = user ? getManagerStep(user) : null

  useEffect(() => {
    if (!step) return
    listPendingApproval()
      .then(setRows)
      .catch(() => toast.error("Gagal memuat daftar pengajuan"))
      .finally(() => setLoading(false))
  }, [step])

  if (!step) {
    return (
      <div className="py-20 text-center text-sm text-muted-foreground">
        Anda tidak memiliki akses ke halaman ini.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-semibold text-gray-900">Approval</h1>
        <p className="mt-0.5 text-sm text-gray-500">
          Pengajuan menunggu persetujuan {STEP_LABEL[step]}
        </p>
      </div>

      {/* Tabel */}
      <div className="rounded-lg border bg-white overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-10 text-center">No</TableHead>
              <TableHead>Nomor Form A2</TableHead>
              <TableHead>Seaman Name</TableHead>
              <TableHead>Seaman Code</TableHead>
              <TableHead>Kapal</TableHead>
              <TableHead>Cabang</TableHead>
              <TableHead className="text-right">Jumlah (CR9)</TableHead>
              <TableHead className="text-center">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  Memuat data...
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-sm text-muted-foreground"
                >
                  Tidak ada pengajuan yang menunggu persetujuan Anda.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, index) => (
                <TableRow key={row.id}>
                  <TableCell className="whitespace-nowrap text-center text-muted-foreground">
                    {index + 1}
                  </TableCell>
                  <TableCell className="whitespace-nowrap font-medium">
                    {row.form_number}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {row.seaman_name}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {row.seaman_code}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {row.ship}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {row.branch_office}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right text-muted-foreground">
                    {formatRupiah(Number(row.cr9_amount))}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center">
                      <Button
                        size="xs"
                        className="text-white text-[10px] bg-blue-500 hover:bg-blue-600"
                        onClick={() => navigate(`/approval/${row.id}`)}
                      >
                        CEK PENGAJUAN
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Footer */}
        <div className="px-4 py-3 border-t bg-muted/30">
          <p className="text-xs text-muted-foreground">
            {loading
              ? "Memuat..."
              : rows.length === 0
                ? "Tidak ada data"
                : `${rows.length} pengajuan menunggu persetujuan`}
          </p>
        </div>
      </div>
    </div>
  )
}
