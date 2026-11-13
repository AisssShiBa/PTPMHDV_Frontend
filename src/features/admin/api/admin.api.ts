import api from '@/lib/axios'
import { unwrap, type ApiResponse } from '@/lib/apiResponse'
import type {
  AdminDashboardStats,
  AdminKycDocuments,
  AdminKycItem,
  AdminKycListParams,
  AdminKycPage,
  AdminTopup
} from '../types/admin.types'

const kycPath = (userId: string) => `/admin/kyc/${encodeURIComponent(userId)}`
const topupPath = (id: string) => `/payments/admin/topups/${encodeURIComponent(id)}`

function ensureSuccess(body: ApiResponse<unknown>) {
  if (!body.success) {
    throw new Error(body.error?.message || body.message || 'Phản hồi không hợp lệ. Vui lòng thử lại.')
  }
}

export const adminApi = {
  /** GET /api/admin/dashboard */
  async getDashboardStats(signal?: AbortSignal): Promise<AdminDashboardStats> {
    const res = await api.get<ApiResponse<AdminDashboardStats>>('/admin/dashboard', { signal })
    return unwrap(res.data)
  },

  /** GET /api/admin/kyc?page&limit&status&search */
  async getKycList(params?: AdminKycListParams, signal?: AbortSignal): Promise<AdminKycPage> {
    const res = await api.get<ApiResponse<AdminKycPage>>('/admin/kyc', {
      params: {
        page: params?.page ?? 1,
        limit: params?.limit ?? 10,
        status: params?.status || undefined,
        search: params?.search?.trim() || undefined
      },
      signal
    })
    return unwrap(res.data)
  },

  /**
   * POST /api/admin/kyc/:userId/review
   * body { status, detail? } — backend chỉ bắt buộc detail khi REJECTED.
   */
  async reviewKyc(
    userId: string,
    status: 'APPROVED' | 'REJECTED',
    detail?: string,
    signal?: AbortSignal
  ): Promise<AdminKycItem> {
    const trimmed = detail?.trim()
    const res = await api.post<ApiResponse<AdminKycItem>>(
      `${kycPath(userId)}/review`,
      trimmed ? { status, detail: trimmed } : { status },
      { signal }
    )
    return unwrap(res.data)
  },

  /** PATCH /api/admin/kyc/:userId/tier — body { tier: 1|2, reason } */
  async changeKycTier(
    userId: string,
    tier: 1 | 2,
    reason: string,
    signal?: AbortSignal
  ): Promise<AdminKycItem> {
    const res = await api.patch<ApiResponse<AdminKycItem>>(
      `${kycPath(userId)}/tier`,
      { tier, reason: reason.trim() },
      { signal }
    )
    return unwrap(res.data)
  },

  /** GET /api/admin/kyc/:userId/documents — mỗi lần gọi đều được ghi audit. */
  async getKycDocuments(userId: string, signal?: AbortSignal): Promise<AdminKycDocuments> {
    const res = await api.get<ApiResponse<AdminKycDocuments>>(`${kycPath(userId)}/documents`, {
      signal
    })
    return unwrap(res.data)
  },

  /** GET /api/payments/admin/topups?status */
  async getTopups(status?: string, signal?: AbortSignal): Promise<AdminTopup[]> {
    const res = await api.get<ApiResponse<AdminTopup[]>>('/payments/admin/topups', {
      params: { status: status || undefined },
      signal
    })
    return unwrap(res.data)
  },

  /** POST /api/payments/admin/topups/:id/approve — endpoint hiện trả NOT_ALLOWED. */
  async approveTopup(id: string, signal?: AbortSignal): Promise<void> {
    const res = await api.post<ApiResponse<unknown>>(`${topupPath(id)}/approve`, undefined, { signal })
    ensureSuccess(res.data)
  },

  /** POST /api/payments/admin/topups/:id/reject — body { reason: 1..500 ký tự }. */
  async rejectTopup(id: string, reason: string, signal?: AbortSignal): Promise<void> {
    const res = await api.post<ApiResponse<unknown>>(
      `${topupPath(id)}/reject`,
      { reason: reason.trim() },
      { signal }
    )
    ensureSuccess(res.data)
  }
}
