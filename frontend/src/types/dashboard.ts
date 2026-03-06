export interface AdminStats {
  users: {
    total: number
    admin: number
    manager: number
    staff: number
    user: number
  }
  form_a2: {
    total: number
    draft: number
    submitted: number
    pending: number
    approved: number
    revision: number
    rejected: number
  }
  form_cr9: {
    total: number
    draft: number
    submitted: number
  }
}
