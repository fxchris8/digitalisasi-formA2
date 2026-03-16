import "@/config/env"
import app from "@/app"
import { startScheduler } from "@/scheduler"

const PORT = Number(process.env.PORT) || 3000

app.listen(PORT, () => {
  console.log(`[START] Server running on http://localhost:${PORT}`)
  startScheduler()
})
