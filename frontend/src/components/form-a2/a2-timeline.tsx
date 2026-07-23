import type { TimelineEntry } from "@/components/ui/timeline"
import { Timeline } from "@/components/ui/timeline"
import type { ApprovalStep, FormA2WithDetails } from "@/types/form-a2"
import type { FormCr9 } from "@/types/form-cr9"

const APPROVAL_STEP_LABEL: Record<string, string> = {
  spm: "Review Manager SPM",
  nautica: "Review Manager Nautica",
  finance: "Review Finance",
}

const STEP_SHORT_LABEL: Record<ApprovalStep, string> = {
  spm: "Manager SPM",
  nautica: "Manager Nautica",
  finance: "Finance",
}

/** Step berikutnya secara otomatis setelah sebuah step approve — dipakai untuk entry "Diajukan ke ...". */
const NEXT_STEP: Record<ApprovalStep, ApprovalStep | null> = {
  nautica: "spm",
  spm: "finance",
  finance: null,
}

const APPROVAL_STEPS = ["nautica", "spm", "finance"] as const

function buildEntries(
  form: FormA2WithDetails,
  cr9: FormCr9 | null,
): TimelineEntry[] {
  const entries: TimelineEntry[] = []

  // 1. CR9 & A2 dibuat bersamaan oleh staff cabang (diagnosis + rincian biaya
  // sudah diisi di tahap ini — lihat Fase 1 restrukturisasi CR9/A2)
  entries.push({
    title: "Form CR9 & Form A2 Dibuat",
    status: "done",
    timestamp: cr9?.created_at ?? form.created_at,
    actor: cr9?.creator_name ?? form.creator_name,
  })

  // 2. CR9 Diajukan ke SPM
  const cr9SubmittedAt = cr9?.submitted_at

  if (!cr9SubmittedAt) {
    entries.push({ title: "CR9 Diajukan ke SPM", status: "pending" })
    entries.push({ title: "Berita Acara Diupload oleh SPM", status: "pending" })
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

  // 3. Berita acara diupload staff SPM — kalau belum, dan form sedang
  // 'revision' pra-chain (staff SPM minta balik ke cabang sebelum pernah
  // diajukan ke manager), tampilkan entry revisi dulu alih-alih pending polos.
  if (!form.news_added_at) {
    if (form.status === "revision" && !form.submitted_to_manager_at) {
      const revision = form.active_revision
      entries.push({
        title: "Menunggu Revisi dari Staff Cabang",
        status: "revision",
        notes: revision?.notes ?? null,
      })
    } else {
      entries.push({
        title: "Berita Acara Diupload oleh SPM",
        status: "pending",
      })
    }
    entries.push({ title: "A2 Diajukan ke Manager Nautica", status: "pending" })
    for (const step of APPROVAL_STEPS) {
      entries.push({ title: APPROVAL_STEP_LABEL[step], status: "pending" })
    }
    return entries
  }

  entries.push({
    title: "Berita Acara Diupload oleh SPM",
    status: "done",
    timestamp: form.news_added_at,
  })

  // 4. A2 Diajukan ke Manager — sama seperti di atas, cek revisi pra-chain
  // dulu sebelum menganggap ini cuma "belum sempat diajukan".
  if (!form.submitted_to_manager_at) {
    if (form.status === "revision") {
      const revision = form.active_revision
      entries.push({
        title: "Menunggu Revisi dari Staff Cabang",
        status: "revision",
        notes: revision?.notes ?? null,
      })
    } else {
      entries.push({
        title: "A2 Diajukan ke Manager Nautica",
        status: "pending",
      })
    }
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

  // 5–7. Approval logs (semua, berurutan) — tiap kali sebuah step approve,
  // sisipkan juga entry "Diajukan ke [step berikutnya]" supaya alurnya eksplisit.
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

    if (log.status === "approved") {
      const nextStep = NEXT_STEP[log.step]
      if (nextStep) {
        entries.push({
          title: `Diajukan ke ${STEP_SHORT_LABEL[nextStep]}`,
          status: "done",
          timestamp: log.actioned_at,
        })
      }
    }
  }

  // Placeholder untuk langkah yang belum terjadi
  if (form.status === "approved" || form.status === "rejected") return entries

  // Status revision: current_step sudah di-NULL-kan, jadi step tujuan diambil
  // dari active_revision (bukan current_step) — ini yang dulu bikin sisa step
  // tidak muncul sama sekali di timeline saat status revision.
  if (form.status === "revision") {
    const revision = form.active_revision
    const targetLabel =
      revision?.target_role === "staff_cabang" ? "Staff Cabang" : "Staff SPM"
    entries.push({
      title: `Menunggu Revisi dari ${targetLabel}`,
      status: "revision",
      notes: revision?.notes ?? null,
    })
    if (revision) {
      const stepIdx = APPROVAL_STEPS.indexOf(revision.step)
      entries.push({
        title: APPROVAL_STEP_LABEL[revision.step],
        status: "pending",
      })
      for (let i = stepIdx + 1; i < APPROVAL_STEPS.length; i++) {
        entries.push({
          title: APPROVAL_STEP_LABEL[APPROVAL_STEPS[i]],
          status: "pending",
        })
      }
    }
    return entries
  }

  const currentStepIdx = form.current_step
    ? APPROVAL_STEPS.indexOf(form.current_step)
    : -1

  if (form.status === "pending" && form.current_step) {
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
