import { z } from "zod"

export const createUserSchema = z
  .object({
    full_name: z.string().min(1, "Nama lengkap wajib diisi"),
    username: z
      .string()
      .min(3, "Username minimal 3 karakter")
      .max(100, "Username maksimal 100 karakter")
      .regex(
        /^[a-zA-Z0-9_]+$/,
        "Username hanya boleh huruf, angka, dan underscore",
      ),
    email: z.string().email("Format email tidak valid"),
    password: z.string().min(8, "Password minimal 8 karakter"),
    role: z.enum(["admin", "staff", "manager", "user"], {
      error: "Role tidak valid",
    }),
    department: z
      .enum(["spm", "nautica", "finance", "cabang"])
      .nullable()
      .optional(),
    branch_office: z.string().max(100).nullable().optional(),
  })
  .refine((d) => d.department !== "cabang" || !!d.branch_office, {
    message: "Branch office wajib diisi untuk department cabang",
    path: ["branch_office"],
  })

export const listUsersSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(15),
  search: z.string().optional(),
})

export const changePasswordSchema = z.object({
  newPassword: z.string().min(8, "Password minimal 8 karakter"),
})

export type CreateUserDto = z.infer<typeof createUserSchema>
export type ListUsersQuery = z.infer<typeof listUsersSchema>
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>
