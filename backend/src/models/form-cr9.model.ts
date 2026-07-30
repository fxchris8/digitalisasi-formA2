import type { FormCr9ReceiptWithUploader } from "@/models/form-cr9-receipt.model"

/**
 * Domain model — representasi data entitas FormCr9, mapping ke skema DB.
 */
export type Cr9Type = "perusahaan" | "reimbursement"

export interface FormCr9 {
  id: string
  created_by: string
  branch_office: string
  seq_number: number
  month: number
  year: number
  form_number: string
  cr9_type: Cr9Type
  is_work_accident: boolean | null
  seafarer_code: string
  seaman_code: string
  seaman_name: string
  position: string
  ship: string
  complaint: string
  cr9_url: string
  cr9_url_added_by: string | null
  cr9_url_added_at: Date | null
  receipt_url: string | null
  receipt_url_added_by: string | null
  receipt_url_added_at: Date | null
  amount: string // NUMERIC dari pg dikembalikan sebagai string
  status: string
  submitted_at: Date | null
  created_at: Date
  updated_at: Date
}

export interface FormCr9WithCreator extends FormCr9 {
  creator_name: string
  creator_email: string
  // Info Form A2 terkait (join), dipakai untuk menampilkan status "Perlu Revisi"
  // di list/detail CR9 saat revisi Form A2 ditujukan ke staff cabang.
  form_a2_id: string | null
  a2_status: string | null
  needs_cabang_revision: boolean
  revision_notes: string | null
  // Kuitansi (bisa >1 file) — hanya diisi di findById, bukan findAll (list).
  receipts?: FormCr9ReceiptWithUploader[]
}
