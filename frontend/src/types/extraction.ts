export interface ExtractedReceiptDetail {
  description: string
  amount: number
}

export interface ExtractedReceiptData {
  hospital_name: string | null
  hospital_id: string | null
  date: string | null
  total_amount: number | null
  details: ExtractedReceiptDetail[]
}
