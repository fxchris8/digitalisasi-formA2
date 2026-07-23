export interface ExtractedReceiptDetail {
  description: string
  amount: number
}

export interface ExtractedReceiptData {
  hospital_name: string | null
  /** Hasil pencocokan nama RS hasil ekstraksi ke tabel hospitals — null kalau tidak ketemu match. */
  hospital_id: string | null
  date: string | null
  total_amount: number | null
  details: ExtractedReceiptDetail[]
}
