import { z } from "zod"

export const listSeamenSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional(),
  status: z.string().optional(),
  fleet: z.string().optional(),
})

export const syncSeamenSchema = z.object({
  age: z.number().default(0),
  status: z.string().default(""),
  education: z.string().default(""),
  experience: z.string().default(""),
  certificate: z.string().default(""),
  last_location: z.string().default(""),
  last_position: z.string().default(""),
})

export type ListSeamenQuery = z.infer<typeof listSeamenSchema>
export type SyncSeamenDto = z.infer<typeof syncSeamenSchema>
