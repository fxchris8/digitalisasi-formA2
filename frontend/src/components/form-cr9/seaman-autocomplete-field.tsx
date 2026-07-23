import { listSeamen } from "@/api/seaman"
import { SearchSelect } from "@/components/ui/search-select"
import type { Seaman } from "@/types/seaman"

interface SeamanAutocompleteFieldProps {
  id: string
  label: string
  value: string
  onSelect: (seaman: Seaman) => void
  error?: string
  disabled?: boolean
}

export function SeamanAutocompleteField({
  id,
  label,
  value,
  onSelect,
  error,
  disabled,
}: SeamanAutocompleteFieldProps) {
  return (
    <SearchSelect<Seaman>
      id={id}
      label={label}
      value={value}
      onSelect={onSelect}
      error={error}
      disabled={disabled}
      placeholder="-- Pilih Seaman --"
      searchPlaceholder="Cari kode atau nama seaman..."
      emptyText="Seaman tidak ditemukan"
      getItemKey={(seaman) => seaman.seamancode}
      onSearch={async (query) => {
        const res = await listSeamen({ search: query || undefined, limit: 10 })
        return res.data
      }}
      renderItem={(seaman) => (
        <div>
          <div className="font-medium">
            {seaman.seamancode} - {seaman.name}
          </div>
          <div className="text-xs text-muted-foreground">
            {seaman.last_position ?? "-"}
          </div>
        </div>
      )}
    />
  )
}
