import { z } from "zod"

export const listHospitalSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(15),
  search: z.string().optional(),
  category: z.enum(["swasta", "pemerintah"]).optional(),
})

export const createHospitalSchema = z.object({
  name: z.string().min(1, "Nama rumah sakit wajib diisi"),
  province: z.string().min(1, "Provinsi wajib diisi"),
  city: z.string().min(1, "Kab/Kota wajib diisi"),
  category: z.enum(["swasta", "pemerintah"], {
    error: "Kategori wajib diisi (swasta/pemerintah)",
  }),
  owner_type: z.string().optional(),
})

export const updateHospitalSchema = createHospitalSchema.partial()

export type ListHospitalDto = z.infer<typeof listHospitalSchema>
export type CreateHospitalDto = z.infer<typeof createHospitalSchema>
export type UpdateHospitalDto = z.infer<typeof updateHospitalSchema>
