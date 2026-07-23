export function formatRupiah(value: string | number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(Number(value))
}

/** Format angka jadi string dengan pemisah ribuan ala id-ID, untuk dipakai di dalam input (mis. "150.000"). */
export function formatRupiahInput(value: number): string {
  if (!value) return ""
  return new Intl.NumberFormat("id-ID").format(value)
}

/** Kebalikan formatRupiahInput — buang semua karakter non-digit, kembalikan number murni. */
export function parseRupiahInput(value: string): number {
  const digitsOnly = value.replace(/\D/g, "")
  return digitsOnly ? Number(digitsOnly) : 0
}

export function formatDateTime(value: string | Date) {
  return new Date(value).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function formatDate(value: string | Date) {
  return new Date(value).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}
