import { Input } from "@/components/ui/input"
import { formatRupiahInput, parseRupiahInput } from "@/lib/format"

interface CurrencyInputProps {
  id?: string
  value: number
  onChange: (value: number) => void
  placeholder?: string
  disabled?: boolean
}

/** Input angka dengan pemisah ribuan otomatis (id-ID) saat mengetik, value keluar sebagai number murni. */
export function CurrencyInput({
  id,
  value,
  onChange,
  placeholder = "0",
  disabled,
}: CurrencyInputProps) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
        Rp
      </span>
      <Input
        id={id}
        type="text"
        inputMode="numeric"
        className="pl-9 text-right"
        placeholder={placeholder}
        value={formatRupiahInput(value)}
        disabled={disabled}
        onChange={(e) => onChange(parseRupiahInput(e.target.value))}
      />
    </div>
  )
}
