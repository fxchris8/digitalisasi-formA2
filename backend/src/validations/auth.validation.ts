import { z } from "zod"

export const registerSchema = z.object({
  full_name: z.string().min(1, "Full name is required"),
  user_name: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(100, "Username must be at most 100 characters")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username can only contain letters, numbers, and underscores",
    ),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

export const loginSchema = z.object({
  user_name: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
})

export const resetPasswordSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
})

export type RegisterDto = z.infer<typeof registerSchema>
export type LoginDto = z.infer<typeof loginSchema>
export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>
