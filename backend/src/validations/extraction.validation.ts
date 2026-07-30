import { z } from "zod"

export const extractReceiptSchema = z.object({
  receipt_urls: z
    .array(z.string().min(1))
    .min(1, "receipt_urls wajib diisi minimal satu"),
})

export type ExtractReceiptDto = z.infer<typeof extractReceiptSchema>
