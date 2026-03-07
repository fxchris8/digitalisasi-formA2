import pool from "@/config/database"

export interface ManagerStats {
  submitted: number
  pending: number
  approved: number
  revision: number
  rejected: number
}

export async function getManagerStats(
  userId: string,
  step: string,
): Promise<ManagerStats> {
  const [submittedRes, pendingRes, logRes] = await Promise.all([
    pool.query<{ count: string }>(
      `SELECT COUNT(*)::int AS count FROM form_a2 WHERE status != 'draft'`,
    ),
    pool.query<{ count: string }>(
      `SELECT COUNT(*)::int AS count
       FROM form_a2
       WHERE status = 'pending' AND current_step = $1`,
      [step],
    ),
    pool.query<{ status: string; count: string }>(
      `SELECT status, COUNT(*)::int AS count
       FROM form_a2_approval_log
       WHERE actioned_by = $1 AND step = $2
       GROUP BY status`,
      [userId, step],
    ),
  ])

  const logByStatus = Object.fromEntries(
    logRes.rows.map((r) => [r.status, Number(r.count)]),
  )
  const pick = (key: string) => logByStatus[key] ?? 0

  return {
    submitted: Number((submittedRes.rows[0] as { count: string }).count),
    pending: Number((pendingRes.rows[0] as { count: string }).count),
    approved: pick("approved"),
    revision: pick("revision"),
    rejected: pick("rejected"),
  }
}

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

export interface BranchStats {
  form_cr9: {
    draft: number
    submitted: number
  }
  form_a2: {
    approved: number
    revision: number
    rejected: number
  }
}

export async function getBranchStats(
  branchOffice: string | null,
): Promise<BranchStats> {
  const [cr9Res, a2Res] = await Promise.all([
    branchOffice
      ? pool.query<{ status: string; count: string }>(
          `SELECT status, COUNT(*)::int AS count
           FROM form_cr9
           WHERE branch_office = $1
           GROUP BY status`,
          [branchOffice],
        )
      : pool.query<{ status: string; count: string }>(
          `SELECT status, COUNT(*)::int AS count FROM form_cr9 GROUP BY status`,
        ),
    branchOffice
      ? pool.query<{ status: string; count: string }>(
          `SELECT a.status, COUNT(*)::int AS count
           FROM form_a2 a
           JOIN form_cr9 c ON c.id = a.form_cr9_id
           WHERE c.branch_office = $1
           GROUP BY a.status`,
          [branchOffice],
        )
      : pool.query<{ status: string; count: string }>(
          `SELECT status, COUNT(*)::int AS count FROM form_a2 GROUP BY status`,
        ),
  ])

  const cr9ByStatus = Object.fromEntries(
    cr9Res.rows.map((r) => [r.status, Number(r.count)]),
  )
  const a2ByStatus = Object.fromEntries(
    a2Res.rows.map((r) => [r.status, Number(r.count)]),
  )
  const pick = (map: Record<string, number>, key: string) => map[key] ?? 0

  return {
    form_cr9: {
      draft: pick(cr9ByStatus, "draft"),
      submitted: pick(cr9ByStatus, "submitted"),
    },
    form_a2: {
      approved: pick(a2ByStatus, "approved"),
      revision: pick(a2ByStatus, "revision"),
      rejected: pick(a2ByStatus, "rejected"),
    },
  }
}

export async function getAdminStats(): Promise<AdminStats> {
  const [userRes, a2Res, cr9Res] = await Promise.all([
    pool.query<{ role: string; count: string }>(
      `SELECT role, COUNT(*)::int AS count FROM users GROUP BY role`,
    ),
    pool.query<{ status: string; count: string }>(
      `SELECT status, COUNT(*)::int AS count FROM form_a2 GROUP BY status`,
    ),
    pool.query<{ status: string; count: string }>(
      `SELECT status, COUNT(*)::int AS count FROM form_cr9 GROUP BY status`,
    ),
  ])

  const userByRole = Object.fromEntries(
    userRes.rows.map((r) => [r.role, Number(r.count)]),
  )
  const a2ByStatus = Object.fromEntries(
    a2Res.rows.map((r) => [r.status, Number(r.count)]),
  )
  const cr9ByStatus = Object.fromEntries(
    cr9Res.rows.map((r) => [r.status, Number(r.count)]),
  )

  const pick = (map: Record<string, number>, key: string) => map[key] ?? 0

  return {
    users: {
      total: userRes.rows.reduce((s, r) => s + Number(r.count), 0),
      admin: pick(userByRole, "admin"),
      manager: pick(userByRole, "manager"),
      staff: pick(userByRole, "staff"),
      user: pick(userByRole, "user"),
    },
    form_a2: {
      total: a2Res.rows.reduce((s, r) => s + Number(r.count), 0),
      draft: pick(a2ByStatus, "draft"),
      submitted: pick(a2ByStatus, "submitted"),
      pending: pick(a2ByStatus, "pending"),
      approved: pick(a2ByStatus, "approved"),
      revision: pick(a2ByStatus, "revision"),
      rejected: pick(a2ByStatus, "rejected"),
    },
    form_cr9: {
      total: cr9Res.rows.reduce((s, r) => s + Number(r.count), 0),
      draft: pick(cr9ByStatus, "draft"),
      submitted: pick(cr9ByStatus, "submitted"),
    },
  }
}
