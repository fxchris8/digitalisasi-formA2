/**
 * Custom application error.
 * Throw this anywhere in your services/controllers to trigger
 * the global error handler with a specific HTTP status.
 *
 * @example
 * throw new AppError("User not found", 404, "NOT_FOUND");
 */
export class AppError extends Error {
	public readonly statusCode: number
	public readonly errorCode: string

	constructor(
		message: string,
		statusCode: number = 500,
		errorCode: string = "INTERNAL_SERVER_ERROR",
	) {
		super(message)
		this.name = "AppError"
		this.statusCode = statusCode
		this.errorCode = errorCode

		// Maintains proper prototype chain in transpiled ES5
		Object.setPrototypeOf(this, AppError.prototype)
	}
}
