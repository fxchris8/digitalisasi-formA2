export interface FormCr9Receipt {
  id: string
  form_cr9_id: string
  storage_path: string
  added_by: string | null
  added_at: Date
}

export interface FormCr9ReceiptWithUploader extends FormCr9Receipt {
  added_by_name: string | null
  added_by_email: string | null
}
