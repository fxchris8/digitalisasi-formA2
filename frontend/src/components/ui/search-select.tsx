import { ChevronDownIcon } from "lucide-react"
import { useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface SearchSelectProps<T> {
  id: string
  label: string
  /** Teks yang ditampilkan di trigger untuk item yang sedang terpilih (atau "" kalau belum ada). */
  value: string
  onSearch: (query: string) => Promise<T[]>
  onSelect: (item: T) => void
  renderItem: (item: T) => React.ReactNode
  getItemKey: (item: T) => string
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  error?: string
  disabled?: boolean
}

/**
 * Dropdown-search generik: klik trigger langsung membuka daftar (default 10
 * teratas), ada input pencarian di dalam popover untuk menyaring lebih lanjut.
 */
export function SearchSelect<T>({
  id,
  label,
  value,
  onSearch,
  onSelect,
  renderItem,
  getItemKey,
  placeholder = "-- Pilih --",
  searchPlaceholder = "Cari...",
  emptyText = "Tidak ada hasil",
  error,
  disabled,
}: SearchSelectProps<T>) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<T[]>([])
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const requestIdRef = useRef(0)

  async function runSearch(q: string) {
    const requestId = ++requestIdRef.current
    setLoading(true)
    try {
      const res = await onSearch(q)
      if (requestId === requestIdRef.current) setResults(res)
    } catch {
      if (requestId === requestIdRef.current) setResults([])
    } finally {
      if (requestId === requestIdRef.current) setLoading(false)
    }
  }

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) {
      setQuery("")
      runSearch("")
    } else if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
  }

  function handleQueryChange(v: string) {
    setQuery(v)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => runSearch(v), 300)
  }

  function handleSelect(item: T) {
    onSelect(item)
    setOpen(false)
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <button
            type="button"
            id={id}
            disabled={disabled}
            aria-invalid={!!error}
            className={cn(
              "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow]",
              "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
              "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
              "disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 dark:hover:bg-input/50",
              !value && "text-muted-foreground",
            )}
          >
            <span className="truncate">{value || placeholder}</span>
            <ChevronDownIcon className="size-4 shrink-0 opacity-50" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-(--radix-popover-trigger-width) p-0"
          align="start"
        >
          <div className="border-b p-2">
            <Input
              autoFocus
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder={searchPlaceholder}
              autoComplete="off"
            />
          </div>
          <ul className="max-h-60 overflow-y-auto p-1">
            {loading ? (
              <li className="px-3 py-2 text-sm text-muted-foreground">
                Memuat...
              </li>
            ) : results.length === 0 ? (
              <li className="px-3 py-2 text-sm text-muted-foreground">
                {emptyText}
              </li>
            ) : (
              results.map((item) => (
                <li key={getItemKey(item)}>
                  <button
                    type="button"
                    className="w-full cursor-pointer rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground"
                    onClick={() => handleSelect(item)}
                  >
                    {renderItem(item)}
                  </button>
                </li>
              ))
            )}
          </ul>
        </PopoverContent>
      </Popover>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
