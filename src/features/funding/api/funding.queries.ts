import { useEffect } from 'react'
import { queryOptions, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth'
import { walletKeys } from '@/features/wallet'
import { fundingError, FundingError } from './funding.errors'
import { fundingApi } from './funding.api'
import { isCashOutTerminal, isTopupTerminal } from '../types/funding.types'
export const fundingKeys = {
  all: (owner: string) => ['funding', owner] as const,
  topup: (owner: string, id: string) =>
    ['funding', owner, 'topup', id] as const,
  cashout: (owner: string, id: string) =>
    ['funding', owner, 'cashout', id] as const,
  history: (owner: string) => ['funding', owner, 'topups'] as const,
}
export const fundingQueries = {
  topup: (owner: string, id: string) =>
    queryOptions({
      queryKey: fundingKeys.topup(owner, id),
      queryFn: ({ signal }) => fundingApi.getTopup(id, signal),
      enabled: Boolean(owner && id),
      gcTime: 0,
      retry: false,
    }),
  cashout: (owner: string, id: string) =>
    queryOptions({
      queryKey: fundingKeys.cashout(owner, id),
      queryFn: async ({ signal }) => {
        const order = await fundingApi.getCashOut(id, signal)
        if (order.userId !== owner) throw new FundingError('FORBIDDEN')
        return order
      },
      enabled: Boolean(owner && id),
      gcTime: 0,
      retry: false,
    }),
  history: (owner: string) =>
    queryOptions({
      queryKey: fundingKeys.history(owner),
      queryFn: ({ signal }) => fundingApi.getTopups(signal),
      enabled: Boolean(owner),
      gcTime: 0,
      retry: false,
    }),
}
// A read budget stops polling; it never changes a server status to FAILED/EXPIRED.
export function useTopupStatus(id: string, enabled = true) {
  const owner = useAuthStore((state) => state.user?.id) ?? ''
  const client = useQueryClient()
  const query = useQuery({
    ...fundingQueries.topup(owner, id),
    enabled: Boolean(owner && id && enabled),
    refetchInterval: (q) =>
      q.state.error ||
      (q.state.data && isTopupTerminal(q.state.data.status)) ||
      q.state.dataUpdateCount >= 24
        ? false
        : 5000,
  })
  useEffect(() => {
    if (query.data && isTopupTerminal(query.data.status)) {
      void client.invalidateQueries({ queryKey: walletKeys.all })
      void client.invalidateQueries({ queryKey: fundingKeys.history(owner) })
    }
  }, [client, owner, query.data])
  return query
}
export function useCashOutStatus(id: string) {
  const owner = useAuthStore((state) => state.user?.id) ?? ''
  const client = useQueryClient()
  const query = useQuery({
    ...fundingQueries.cashout(owner, id),
    refetchInterval: (q) =>
      (q.state.error &&
        ![
          'CASHOUT_PROCESSING',
          'CASHOUT_PAYOUT_PENDING',
          'FUNDING_TIMEOUT',
          'FUNDING_NETWORK',
          'HTTP_503',
        ].includes(fundingError(q.state.error).code)) ||
      (q.state.data && isCashOutTerminal(q.state.data.status)) ||
      q.state.dataUpdateCount + q.state.errorUpdateCount >= 24
        ? false
        : Math.min(
            30000,
            3000 *
              2 **
                Math.min(4, q.state.dataUpdateCount + q.state.errorUpdateCount),
          ),
  })
  useEffect(() => {
    if (query.data)
      void client.invalidateQueries({ queryKey: walletKeys.all })
  }, [client, owner, query.data])
  return query
}
