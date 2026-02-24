import cookieParser from "cookie-parser"
import express from "express"
import { errorHandler } from "@/handlers/error.handler"
import { corsMiddleware } from "@/middlewares/cors"
import { requestLogger } from "@/middlewares/logger"
import { apiRouter } from "@/routes"

const app: express.Application = express()

// Middlewares
app.use(express.json())
app.use(cookieParser())
app.use(corsMiddleware)
app.use(requestLogger)

// Routes
app.use("/", apiRouter)

// Global error handler — must be registered LAST
app.use(errorHandler)

export default app
