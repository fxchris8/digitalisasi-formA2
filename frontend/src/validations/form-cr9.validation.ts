import { z } from "zod"

// Jumlah biaya (amount) sengaja tidak ada di sini — dihitung otomatis dari
// SUM rincian biaya (lihat costDetailItemSchema), bukan input manual lagi.
export const formCr9Schema = z
  .object({
    seafarer_code: z.string().min(1, "Seafarer code wajib diisi"),
    seaman_code: z.string().min(1, "Seaman code wajib diisi"),
    seaman_name: z.string().min(1, "Seaman name wajib diisi"),
    position: z.string().min(1, "Jabatan wajib diisi"),
    ship: z.string().min(1, "Nama kapal wajib diisi"),
    complaint: z.string().min(1, "Jenis keluhan wajib diisi"),
    cr9_url: z.string().min(1, "Dokumen CR9 wajib diupload"),
    diagnosis: z.string().min(1, "Diagnosis wajib diisi"),
    cr9_type: z.enum(["perusahaan", "reimbursement"]),
    is_work_accident: z.boolean().optional(),
    hospital_id: z.string().optional(),
    hospital_name_manual: z.string().optional(),
    branch_office: z.string().optional(),
  })
  .refine(
    (d) =>
      d.cr9_type === "reimbursement"
        ? !!d.hospital_name_manual?.trim()
        : !!d.hospital_id,
    {
      message:
        "Rumah sakit wajib dipilih (CR9 Perusahaan) atau diisi manual (CR9 Reimbursement)",
      path: ["hospital_id"],
    },
  )

export const costDetailItemSchema = z.object({
  description: z.string().min(1, "Uraian wajib diisi"),
  amount: z
    .number({ error: "Jumlah harus berupa angka" })
    .positive("Jumlah harus lebih dari 0"),
})

export type FormCr9State = z.infer<typeof formCr9Schema>
