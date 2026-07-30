/** Format angka/string NUMERIC jadi "Rp X.XXX.XXX" — dipakai di halaman PDF hasil generate. */
export function formatRupiahPlain(value: string | number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(Number(value))
}

/** Format tanggal jadi "DD Bulan YYYY" — dipakai di halaman PDF hasil generate. */
export function formatDatePlain(value: string | Date): string {
  return new Date(value).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

/** Gabungkan nama + email aktor, mis. "Budi (budi@spil.co.id)" — dipakai di halaman PDF hasil generate. */
export function formatActorPlain(
  name: string | null | undefined,
  email?: string | null,
): string {
  if (!name) return "-"
  return email ? `${name} (${email})` : name
}
