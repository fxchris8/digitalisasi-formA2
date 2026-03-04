import { z } from "zod"

export const updateFormA2Schema = z.object({
  diagnosis: z.string().min(1, "Diagnosis wajib diisi").optional(),
  news_url: z.string().min(1, "URL berita acara wajib diisi").optional(),
})

export const addDetailSchema = z.object({
  description: z.string().min(1, "Uraian wajib diisi"),
  hospital_name: z.string().min(1, "Nama rumah sakit wajib diisi"),
  hospital_category: z.string().min(1, "Kategori rumah sakit wajib diisi"),
  amount: z
    .number({ error: "Jumlah harus berupa angka" })
    .positive("Jumlah harus lebih dari 0"),
})

export const listFormA2Schema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  form_number: z.string().optional(),
  seaman_name: z.string().optional(),
  from_date: z.string().optional(),
  to_date: z.string().optional(),
})

export type UpdateFormA2Dto = z.infer<typeof updateFormA2Schema>
export type AddDetailDto = z.infer<typeof addDetailSchema>
export type ListFormA2Query = z.infer<typeof listFormA2Schema>
