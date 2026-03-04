import bcrypt from "bcryptjs"
import type { SafeUser } from "@/models/user.model"
import * as userRepository from "@/repositories/user.repository"
import { AppError } from "@/utils/app-error"
import { signToken } from "@/utils/jwt"
import type {
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
} from "@/validations/auth.validation"

export async function register(dto: RegisterDto): Promise<void> {
  const [existingEmail, existingUserName] = await Promise.all([
    userRepository.findByEmail(dto.email),
    userRepository.findByUserName(dto.username),
  ])

  if (existingEmail) {
    throw new AppError("Email already exists", 409, "EMAIL_ALREADY_EXISTS")
  }

  if (existingUserName) {
    throw new AppError(
      "Username already exists",
      409,
      "USERNAME_ALREADY_EXISTS",
    )
  }

  const hashedPassword = await bcrypt.hash(dto.password, 10)
  await userRepository.createUser({ ...dto, hashedPassword })
}

export async function login(dto: LoginDto): Promise<{
  token: string
  user: Omit<SafeUser, "created_at" | "updated_at">
}> {
  const user = await userRepository.findByUserName(dto.username)

  if (!user) {
    throw new AppError("Invalid credentials", 401, "INVALID_CREDENTIALS")
  }

  const isPasswordValid = await bcrypt.compare(dto.password, user.password)

  if (!isPasswordValid) {
    throw new AppError("Invalid credentials", 401, "INVALID_CREDENTIALS")
  }

  const token = signToken({
    id: user.id,
    full_name: user.full_name,
    username: user.username,
    email: user.email,
    role: user.role,
    department: user.department,
    branch_office: user.branch_office,
  })

  const {
    password: _password,
    created_at: _createdAt,
    updated_at: _updatedAt,
    ...safeUser
  } = user
  return { token, user: safeUser }
}

export async function adminResetPassword(dto: ResetPasswordDto): Promise<void> {
  const user = await userRepository.findById(dto.userId)

  if (!user) {
    throw new AppError("User not found", 404, "USER_NOT_FOUND")
  }

  const hashedPassword = await bcrypt.hash(dto.newPassword, 10)
  await userRepository.updatePassword(dto.userId, hashedPassword)
}
