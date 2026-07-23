import type { HospitalCategory } from "@/types/hospital"

export type FormA2Status =
  | "draft"
  | "submitted"
  | "pending"
  | "revision"
  | "rejected"
  | "approved"

export type ApprovalStep = "spm" | "nautica" | "finance"
export type ApprovalStatus = "pending" | "approved" | "revision" | "rejected"
export type RevisionTargetRole = "staff_cabang" | "staff_spm"

export interface FormA2Revision {
  id: string
  form_a2_id: string
  step: ApprovalStep
  target_role: RevisionTargetRole
  requested_by: string
  requested_at: string
  notes: string | null
  resolved_by: string | null
  resolved_at: string | null
  is_resolved: boolean
}

export interface FormA2Detail {
  id: string
  form_a2_id: string
  description: string
  hospital_id: string
  amount: string
  created_at: string
  // hasil JOIN ke hospitals — sama untuk semua baris dalam 1 form
  hospital_name: string
  hospital_category: HospitalCategory
  hospital_province: string
  hospital_city: string
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
  active_revision: FormA2Revision | null
}

export interface UpdateFormA2Payload {
  news_url?: string
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
  target: RevisionTargetRole
}

export interface RejectPayload {
  notes: string
}
