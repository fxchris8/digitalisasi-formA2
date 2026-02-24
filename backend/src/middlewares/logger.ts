import morgan from "morgan"

/**
 * HTTP request logger middleware.
 * Uses "dev" format in development, "combined" in production.
 *
 * Dev format output example:
 *   GET /health 200 3.421 ms - 67
 */
const format = process.env.NODE_ENV === "production" ? "combined" : "dev"

export const requestLogger = morgan(format)
