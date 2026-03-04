import { z } from "zod"

export const approveSchema = z.object({
  percentage: z.number().min(0).max(100),
  notes: z.string().optional(),
})

export const revisionSchema = z.object({
  notes: z.string().min(1, "Catatan revisi wajib diisi"),
})

export const rejectSchema = z.object({
  notes: z.string().min(1, "Alasan penolakan wajib diisi"),
})

export type ApproveDto = z.infer<typeof approveSchema>
export type RevisionDto = z.infer<typeof revisionSchema>
export type RejectDto = z.infer<typeof rejectSchema>
