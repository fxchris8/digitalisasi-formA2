import type { TimelineEntry } from "@/components/ui/timeline"
import { Timeline } from "@/components/ui/timeline"
import type { FormA2WithDetails } from "@/types/form-a2"
import type { FormCr9 } from "@/types/form-cr9"

const APPROVAL_STEP_LABEL: Record<string, string> = {
  spm: "Review Manager SPM",
  nautica: "Review Manager Nautica",
  finance: "Review Finance",
}

const APPROVAL_STEPS = ["nautica", "spm", "finance"] as const

function buildEntries(
  form: FormA2WithDetails,
  cr9: FormCr9 | null,
): TimelineEntry[] {
  const entries: TimelineEntry[] = []

  // 1. CR9 Dibuat
  entries.push({
    title: "Form CR9 Dibuat",
    status: "done",
    timestamp: cr9?.created_at ?? null,
    actor: cr9?.creator_name ?? null,
  })

  // 2. CR9 Diajukan ke SPM
  // form.submitted_at di form_a2 = saat CR9 diajukan (copied on A2 creation)
  const cr9SubmittedAt = cr9?.submitted_at ?? form.submitted_at

  if (!cr9SubmittedAt) {
    entries.push({ title: "CR9 Diajukan ke SPM", status: "pending" })
    entries.push({ title: "Form A2 Dibuat oleh SPM", status: "pending" })
    entries.push({ title: "A2 Diajukan ke Manager Nautica", status: "pending" })
    for (const step of APPROVAL_STEPS) {
      entries.push({ title: APPROVAL_STEP_LABEL[step], status: "pending" })
    }
    return entries
  }

  entries.push({
    title: "CR9 Diajukan ke SPM",
    status: "done",
    timestamp: cr9SubmittedAt,
    actor: cr9?.creator_name ?? null,
  })

  // 3. A2 Dibuat (selalu ada karena kita sudah di halaman A2)
  entries.push({
    title: "Form A2 Dibuat oleh SPM",
    status: "done",
    timestamp: form.created_at,
    actor: form.creator_name,
  })

  // 4. A2 Diajukan ke Manager
  if (!form.submitted_to_manager_at) {
    entries.push({ title: "A2 Diajukan ke Manager Nautica", status: "pending" })
    for (const step of APPROVAL_STEPS) {
      entries.push({ title: APPROVAL_STEP_LABEL[step], status: "pending" })
    }
    return entries
  }

  entries.push({
    title: "A2 Diajukan ke Manager Nautica",
    status: "done",
    timestamp: form.submitted_to_manager_at,
    actor: form.submitted_to_manager_name ?? null,
  })

  // 5–7. Approval logs (semua, berurutan)
  const logStatusMap = {
    approved: "done",
    revision: "revision",
    rejected: "rejected",
  } as const

  for (const log of form.approval_logs) {
    entries.push({
      title: APPROVAL_STEP_LABEL[log.step] ?? log.step,
      status: logStatusMap[log.status as keyof typeof logStatusMap] ?? "done",
      timestamp: log.actioned_at,
      actor: log.actioner_name ?? null,
      notes: log.notes,
      extra: log.percentage ? `Persentase: ${Number(log.percentage)}%` : null,
    })
  }

  // Placeholder untuk langkah yang belum terjadi
  if (form.status === "approved" || form.status === "rejected") return entries

  const currentStepIdx = form.current_step
    ? APPROVAL_STEPS.indexOf(form.current_step)
    : -1

  if (
    (form.status === "revision" || form.status === "pending") &&
    form.current_step
  ) {
    entries.push({
      title: APPROVAL_STEP_LABEL[form.current_step],
      status: "pending",
    })
    for (let i = currentStepIdx + 1; i < APPROVAL_STEPS.length; i++) {
      entries.push({
        title: APPROVAL_STEP_LABEL[APPROVAL_STEPS[i]],
        status: "pending",
      })
    }
  } else if (form.status === "draft" || form.status === "submitted") {
    for (const step of APPROVAL_STEPS) {
      entries.push({ title: APPROVAL_STEP_LABEL[step], status: "pending" })
    }
  }

  return entries
}

export function A2Timeline({
  form,
  cr9,
}: {
  form: FormA2WithDetails
  cr9: FormCr9 | null
}) {
  return <Timeline entries={buildEntries(form, cr9)} />
}
