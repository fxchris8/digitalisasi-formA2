import * as dashboardRepo from "@/repositories/dashboard.repository"
import type { JwtPayload } from "@/types/auth"
import { AppError } from "@/utils/app-error"
import { getManagerStep } from "./approval.service"

export async function getAdminStats() {
  return dashboardRepo.getAdminStats()
}

export async function getBranchStats(user: JwtPayload) {
  return dashboardRepo.getBranchStats(user.branch_office ?? null)
}

export async function getManagerStats(user: JwtPayload) {
  const step = getManagerStep(user)
  if (!step) {
    throw new AppError("Akun Anda bukan approver", 422, "UNPROCESSABLE")
  }
  return dashboardRepo.getManagerStats(user.id, step)
}
