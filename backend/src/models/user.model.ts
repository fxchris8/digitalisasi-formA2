/**
 * Domain model — representasi data entitas User, mapping ke skema DB.
 */
export interface User {
	id: string
	full_name: string
	user_name: string
	email: string
	password: string
	role: string
	created_at: Date
	updated_at: Date
}

export type SafeUser = Omit<User, "password">
