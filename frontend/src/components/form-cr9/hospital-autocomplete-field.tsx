import { listHospitals } from "@/api/hospitals"
import { SearchSelect } from "@/components/ui/search-select"
import type { Hospital } from "@/types/hospital"

interface HospitalAutocompleteFieldProps {
  id: string
  label: string
  value: string
  onSelect: (hospital: Hospital) => void
  error?: string
  disabled?: boolean
}

const CATEGORY_LABEL: Record<Hospital["category"], string> = {
  swasta: "Swasta",
  pemerintah: "Pemerintah",
}

export function HospitalAutocompleteField({
  id,
  label,
  value,
  onSelect,
  error,
  disabled,
}: HospitalAutocompleteFieldProps) {
  return (
    <SearchSelect<Hospital>
      id={id}
      label={label}
      value={value}
      onSelect={onSelect}
      error={error}
      disabled={disabled}
      placeholder="-- Pilih Rumah Sakit --"
      searchPlaceholder="Cari nama rumah sakit..."
      emptyText="Rumah sakit tidak ditemukan"
      getItemKey={(hospital) => hospital.id}
      onSearch={async (query) => {
        const res = await listHospitals({
          search: query || undefined,
          limit: 10,
        })
        return res.data
      }}
      renderItem={(hospital) => (
        <div>
          <div className="font-medium">{hospital.name}</div>
          <div className="text-xs text-muted-foreground">
            {hospital.city}, {hospital.province} —{" "}
            {CATEGORY_LABEL[hospital.category]}
          </div>
        </div>
      )}
    />
  )
}
