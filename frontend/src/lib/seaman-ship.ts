/**
 * `seamen.last_location` tidak selalu berisi nama kapal — kalau seaman sedang
 * tidak bertugas, isinya status darat seperti "DARAT BIASA", "DARAT STAND-BY",
 * "PENDING CUTI", atau "PENDING GAJI".
 *
 * Nama kapal yang tersimpan di sini sudah diselaraskan dengan master `ships`
 * (lihat backend `db:sync-ships`), jadi nilainya aman dipakai langsung sebagai
 * isi field "Nama Kapal" di Form CR9.
 */
export function isShipLocation(location: string | null | undefined): boolean {
  if (!location?.trim()) return false
  return !/darat|pending/i.test(location)
}

/** Nama kapal dari data seaman, atau null kalau dia sedang tidak bertugas. */
export function shipFromSeamanLocation(
  location: string | null | undefined,
): string | null {
  return isShipLocation(location) ? (location as string).trim() : null
}
