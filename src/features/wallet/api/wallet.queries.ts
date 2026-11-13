import { queryOptions, useQuery, useInfiniteQuery, type QueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth'
import { walletApi } from './wallet.api'
import type { WalletMe, LedgerPage, LedgerFilterParams } from '../types/wallet.types'

export const walletKeys = {
  all: ['wallets'] as const,
  me: (owner = useAuthStore.getState().user?.id ?? '') => [...walletKeys.all, 'me', owner] as const,
  balance: (owner: string, refreshTrigger = 0) => refreshTrigger ? [...walletKeys.me(owner), refreshTrigger] as const : walletKeys.me(owner),
  ledger: (cursor?: string | null, limit?: number, filters?: LedgerFilterParams) =>
    [...walletKeys.all, 'ledger', useAuthStore.getState().user?.id ?? '', { cursor: cursor ?? null, limit: limit ?? 20, ...filters }] as const,
  infiniteLedger: (limit?: number, filters?: LedgerFilterParams) =>
    [...walletKeys.all, 'ledger', 'infinite', useAuthStore.getState().user?.id ?? '', { limit: limit ?? 20, ...filters }] as const
}

/**
 * Hook lấy thông tin số dư và hạn mức ví của user hiện tại
 * Endpoint: GET /api/wallets/me
 */
export function useMyWallet(options?: { enabled?: boolean }) {
  const owner = useAuthStore(state => state.user?.id) ?? ''
  return useQuery<WalletMe, Error>({
    queryKey: walletKeys.me(owner),
    queryFn: ({ signal }) => walletApi.getMyWallet(signal),
    staleTime: 10_000,
    gcTime: 0,
    enabled: Boolean(owner) && options?.enabled !== false
  })
}

export const useWalletMe = useMyWallet

/**
 * Hook lấy trang sổ cái giao dịch
 * Endpoint: GET /api/wallets/me/ledger
 */
export function useMyLedger(
  params?: { cursor?: string | null; limit?: number } & LedgerFilterParams,
  options?: { enabled?: boolean }
) {
  const owner = useAuthStore(state => state.user?.id) ?? ''
  return useQuery<LedgerPage, Error>({
    queryKey: walletKeys.ledger(params?.cursor, params?.limit, {
      startDate: params?.startDate,
      endDate: params?.endDate,
      type: params?.type
    }),
    queryFn: ({ signal }) => walletApi.getMyLedger(params, signal),
    staleTime: 15_000,
    gcTime: 0,
    enabled: Boolean(owner) && options?.enabled !== false
  })
}

export const useWalletLedger = useMyLedger

/**
 * Hook lấy sổ cái với cuộn vô hạn / tải thêm (Infinite Scroll)
 * Endpoint: GET /api/wallets/me/ledger?cursor=...
 */
export function useInfiniteMyLedger(
  limit = 20,
  filters?: LedgerFilterParams,
  options?: { enabled?: boolean }
) {
  const owner = useAuthStore(state => state.user?.id) ?? ''
  return useInfiniteQuery<LedgerPage, Error>({
    queryKey: walletKeys.infiniteLedger(limit, filters),
    queryFn: ({ pageParam, signal }) =>
      walletApi.getMyLedger(
        { cursor: pageParam as string | null | undefined, limit, ...filters },
        signal
      ),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
    staleTime: 15_000,
    gcTime: 0,
    enabled: Boolean(owner) && options?.enabled !== false
  })
}

export const useInfiniteWalletLedger = useInfiniteMyLedger

/**
 * Hàm vô hiệu hóa toàn bộ cache ví (số dư, hạn mức, sổ cái) sau khi thực hiện giao dịch
 */
export function invalidateWalletQueries(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: walletKeys.me() }),
    queryClient.invalidateQueries({ queryKey: [...walletKeys.all, 'ledger'] })
  ])
}

/** Funding shares the authenticated Wallet Me API/cache with K18. */
export const walletQueries = {
  balance: (owner: string, refreshTrigger = 0) => queryOptions({
    queryKey: walletKeys.balance(owner, refreshTrigger),
    queryFn: ({ signal }) => walletApi.getWalletMe(signal),
    enabled: Boolean(owner),
    staleTime: 0,
    gcTime: 0,
  }),
}
export function useWalletBalance(refreshTrigger = 0) {
  const owner = useAuthStore(state => state.user?.id) ?? ''
  return useQuery(walletQueries.balance(owner, refreshTrigger))
}
