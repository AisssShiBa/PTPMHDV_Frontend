import { queryOptions, useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth'
import { merchantApi } from './merchant.api'
import { merchantService } from '../services/merchantService'
export const merchantKeys = {
  all: (owner: string) => ['merchant', owner] as const,
  me: (owner: string) => ['merchant', owner, 'me'] as const,
  outlets: (owner: string, merchantId: string) =>
    ['merchant', owner, merchantId, 'outlets'] as const,
}
export const merchantQueries = {
  outlets: (owner: string, merchantId: string, page: number) =>
    queryOptions({
      queryKey: [...merchantKeys.outlets(owner, merchantId), page],
      queryFn: ({ signal }) =>
        merchantApi.listOutlets(merchantId, page, signal),
      gcTime: 0,
      retry: false,
      staleTime: 0,
    }),
  me: (owner: string) =>
    queryOptions({
      queryKey: merchantKeys.me(owner),
      queryFn: ({ signal }) => merchantService.getMyMerchant(signal, owner),
      enabled: Boolean(owner),
      retry: false,
      gcTime: 0,
      staleTime: 0,
    }),
}
export function useMyMerchant() {
  const owner = useAuthStore((state) => state.user?.id) ?? ''
  return useQuery(merchantQueries.me(owner))
}
