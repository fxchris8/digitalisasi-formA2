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
  form: FormCr9,
  a2: FormA2WithDetails | null,
): TimelineEntry[] {
  const entries: TimelineEntry[] = []

  // 1. CR9 Dibuat
  entries.push({
    title: "Form CR9 Dibuat",
    status: "done",
    timestamp: form.created_at,
    actor: form.creator_name,
  })

  // 2. CR9 Diajukan ke SPM
  if (!form.submitted_at) {
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
    timestamp: form.submitted_at,
    actor: form.creator_name,
  })

  // 3. A2 Dibuat
  if (!a2) {
    entries.push({ title: "Form A2 Dibuat oleh SPM", status: "pending" })
    entries.push({ title: "A2 Diajukan ke Manager Nautica", status: "pending" })
    for (const step of APPROVAL_STEPS) {
      entries.push({ title: APPROVAL_STEP_LABEL[step], status: "pending" })
    }
    return entries
  }

  entries.push({
    title: "Form A2 Dibuat oleh SPM",
    status: "done",
    timestamp: a2.created_at,
    actor: a2.creator_name,
  })

  // 4. A2 Diajukan ke Manager
  if (!a2.submitted_to_manager_at) {
    entries.push({ title: "A2 Diajukan ke Manager Nautica", status: "pending" })
    for (const step of APPROVAL_STEPS) {
      entries.push({ title: APPROVAL_STEP_LABEL[step], status: "pending" })
    }
    return entries
  }

  entries.push({
    title: "A2 Diajukan ke Manager Nautica",
    status: "done",
    timestamp: a2.submitted_to_manager_at,
    actor: a2.submitted_to_manager_name ?? null,
  })

  // 5–7. Approval logs (semua, berurutan)
  const logStatusMap = {
    approved: "done",
    revision: "revision",
    rejected: "rejected",
  } as const

  for (const log of a2.approval_logs) {
    entries.push({
      title: APPROVAL_STEP_LABEL[log.step] ?? log.step,
      status: logStatusMap[log.status as keyof typeof logStatusMap] ?? "done",
      timestamp: log.actioned_at,
      actor: log.actioner_name,
      notes: log.notes,
      extra: log.percentage ? `Persentase: ${Number(log.percentage)}%` : null,
    })
  }

  // Placeholder untuk langkah yang belum terjadi
  if (a2.status === "approved" || a2.status === "rejected") return entries

  const currentStepIdx = a2.current_step
    ? APPROVAL_STEPS.indexOf(a2.current_step)
    : -1

  // Jika revision/pending, tampilkan pending untuk step saat ini dan berikutnya
  if (
    (a2.status === "revision" || a2.status === "pending") &&
    a2.current_step
  ) {
    entries.push({
      title: APPROVAL_STEP_LABEL[a2.current_step],
      status: "pending",
    })
    for (let i = currentStepIdx + 1; i < APPROVAL_STEPS.length; i++) {
      entries.push({
        title: APPROVAL_STEP_LABEL[APPROVAL_STEPS[i]],
        status: "pending",
      })
    }
  } else if (a2.status === "draft") {
    for (const step of APPROVAL_STEPS) {
      entries.push({ title: APPROVAL_STEP_LABEL[step], status: "pending" })
    }
  }

  return entries
}

export function Cr9Timeline({
  form,
  a2,
}: {
  form: FormCr9
  a2: FormA2WithDetails | null
}) {
  return <Timeline entries={buildEntries(form, a2)} />
}
