import { z } from "zod"

export const listBranchOfficeSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(15),
  province: z.string().optional(),
  city: z.string().optional(),
})

export const createBranchOfficeSchema = z.object({
  province: z.string().min(1, "Provinsi wajib diisi"),
  city: z.string().min(1, "Kota wajib diisi"),
})

export const updateBranchOfficeSchema = createBranchOfficeSchema.partial()

export type ListBranchOfficeDto = z.infer<typeof listBranchOfficeSchema>
export type CreateBranchOfficeDto = z.infer<typeof createBranchOfficeSchema>
export type UpdateBranchOfficeDto = z.infer<typeof updateBranchOfficeSchema>
