import { z } from "zod"

// Jumlah biaya (amount) sengaja tidak ada di sini — dihitung otomatis dari
// SUM rincian biaya (lihat costDetailItemSchema), bukan input manual lagi.
export const formCr9Schema = z.object({
  seafarer_code: z.string().min(1, "Seafarer code wajib diisi"),
  seaman_code: z.string().min(1, "Seaman code wajib diisi"),
  seaman_name: z.string().min(1, "Seaman name wajib diisi"),
  position: z.string().min(1, "Jabatan wajib diisi"),
  ship: z.string().min(1, "Nama kapal wajib diisi"),
  complaint: z.string().min(1, "Jenis keluhan wajib diisi"),
  cr9_url: z.string().min(1, "Dokumen CR9 wajib diupload"),
  receipt_url: z.string().min(1, "Kwitansi wajib diupload"),
  diagnosis: z.string().min(1, "Diagnosis wajib diisi"),
  hospital_id: z.string().min(1, "Rumah sakit wajib dipilih"),
  branch_office: z.string().optional(),
})

export const costDetailItemSchema = z.object({
  description: z.string().min(1, "Uraian wajib diisi"),
  amount: z
    .number({ error: "Jumlah harus berupa angka" })
    .positive("Jumlah harus lebih dari 0"),
})

export type FormCr9State = z.infer<typeof formCr9Schema>
