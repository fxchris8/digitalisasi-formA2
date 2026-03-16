import { schedule } from "node-cron"
import { runSeamanSyncJob } from "@/scripts/jobs/seaman-sync.job"

export function startScheduler(): void {
  // Setiap hari jam 05:00 WIB (Asia/Jakarta)
  schedule("0 5 * * *", runSeamanSyncJob, { timezone: "Asia/Jakarta" })

  console.log(
    "[SCHEDULER] Cron jobs terdaftar — seaman-sync setiap hari 05:00 WIB",
  )
}
