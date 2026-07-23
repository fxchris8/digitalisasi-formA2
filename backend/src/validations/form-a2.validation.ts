import { z } from "zod"

// Diagnosis & rincian biaya diisi staff cabang di tahap Form CR9 (lihat
// form-cr9.validation.ts) — di Form A2, staff SPM hanya mengisi berita acara.
export const updateFormA2Schema = z.object({
  news_url: z.string().min(1, "URL berita acara wajib diisi").optional(),
})

export const listFormA2Schema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  form_number: z.string().optional(),
  seaman_name: z.string().optional(),
  from_date: z.string().optional(),
  to_date: z.string().optional(),
})

// Staff SPM mengirim CR9/A2 kembali ke staff cabang untuk perbaikan data
// (seafarer code salah, dokumen keliru, dll) — sebelum form pernah diajukan
// ke manager sama sekali. Target selalu staff_cabang, jadi tidak perlu dipilih.
export const requestCabangRevisionSchema = z.object({
  notes: z.string().min(1, "Catatan revisi wajib diisi"),
})

export type UpdateFormA2Dto = z.infer<typeof updateFormA2Schema>
export type ListFormA2Query = z.infer<typeof listFormA2Schema>
export type RequestCabangRevisionDto = z.infer<
  typeof requestCabangRevisionSchema
>
