import type { ApprovalStatus, ApprovalStep } from "./form-a2"

export interface ApprovalLogItem {
  id: string
  form_a2_id: string
  form_a2_number: string
  cr9_form_number: string
  seaman_name: string
  seaman_code: string
  ship: string
  branch_office: string
  step: ApprovalStep
  status: ApprovalStatus
  percentage: string | null
  notes: string | null
  actioned_by: string
  actioner_name: string
  actioner_email: string
  actioned_at: string
}

export interface ApprovalLogListParams {
  page?: number
  limit?: number
  form_number?: string
  seaman_name?: string
  step?: ApprovalStep
  status?: ApprovalStatus
  from_date?: string
  to_date?: string
}
