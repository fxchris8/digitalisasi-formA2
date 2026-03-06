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

export const approvalLogQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(15),
  form_number: z.string().optional(),
  seaman_name: z.string().optional(),
  step: z.enum(["spm", "nautica", "finance"]).optional(),
  status: z.enum(["approved", "revision", "rejected"]).optional(),
  from_date: z.string().optional(),
  to_date: z.string().optional(),
})

export type ApproveDto = z.infer<typeof approveSchema>
export type RevisionDto = z.infer<typeof revisionSchema>
export type RejectDto = z.infer<typeof rejectSchema>
export type ApprovalLogQueryDto = z.infer<typeof approvalLogQuerySchema>
