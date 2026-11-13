import { queryOptions, useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth'
import { walletService } from '../services/walletService'
export const walletKeys = {
  all: (owner: string) => ['wallet', owner] as const,
  balance: (owner: string, refreshTrigger = 0) =>
    ['wallet', owner, 'balance', refreshTrigger] as const,
}
export const walletQueries = {
  balance: (owner: string, refreshTrigger = 0) =>
    queryOptions({
      queryKey: walletKeys.balance(owner, refreshTrigger),
      queryFn: () => walletService.getBalance(owner),
      enabled: Boolean(owner),
      gcTime: 0,
    }),
}
export function useWalletBalance(refreshTrigger = 0) {
  const owner = useAuthStore((state) => state.user?.id) ?? ''
  return useQuery(walletQueries.balance(owner, refreshTrigger))
}
