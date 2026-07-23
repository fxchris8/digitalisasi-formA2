import { z } from "zod"

export const extractReceiptSchema = z.object({
  receipt_url: z.string().min(1, "receipt_url wajib diisi"),
})

export type ExtractReceiptDto = z.infer<typeof extractReceiptSchema>
