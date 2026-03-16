import { Check, Clock, RefreshCw, X } from "lucide-react"
import { formatDateTime } from "@/lib/format"

export type TimelineStatus = "done" | "revision" | "rejected" | "pending"

export interface TimelineEntry {
  title: string
  status: TimelineStatus
  timestamp?: string | null
  actor?: string | null
  notes?: string | null
  extra?: string | null // misalnya: "Persentase: 80%"
}

// ── Style map ─────────────────────────────────────────────────────────────────

const STYLE: Record<
  TimelineStatus,
  {
    circle: string
    iconColor: string
    labelColor: string
    label: string
    Icon: React.ComponentType<{ size?: number; className?: string }>
  }
> = {
  done: {
    circle: "bg-green-600",
    iconColor: "text-white",
    labelColor: "text-green-700",
    label: "Selesai",
    Icon: Check,
  },
  revision: {
    circle: "bg-amber-500",
    iconColor: "text-white",
    labelColor: "text-amber-600",
    label: "Perlu Revisi",
    Icon: RefreshCw,
  },
  rejected: {
    circle: "bg-red-600",
    iconColor: "text-white",
    labelColor: "text-red-700",
    label: "Ditolak",
    Icon: X,
  },
  pending: {
    circle: "border-2 border-dashed border-gray-300 bg-white",
    iconColor: "text-gray-400",
    labelColor: "text-gray-400",
    label: "Menunggu",
    Icon: Clock,
  },
}

// ── TimelineItem ──────────────────────────────────────────────────────────────

function TimelineItem({
  entry,
  isLast,
}: {
  entry: TimelineEntry
  isLast: boolean
}) {
  const s = STYLE[entry.status]
  const { Icon } = s
  const isPending = entry.status === "pending"

  return (
    <div className="flex gap-4">
      {/* Circle + connector */}
      <div className="flex flex-col items-center">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${s.circle}`}
        >
          <Icon size={14} className={s.iconColor} />
        </div>
        {!isLast && (
          <div
            className={`mt-1 flex-1 ${isPending ? "border-l border-dashed border-gray-200" : "w-px bg-gray-200"}`}
          />
        )}
      </div>

      {/* Content */}
      <div className={`min-w-0 ${isLast ? "pb-0" : "pb-5"}`}>
        <p
          className={`text-sm font-semibold ${isPending ? "text-gray-400" : "text-gray-900"}`}
        >
          {entry.title}
        </p>
        <p className={`text-xs font-medium ${s.labelColor}`}>{s.label}</p>

        {!isPending && entry.timestamp && (
          <p className="mt-0.5 text-xs text-muted-foreground">
            {formatDateTime(entry.timestamp)}
            {entry.actor && <> &bull; {entry.actor}</>}
          </p>
        )}

        {!isPending && entry.extra && (
          <p className="mt-0.5 text-xs text-muted-foreground">{entry.extra}</p>
        )}

        {!isPending && entry.notes && (
          <p className="mt-0.5 whitespace-pre-line text-xs text-muted-foreground">
            {entry.notes}
          </p>
        )}
      </div>
    </div>
  )
}

// ── Timeline ──────────────────────────────────────────────────────────────────

export function Timeline({ entries }: { entries: TimelineEntry[] }) {
  if (entries.length === 0) return null

  return (
    <div>
      {entries.map((entry, i) => (
        <TimelineItem
          key={entry.title}
          entry={entry}
          isLast={i === entries.length - 1}
        />
      ))}
    </div>
  )
}
