import { z } from "zod"

export const formCr9Schema = z.object({
  seafarer_code: z.string().min(1, "Seafarer code wajib diisi"),
  seaman_code: z.string().min(1, "Seaman code wajib diisi"),
  seaman_name: z.string().min(1, "Seaman name wajib diisi"),
  position: z.string().min(1, "Jabatan wajib diisi"),
  ship: z.string().min(1, "Nama kapal wajib diisi"),
  complaint: z.string().min(1, "Jenis keluhan wajib diisi"),
  cr9_url: z.string().min(1, "Dokumen CR9 wajib diupload"),
  receipt_url: z.string().min(1, "Kwitansi wajib diupload"),
  amount: z
    .string()
    .min(1, "Jumlah biaya wajib diisi")
    .refine((v) => {
      const n = Number(v)
      return !Number.isNaN(n) && n > 0
    }, "Jumlah biaya harus lebih dari 0"),
  branch_office: z.string().optional(),
})

export type FormCr9State = z.infer<typeof formCr9Schema>
