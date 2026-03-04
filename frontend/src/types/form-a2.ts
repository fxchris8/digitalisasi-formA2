export type FormA2Status =
  | "draft"
  | "submitted"
  | "pending"
  | "revision"
  | "rejected"
  | "approved"

export type ApprovalStep = "spm" | "nautica" | "finance"
export type ApprovalStatus = "pending" | "approved" | "revision" | "rejected"

export interface FormA2Detail {
  id: string
  form_a2_id: string
  description: string
  hospital_name: string
  hospital_category: string
  amount: string
  created_at: string
}

export interface FormA2ApprovalLog {
  id: string
  form_a2_id: string
  step: ApprovalStep
  status: ApprovalStatus
  percentage: string | null
  notes: string | null
  actioned_by: string
  actioned_at: string
  actioner_name?: string
}

export interface FormA2 {
  id: string
  form_cr9_id: string
  created_by: string
  seq_number: number
  month: number
  year: number
  form_number: string
  diagnosis: string
  news_url: string | null
  news_added_by: string | null
  news_added_at: string | null
  status: FormA2Status
  current_step: ApprovalStep | null
  submitted_at: string | null
  submitted_to_manager_at: string | null
  submitted_to_manager_by: string | null
  created_at: string
  updated_at: string
  // from join
  cr9_form_number: string
  branch_office: string
  seaman_name: string
  seaman_code: string
  ship: string
  creator_name: string
  cr9_amount: string
  submitted_to_manager_name: string | null
}

export interface FormA2WithDetails extends FormA2 {
  details: FormA2Detail[]
  approval_logs: FormA2ApprovalLog[]
}

export interface UpdateFormA2Payload {
  diagnosis?: string
  news_url?: string
}

export interface AddDetailPayload {
  description: string
  hospital_name: string
  hospital_category: string
  amount: number
}

export interface FormA2ListParams {
  page?: number
  limit?: number
  form_number?: string
  seaman_name?: string
  from_date?: string
  to_date?: string
}

export interface ApprovePayload {
  percentage: number
  notes?: string
}

export interface RevisionPayload {
  notes: string
}

export interface RejectPayload {
  notes: string
}
