export type FormCr9Status = "draft" | "submitted" | "approved" | "rejected"
export type Cr9Type = "perusahaan" | "reimbursement"

export interface FormCr9Receipt {
  id: string
  form_cr9_id: string
  storage_path: string
  added_by: string | null
  added_by_name: string | null
  added_by_email: string | null
  added_at: string
}

export interface FormCr9 {
  id: string
  created_by: string
  creator_name: string
  creator_email: string
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
  cr9_url_added_at: string | null
  receipt_url: string | null
  receipt_url_added_by: string | null
  receipt_url_added_at: string | null
  amount: string
  status: FormCr9Status
  submitted_at: string | null
  created_at: string
  updated_at: string
  // Info Form A2 terkait (join) — dipakai untuk status "Perlu Revisi"
  form_a2_id: string | null
  a2_status: string | null
  needs_cabang_revision: boolean
  revision_notes: string | null
  // Kuitansi (bisa >1 file) — hanya diisi di halaman detail, bukan di list.
  receipts?: FormCr9Receipt[]
}

export interface CostDetailItem {
  description: string
  amount: number
}

export interface CreateFormCr9Payload {
  seafarer_code: string
  seaman_code: string
  seaman_name: string
  position: string
  ship: string
  complaint: string
  cr9_url: string
  receipt_urls: string[]
  diagnosis: string
  cr9_type: Cr9Type
  is_work_accident?: boolean
  hospital_id?: string
  hospital_name_manual?: string
  details: CostDetailItem[]
  branch_office?: string
}

export type UpdateFormCr9Payload = Partial<CreateFormCr9Payload>

export interface FormCr9ListParams {
  page?: number
  limit?: number
  form_number?: string
  seaman_name?: string
  seaman_code?: string
  ship?: string
  from_date?: string
  to_date?: string
}
