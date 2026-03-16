import { useEffect, useRef, useState } from "react"
import { listSeamen } from "@/api/seaman"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Seaman } from "@/types/seaman"

interface SeamanAutocompleteFieldProps {
  id: string
  label: string
  searchBy: "seafarercode" | "seamancode" | "name"
  value: string
  onChange: (value: string) => void
  onSelect: (seaman: Seaman) => void
  placeholder?: string
  error?: string
  disabled?: boolean
}

export function SeamanAutocompleteField({
  id,
  label,
  searchBy,
  value,
  onChange,
  onSelect,
  placeholder,
  error,
  disabled,
}: SeamanAutocompleteFieldProps) {
  const [results, setResults] = useState<Seaman[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const justSelectedRef = useRef(false)

  useEffect(() => {
    if (justSelectedRef.current) {
      justSelectedRef.current = false
      return
    }

    if (!value || value.length < 2) {
      setResults([])
      setOpen(false)
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await listSeamen({ search: value, limit: 5 })
        setResults(res.data)
        setOpen(res.data.length > 0)
      } catch {
        setResults([])
        setOpen(false)
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [value])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  function formatLabel(seaman: Seaman): string {
    if (searchBy === "seafarercode") {
      return `${seaman.seafarercode ?? "—"} - ${seaman.name}`
    }
    if (searchBy === "seamancode") {
      return `${seaman.seamancode} - ${seaman.name}`
    }
    return `${seaman.name} - ${seaman.seamancode}`
  }

  function handleSelect(seaman: Seaman) {
    justSelectedRef.current = true
    onSelect(seaman)
    setOpen(false)
    setResults([])
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div ref={containerRef} className="relative">
        <Input
          id={id}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setOpen(true)
          }}
          disabled={disabled}
          autoComplete="off"
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            ...
          </span>
        )}
        {open && results.length > 0 && (
          <ul className="absolute z-50 mt-1 w-full rounded-md border bg-white shadow-lg overflow-hidden">
            {results.map((seaman) => (
              <li
                key={seaman.seamancode}
                className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100"
                onMouseDown={(e) => {
                  e.preventDefault()
                  handleSelect(seaman)
                }}
              >
                {formatLabel(seaman)}
              </li>
            ))}
          </ul>
        )}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
