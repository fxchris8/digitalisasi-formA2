import { z } from "zod"

export const costDetailItemSchema = z.object({
  description: z.string().min(1, "Uraian wajib diisi"),
  amount: z
    .number({ error: "Jumlah harus berupa angka" })
    .positive("Jumlah harus lebih dari 0"),
})

// CR9 Perusahaan (existing) pakai rumah sakit dari master data (hospital_id).
// CR9 Reimbursement: rumah sakit diketik bebas (hospital_name_manual), tanpa
// kategori — persentase reimbursement-nya ditentukan oleh is_work_accident,
// bukan kategori RS. Field-field XOR ini divalidasi lewat .refine() di bawah.
const cr9BaseObjectSchema = z.object({
  seafarer_code: z.string().min(1, "Seafarer code wajib diisi"),
  seaman_code: z.string().min(1, "Seaman code wajib diisi"),
  seaman_name: z.string().min(1, "Nama seaman wajib diisi"),
  position: z.string().min(1, "Jabatan wajib diisi"),
  ship: z.string().min(1, "Nama kapal wajib diisi"),
  complaint: z.string().min(1, "Jenis keluhan wajib diisi"),
  cr9_url: z.string().min(1, "Dokumen CR9 wajib diupload"),
  receipt_urls: z
    .array(z.string().min(1))
    .min(1, "Minimal satu kwitansi wajib diupload"),
  diagnosis: z.string().min(1, "Diagnosis wajib diisi"),
  cr9_type: z.enum(["perusahaan", "reimbursement"]).default("perusahaan"),
  is_work_accident: z.boolean().optional(),
  hospital_id: z.string().uuid("Rumah sakit tidak valid").optional(),
  hospital_name_manual: z
    .string()
    .min(1, "Nama rumah sakit wajib diisi")
    .optional(),
  details: z
    .array(costDetailItemSchema)
    .min(1, "Minimal satu uraian biaya wajib diisi"),
  branch_office: z.string().min(1).optional(),
})

function hospitalMatchesType(d: {
  cr9_type?: "perusahaan" | "reimbursement" | undefined
  hospital_id?: string | undefined
  hospital_name_manual?: string | undefined
}): boolean {
  if (d.cr9_type === undefined) return true
  return d.cr9_type === "reimbursement"
    ? !!d.hospital_name_manual && !d.hospital_id
    : !!d.hospital_id && !d.hospital_name_manual
}

export const createFormCr9Schema = cr9BaseObjectSchema.refine(
  hospitalMatchesType,
  {
    message:
      "Rumah sakit wajib dipilih (CR9 Perusahaan) atau diisi manual (CR9 Reimbursement)",
    path: ["hospital_id"],
  },
)

export const updateFormCr9Schema = cr9BaseObjectSchema.partial().refine(
  (d) => {
    // Kalau field rumah sakit tidak dikirim di update ini, tidak perlu divalidasi.
    if (d.hospital_id === undefined && d.hospital_name_manual === undefined) {
      return true
    }
    return hospitalMatchesType(d)
  },
  {
    message:
      "Rumah sakit wajib dipilih (CR9 Perusahaan) atau diisi manual (CR9 Reimbursement)",
    path: ["hospital_id"],
  },
)

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
