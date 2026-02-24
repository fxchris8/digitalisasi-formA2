/**
 * Standard API response envelope used by all endpoints.
 *
 * @template T - Shape of the `data` payload (omit for error responses).
 */
export interface ApiResponse<T = undefined> {
	success: boolean
	message: string
	data?: T
	error?: string
}
