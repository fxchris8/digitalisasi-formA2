import cors from "cors"

const corsMiddleware = cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:5173",
  credentials: true,
})

export { corsMiddleware }
