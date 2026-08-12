import "@/config/env"
import app from "@/app"
import pool from "@/config/database"
import { startScheduler } from "@/scheduler"
import { applySchema } from "@/scripts/database/schema"

const PORT = Number(process.env.PORT) || 3000

async function main() {
  try {
    await applySchema(pool)
  } catch (err) {
    console.error("[START] Warning: Failed to apply DB schema on startup:", err)
  }

  app.listen(PORT, () => {
    console.log(`[START] Server running on http://localhost:${PORT}`)
    startScheduler()
  })
}

main()
