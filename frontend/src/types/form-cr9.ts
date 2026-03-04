export type FormCr9Status = "draft" | "submitted" | "approved" | "rejected"

export interface FormCr9 {
  id: string
  created_by: string
  creator_name: string
  branch_office: string
  seq_number: number
  month: number
  year: number
  form_number: string
  seafarer_code: string
  seaman_code: string
  seaman_name: string
  position: string
  ship: string
  complaint: string
  cr9_url: string
  cr9_url_added_by: string | null
  cr9_url_added_at: string | null
  receipt_url: string
  receipt_url_added_by: string | null
  receipt_url_added_at: string | null
  amount: string
  status: FormCr9Status
  submitted_at: string | null
  created_at: string
  updated_at: string
}

export interface CreateFormCr9Payload {
  seafarer_code: string
  seaman_code: string
  seaman_name: string
  position: string
  ship: string
  complaint: string
  cr9_url: string
  receipt_url: string
  amount: number
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
