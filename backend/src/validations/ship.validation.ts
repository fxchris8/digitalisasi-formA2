import { z } from "zod"

export const listShipSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(15),
  search: z.string().optional(),
})

export const createShipSchema = z.object({
  name: z.string().min(1, "Nama kapal wajib diisi"),
})

export const updateShipSchema = createShipSchema.partial()

export type ListShipQuery = z.infer<typeof listShipSchema>
export type CreateShipDto = z.infer<typeof createShipSchema>
export type UpdateShipDto = z.infer<typeof updateShipSchema>
