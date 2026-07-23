import type { HospitalCategory } from "@/models/hospital.model"

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
  news_added_at: Date | null
  status: FormA2Status
  current_step: ApprovalStep | null
  submitted_at: Date | null
  submitted_to_manager_at: Date | null
  submitted_to_manager_by: string | null
  created_at: Date
  updated_at: Date
}

export interface FormA2Detail {
  id: string
  form_a2_id: string
  description: string
  hospital_id: string
  amount: string // NUMERIC dari pg
  created_at: Date
  // Hasil JOIN ke hospitals — dipakai untuk display, sama untuk semua baris dalam 1 form
  hospital_name: string
  hospital_category: HospitalCategory
  hospital_province: string
  hospital_city: string
}

export interface FormA2Revision {
  id: string
  form_a2_id: string
  step: ApprovalStep
  target_role: RevisionTargetRole
  requested_by: string
  requested_at: Date
  notes: string | null
  resolved_by: string | null
  resolved_at: Date | null
  is_resolved: boolean
}

export interface FormA2ApprovalLog {
  id: string
  form_a2_id: string
  step: ApprovalStep
  status: ApprovalStatus
  percentage: string | null // NUMERIC dari pg
  notes: string | null
  actioned_by: string
  actioned_at: Date
  actioner_name?: string
}

/** Dipakai di halaman list — join ke form_cr9 dan users */
export interface FormA2WithCr9 extends FormA2 {
  cr9_form_number: string
  branch_office: string
  seaman_name: string
  seaman_code: string
  ship: string
  creator_name: string
  cr9_amount: string // NUMERIC dari pg, amount dari form_cr9
  submitted_to_manager_name: string | null
}

/** Dipakai di halaman detail — sertakan details & approval logs */
export interface FormA2WithDetails extends FormA2WithCr9 {
  details: FormA2Detail[]
  approval_logs: FormA2ApprovalLog[]
  active_revision: FormA2Revision | null
}
