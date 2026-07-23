import { listShips } from "@/api/ships"
import { SearchSelect } from "@/components/ui/search-select"
import type { Ship } from "@/types/ship"

interface ShipAutocompleteFieldProps {
  id: string
  label: string
  value: string
  onChange: (name: string) => void
  error?: string
  disabled?: boolean
}

export function ShipAutocompleteField({
  id,
  label,
  value,
  onChange,
  error,
  disabled,
}: ShipAutocompleteFieldProps) {
  return (
    <SearchSelect<Ship>
      id={id}
      label={label}
      value={value}
      onSelect={(ship) => onChange(ship.name)}
      error={error}
      disabled={disabled}
      placeholder="-- Pilih Kapal --"
      searchPlaceholder="Cari nama kapal..."
      emptyText="Kapal tidak ditemukan"
      getItemKey={(ship) => ship.id}
      onSearch={async (query) => {
        const res = await listShips({ search: query || undefined, limit: 10 })
        return res.data
      }}
      renderItem={(ship) => ship.name}
    />
  )
}
