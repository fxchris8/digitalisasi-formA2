import { syncSeamenInternal } from "@/services/seaman.service"

export async function runSeamanSyncJob(): Promise<void> {
  const startedAt = new Date().toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
  })
  console.log(`[JOB] seaman-sync dimulai pada ${startedAt}`)

  try {
    const result = await syncSeamenInternal()
    console.log(
      `[JOB] seaman-sync selesai: ${result.synced} data berhasil disinkronkan`,
    )
  } catch (err) {
    console.error(
      "[JOB] seaman-sync gagal:",
      err instanceof Error ? err.message : err,
    )
  }
}
