import { useRef, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { getStorageUrl, uploadFile } from "@/lib/storage"

type RowStatus = "uploading" | "done" | "error"

interface ReceiptRow {
  key: string
  path: string // kosong selama masih "uploading"
  filename: string
  status: RowStatus
}

interface ReceiptUploadSectionProps {
  label: string
  folder: string
  /** Path kuitansi yang sudah ada (mode edit) — dipakai sebagai nilai awal saja. */
  paths: string[]
  onPathsChange: (paths: string[]) => void
  disabled?: boolean
  error?: string
}

export function ReceiptUploadSection({
  label,
  folder,
  paths,
  onPathsChange,
  disabled,
  error,
}: ReceiptUploadSectionProps) {
  const [rows, setRows] = useState<ReceiptRow[]>(() =>
    paths.map((p) => ({
      key: crypto.randomUUID(),
      path: p,
      filename: p.split("/").pop() ?? p,
      status: "done" as const,
    })),
  )
  const inputRef = useRef<HTMLInputElement>(null)

  function commit(nextRows: ReceiptRow[]) {
    setRows(nextRows)
    onPathsChange(
      nextRows.filter((r) => r.status === "done").map((r) => r.path),
    )
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (inputRef.current) inputRef.current.value = ""

    const key = crypto.randomUUID()
    const newRow: ReceiptRow = {
      key,
      path: "",
      filename: file.name,
      status: "uploading",
    }
    const withNew = [...rows, newRow]
    setRows(withNew)

    try {
      const storedPath = await uploadFile(file, folder)
      commit(
        withNew.map((r) =>
          r.key === key
            ? { ...r, path: storedPath, status: "done" as const }
            : r,
        ),
      )
    } catch (err) {
      setRows(
        withNew.map((r) =>
          r.key === key ? { ...r, status: "error" as const } : r,
        ),
      )
      toast.error(
        err instanceof Error ? err.message : "Gagal mengupload file, coba lagi",
      )
    }
  }

  function removeRow(key: string) {
    commit(rows.filter((r) => r.key !== key))
  }

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {rows.length > 0 && (
        <ul className="space-y-1.5">
          {rows.map((r) => (
            <li
              key={r.key}
              className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
            >
              <div className="flex-1 truncate">
                {r.status === "done" && r.path ? (
                  <a
                    href={getStorageUrl(r.path)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {r.filename}
                  </a>
                ) : (
                  <span
                    className={
                      r.status === "error"
                        ? "text-red-500"
                        : "text-muted-foreground"
                    }
                  >
                    {r.filename}
                    {r.status === "uploading" && " — mengupload..."}
                    {r.status === "error" && " — gagal upload"}
                  </span>
                )}
              </div>
              <Button
                type="button"
                size="xs"
                className="text-[10px] bg-red-600 hover:bg-red-700 text-white shrink-0"
                disabled={disabled}
                onClick={() => removeRow(r.key)}
              >
                HAPUS
              </Button>
            </li>
          ))}
        </ul>
      )}
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        disabled={disabled}
        className="block w-full text-sm text-gray-700 border rounded-md p-0.5 cursor-pointer file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
        onChange={handleFileSelect}
      />
      <p className="text-xs text-muted-foreground">
        Bisa upload lebih dari satu file kuitansi.
      </p>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
