import { ExternalLink, FileText } from "lucide-react"
import { getStorageUrl } from "@/lib/storage"

/**
 * Displays a stored PDF file as a clickable card.
 *
 * @param label      Human-readable name shown on the card, e.g. "Dokumen CR9"
 * @param storedPath Relative storage path returned by uploadFile, e.g. "cr9/uuid.pdf"
 */
export function FileCard({
  label,
  storedPath,
}: {
  label: string
  storedPath: string | null | undefined
}) {
  if (!storedPath) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg border bg-gray-50 opacity-60">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100">
          <FileText size={20} className="text-gray-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-500 truncate">{label}</p>
          <p className="text-xs text-muted-foreground">Belum diupload</p>
        </div>
      </div>
    )
  }

  return (
    <a
      href={getStorageUrl(storedPath)}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 p-3 rounded-lg border bg-white hover:bg-gray-50 transition-colors group"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-100">
        <FileText size={20} className="text-red-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{label}</p>
        <p className="text-xs text-muted-foreground">PDF Document</p>
      </div>
      <ExternalLink
        size={15}
        className="shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
      />
    </a>
  )
}
