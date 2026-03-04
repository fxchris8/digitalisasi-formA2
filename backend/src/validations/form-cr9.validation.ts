import { z } from "zod"

export const createFormCr9Schema = z.object({
  seafarer_code: z.string().min(1, "Seafarer code wajib diisi"),
  seaman_code: z.string().min(1, "Seaman code wajib diisi"),
  seaman_name: z.string().min(1, "Nama seaman wajib diisi"),
  position: z.string().min(1, "Jabatan wajib diisi"),
  ship: z.string().min(1, "Nama kapal wajib diisi"),
  complaint: z.string().min(1, "Jenis keluhan wajib diisi"),
  cr9_url: z.string().min(1, "Dokumen CR9 wajib diupload"),
  receipt_url: z.string().min(1, "Kwitansi wajib diupload"),
  amount: z
    .number({ error: "Jumlah harus berupa angka" })
    .positive("Jumlah harus lebih dari 0"),
})

export const updateFormCr9Schema = createFormCr9Schema.partial()

export const listFormCr9Schema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  form_number: z.string().optional(),
  seaman_name: z.string().optional(),
  seaman_code: z.string().optional(),
  ship: z.string().optional(),
  from_date: z.string().optional(),
  to_date: z.string().optional(),
})

export type CreateFormCr9Dto = z.infer<typeof createFormCr9Schema>
export type UpdateFormCr9Dto = z.infer<typeof updateFormCr9Schema>
export type ListFormCr9Query = z.infer<typeof listFormCr9Schema>
