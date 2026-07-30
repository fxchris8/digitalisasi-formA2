import apiClient from "@/lib/api-client"
import { unwrap } from "@/lib/api-utils"
import type { ApiResponse } from "@/types/api"
import type { ExtractedReceiptData } from "@/types/extraction"

export async function extractReceipt(
  receiptUrls: string[],
): Promise<ExtractedReceiptData> {
  const res = await apiClient.post<ApiResponse<ExtractedReceiptData>>(
    "/api/extraction/receipt",
    { receipt_urls: receiptUrls },
  )
  return unwrap(res.data)
}
