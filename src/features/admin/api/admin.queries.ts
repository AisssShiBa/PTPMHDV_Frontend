import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { adminApi } from './admin.api'
import type {
  AdminDashboardStats,
  AdminKycDocuments,
  AdminKycItem,
  AdminKycListParams,
  AdminKycPage,
  AdminTopup
} from '../types/admin.types'

export const adminKeys = {
  all: ['admin'] as const,
  dashboard: () => [...adminKeys.all, 'dashboard'] as const,
  kyc: () => [...adminKeys.all, 'kyc'] as const,
  kycList: (params?: AdminKycListParams) => [...adminKeys.kyc(), 'list', params ?? {}] as const,
  kycDocuments: (userId: string) => [...adminKeys.kyc(), 'documents', userId] as const,
  topups: () => [...adminKeys.all, 'topups'] as const,
  topupList: (status?: string) => [...adminKeys.topups(), 'list', status || 'ALL'] as const
}

/** GET /api/admin/dashboard */
export function useAdminDashboard(options?: { enabled?: boolean }) {
  return useQuery<AdminDashboardStats, Error>({
    queryKey: adminKeys.dashboard(),
    queryFn: ({ signal }) => adminApi.getDashboardStats(signal),
    staleTime: 15_000,
    enabled: options?.enabled !== false
  })
}

/** GET /api/admin/kyc */
export function useAdminKycList(params?: AdminKycListParams, options?: { enabled?: boolean }) {
  return useQuery<AdminKycPage, Error>({
    queryKey: adminKeys.kycList(params),
    queryFn: ({ signal }) => adminApi.getKycList(params, signal),
    staleTime: 10_000,
    enabled: options?.enabled !== false
  })
}

/**
 * GET /api/admin/kyc/:userId/documents
 * `enabled` bật khi Admin chủ động xem ảnh; mỗi lần bật lại sẽ gọi API (có audit).
 */
export function useKycDocuments(userId: string | null, enabled: boolean) {
  return useQuery<AdminKycDocuments, Error>({
    queryKey: adminKeys.kycDocuments(userId ?? ''),
    queryFn: ({ signal }) => adminApi.getKycDocuments(userId as string, signal),
    enabled: Boolean(userId) && enabled,
    staleTime: 0,
    gcTime: 0,
    retry: false
  })
}

/** POST /api/admin/kyc/:userId/review */
export function useReviewKyc() {
  const queryClient = useQueryClient()
  return useMutation<
    AdminKycItem,
    Error,
    { userId: string; status: 'APPROVED' | 'REJECTED'; detail?: string }
  >({
    mutationFn: ({ userId, status, detail }) => adminApi.reviewKyc(userId, status, detail),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: adminKeys.kyc() }),
        queryClient.invalidateQueries({ queryKey: adminKeys.dashboard() })
      ])
  })
}

/** PATCH /api/admin/kyc/:userId/tier */
export function useChangeKycTier() {
  const queryClient = useQueryClient()
  return useMutation<AdminKycItem, Error, { userId: string; tier: 1 | 2; reason: string }>({
    mutationFn: ({ userId, tier, reason }) => adminApi.changeKycTier(userId, tier, reason),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: adminKeys.kyc() }),
        queryClient.invalidateQueries({ queryKey: adminKeys.dashboard() })
      ])
  })
}

/** GET /api/payments/admin/topups */
export function useAdminTopups(status?: string, options?: { enabled?: boolean }) {
  return useQuery<AdminTopup[], Error>({
    queryKey: adminKeys.topupList(status),
    queryFn: ({ signal }) => adminApi.getTopups(status, signal),
    staleTime: 10_000,
    enabled: options?.enabled !== false
  })
}

/** POST /api/payments/admin/topups/:id/approve */
export function useApproveTopup() {
  const queryClient = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: (id) => adminApi.approveTopup(id),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: adminKeys.topups() }),
        queryClient.invalidateQueries({ queryKey: adminKeys.dashboard() })
      ])
  })
}

/** POST /api/payments/admin/topups/:id/reject */
export function useRejectTopup() {
  const queryClient = useQueryClient()
  return useMutation<void, Error, { id: string; reason: string }>({
    mutationFn: ({ id, reason }) => adminApi.rejectTopup(id, reason),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: adminKeys.topups() }),
        queryClient.invalidateQueries({ queryKey: adminKeys.dashboard() })
      ])
  })
}
