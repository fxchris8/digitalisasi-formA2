import axios from "axios"
import * as repo from "@/repositories/seaman.repository"
import type { JwtPayload } from "@/types/auth"
import { AppError } from "@/utils/app-error"
import type {
  ListSeamenQuery,
  SyncSeamenDto,
} from "@/validations/seaman.validation"

// ── External API ──────────────────────────────────────────────────────────────

interface ExternalApiResponse {
  data_seamen: repo.SeamanApiRow[]
}

async function fetchFromExternalApi(
  dto: SyncSeamenDto,
): Promise<repo.SeamanApiRow[]> {
  const apiUrl = process.env.SEAMAN_API_URL
  if (!apiUrl) {
    throw new AppError(
      "SEAMAN_API_URL belum dikonfigurasi di environment",
      500,
      "SEAMAN_API_NOT_CONFIGURED",
    )
  }

  try {
    const response = await axios.get<ExternalApiResponse>(apiUrl, {
      data: dto,
      headers: { "Content-Type": "application/json" },
    })

    if (!Array.isArray(response.data?.data_seamen)) {
      throw new AppError(
        "Response API eksternal tidak valid",
        502,
        "SEAMAN_API_INVALID_RESPONSE",
      )
    }

    return response.data.data_seamen
  } catch (err) {
    if (axios.isAxiosError(err)) {
      throw new AppError(
        `Gagal menghubungi API eksternal: ${err.response?.status ?? 0} ${err.response?.statusText ?? err.message}`,
        502,
        "SEAMAN_API_ERROR",
      )
    }
    throw err
  }
}

// ── Services ──────────────────────────────────────────────────────────────────

export async function syncSeamen(
  user: JwtPayload,
  dto: SyncSeamenDto,
): Promise<{ synced: number }> {
  if (user.role !== "admin") {
    throw new AppError("Forbidden", 403, "FORBIDDEN")
  }

  const rows = await fetchFromExternalApi(dto)
  const synced = await repo.upsertBatch(rows)
  return { synced }
}

export async function listSeamen(params: ListSeamenQuery) {
  const { page, limit, search, status, fleet } = params
  const offset = (page - 1) * limit
  const { rows, total } = await repo.findAll({
    ...(search && { search }),
    ...(status && { status }),
    ...(fleet && { fleet }),
    limit,
    offset,
  })
  return {
    data: rows,
    total,
    page,
    limit,
    total_pages: Math.ceil(total / limit),
  }
}

export async function getSeamenStats() {
  const [total, lastSyncedAt] = await Promise.all([
    repo.countAll(),
    repo.getLastSyncedAt(),
  ])
  return { total, last_synced_at: lastSyncedAt }
}

export async function clearSeamen(
  user: JwtPayload,
): Promise<{ deleted: number }> {
  if (user.role !== "admin") {
    throw new AppError("Forbidden", 403, "FORBIDDEN")
  }
  const deleted = await repo.deleteAll()
  return { deleted }
}
