import { useRef } from "react"
import { HospitalAutocompleteField } from "@/components/form-cr9/hospital-autocomplete-field"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { CurrencyInput } from "@/components/ui/currency-input"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatRupiah } from "@/lib/format"
import type { CostDetailItem } from "@/types/form-cr9"
import type { Hospital } from "@/types/hospital"

interface CostDetailSectionProps {
  /** "master-data" = CR9 Perusahaan (pilih dari dropdown hospitals),
   *  "manual" = CR9 Reimbursement (ketik nama rumah sakit bebas). */
  mode: "master-data" | "manual"
  hospitalLabel: string
  onHospitalSelect: (hospital: Hospital) => void
  hospitalNameManual?: string
  onHospitalNameManualChange?: (value: string) => void
  hospitalError?: string
  details: CostDetailItem[]
  onDetailsChange: (details: CostDetailItem[]) => void
  detailsError?: string
  disabled?: boolean
}

export function CostDetailSection({
  mode,
  hospitalLabel,
  onHospitalSelect,
  hospitalNameManual,
  onHospitalNameManualChange,
  hospitalError,
  details,
  onDetailsChange,
  detailsError,
  disabled,
}: CostDetailSectionProps) {
  const total = details.reduce((sum, d) => sum + (Number(d.amount) || 0), 0)

  // Kunci baris stabil per posisi, lepas dari isi baris (yang bisa berubah
  // lewat input manual atau prefill AI) — supaya tidak pakai index array
  // langsung sebagai key.
  const rowKeys = useRef<string[]>([])
  if (rowKeys.current.length !== details.length) {
    rowKeys.current = details.map(
      (_, i) => rowKeys.current[i] ?? crypto.randomUUID(),
    )
  }

  function addRow() {
    onDetailsChange([...details, { description: "", amount: 0 }])
  }

  function removeRow(index: number) {
    onDetailsChange(details.filter((_, i) => i !== index))
  }

  function updateRow(index: number, patch: Partial<CostDetailItem>) {
    onDetailsChange(
      details.map((d, i) => (i === index ? { ...d, ...patch } : d)),
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Rumah Sakit & Rincian Biaya</CardTitle>
        <CardDescription>
          Pilih satu rumah sakit, lalu tambahkan uraian biaya. 1 Form CR9 hanya
          untuk 1 nota / 1 rumah sakit.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {mode === "manual" ? (
          <div className="space-y-1.5">
            <Label htmlFor="hospital-manual">Nama Rumah Sakit</Label>
            <Input
              id="hospital-manual"
              placeholder="Ketik nama rumah sakit"
              value={hospitalNameManual ?? ""}
              disabled={disabled}
              onChange={(e) => onHospitalNameManualChange?.(e.target.value)}
            />
            {hospitalError && (
              <p className="text-xs text-red-500">{hospitalError}</p>
            )}
          </div>
        ) : (
          <HospitalAutocompleteField
            id="hospital"
            label="Rumah Sakit"
            value={hospitalLabel}
            onSelect={onHospitalSelect}
            error={hospitalError}
            disabled={disabled}
          />
        )}

        {details.length > 0 && (
          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="w-10 text-center">No</TableHead>
                  <TableHead>Uraian</TableHead>
                  <TableHead className="text-right w-48">Jumlah (Rp)</TableHead>
                  <TableHead className="w-16 text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {details.map((detail, index) => (
                  <TableRow key={rowKeys.current[index]}>
                    <TableCell className="text-center text-muted-foreground">
                      {index + 1}
                    </TableCell>
                    <TableCell>
                      <Input
                        placeholder="Contoh: Rawat inap 3 hari"
                        value={detail.description}
                        disabled={disabled}
                        onChange={(e) =>
                          updateRow(index, { description: e.target.value })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <CurrencyInput
                        value={detail.amount}
                        disabled={disabled}
                        onChange={(amount) => updateRow(index, { amount })}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        type="button"
                        size="xs"
                        className="text-[10px] bg-red-600 hover:bg-red-700 text-white"
                        disabled={disabled}
                        onClick={() => removeRow(index)}
                      >
                        HAPUS
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/30 font-semibold">
                  <TableCell colSpan={2} className="text-right">
                    Total
                  </TableCell>
                  <TableCell className="text-right">
                    {formatRupiah(total)}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}

        {detailsError && <p className="text-xs text-red-500">{detailsError}</p>}

        <div className="flex justify-between items-center">
          <Label className="text-xs text-muted-foreground">
            Total biaya dihitung otomatis dari rincian di atas.
          </Label>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={addRow}
          >
            Tambah Uraian
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
