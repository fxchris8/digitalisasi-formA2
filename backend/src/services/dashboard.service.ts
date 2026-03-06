import * as dashboardRepo from "@/repositories/dashboard.repository"

export async function getAdminStats() {
  return dashboardRepo.getAdminStats()
}
