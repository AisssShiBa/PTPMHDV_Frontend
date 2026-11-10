import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
import { walletApi } from './wallet.api'
import type { WalletMe, LedgerPage } from '../types/wallet.types'

export const walletKeys = {
  all: ['wallets'] as const,
  me: () => [...walletKeys.all, 'me'] as const,
  ledger: (cursor?: string | null, limit?: number) =>
    [...walletKeys.all, 'ledger', { cursor: cursor ?? null, limit: limit ?? 20 }] as const,
  infiniteLedger: (limit?: number) =>
    [...walletKeys.all, 'ledger', 'infinite', { limit: limit ?? 20 }] as const
}

/**
 * Hook lấy thông tin số dư và hạn mức ví của user hiện tại
 * Endpoint: GET /api/wallets/me
 */
export function useWalletMe(options?: { enabled?: boolean }) {
  return useQuery<WalletMe, Error>({
    queryKey: walletKeys.me(),
    queryFn: ({ signal }) => walletApi.getWalletMe(signal),
    staleTime: 10_000,
    enabled: options?.enabled !== false
  })
}

/**
 * Hook lấy trang sổ cái giao dịch
 * Endpoint: GET /api/wallets/me/ledger
 */
export function useWalletLedger(params?: { cursor?: string | null; limit?: number }, options?: { enabled?: boolean }) {
  return useQuery<LedgerPage, Error>({
    queryKey: walletKeys.ledger(params?.cursor, params?.limit),
    queryFn: ({ signal }) => walletApi.getWalletLedger(params, signal),
    staleTime: 15_000,
    enabled: options?.enabled !== false
  })
}

/**
 * Hook lấy sổ cái với cuộn vô hạn / tải thêm (Infinite Scroll)
 * Endpoint: GET /api/wallets/me/ledger?cursor=...
 */
export function useInfiniteWalletLedger(limit = 20, options?: { enabled?: boolean }) {
  return useInfiniteQuery<LedgerPage, Error>({
    queryKey: walletKeys.infiniteLedger(limit),
    queryFn: ({ pageParam, signal }) =>
      walletApi.getWalletLedger({ cursor: pageParam as string | null | undefined, limit }, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
    staleTime: 15_000,
    enabled: options?.enabled !== false
  })
}
