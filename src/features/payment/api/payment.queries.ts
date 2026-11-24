import { mutationOptions, queryOptions, useMutation } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth'
import { paymentApi } from './payment.api'
import type { P2pCheckoutDto, P2pQuoteDto } from '../types/payment.types'

export const paymentKeys = {
  all: ['payments'] as const,
  quote: (ownerId: string) => ['payments', 'p2p', 'quote', ownerId] as const,
  checkout: (ownerId: string) => ['payments', 'p2p', 'checkout', ownerId] as const,
  confirm: (ownerId: string) => ['payments', 'confirm', ownerId] as const,
  detail: (ownerId: string, paymentId: string) => ['payments', 'detail', ownerId, paymentId] as const
}

interface QuoteRequest {
  dto: P2pQuoteDto
  signal?: AbortSignal
}

interface CheckoutRequest {
  dto: P2pCheckoutDto
  idempotencyKey: string
  signal?: AbortSignal
}

interface ConfirmRequest {
  paymentId: string
  transactionToken: string
  signal?: AbortSignal
}

function assertCurrentOwner(ownerId: string): void {
  const auth = useAuthStore.getState()
  if (!ownerId || auth.user?.id !== ownerId || !auth.accessToken) {
    throw new Error('Phiên giao dịch đã thay đổi. Vui lòng kiểm tra tài khoản đang đăng nhập.')
  }
}

async function ownedRequest<T>(ownerId: string, request: () => Promise<T>): Promise<T> {
  assertCurrentOwner(ownerId)
  const result = await request()
  assertCurrentOwner(ownerId)
  return result
}

export function p2pQuoteMutationOptions(ownerId: string) {
  return mutationOptions({
    mutationKey: paymentKeys.quote(ownerId),
    mutationFn: ({ dto, signal }: QuoteRequest) => ownedRequest(ownerId, () => paymentApi.p2pQuote(dto, signal)),
    networkMode: 'always',
    retry: false,
    gcTime: 0
  })
}

export function p2pCheckoutMutationOptions(ownerId: string) {
  return mutationOptions({
    mutationKey: paymentKeys.checkout(ownerId),
    // The flow owns this key and must reuse it when reconciling a timeout.
    mutationFn: ({ dto, idempotencyKey, signal }: CheckoutRequest) =>
      ownedRequest(ownerId, () => paymentApi.p2pCheckout(dto, idempotencyKey, signal)),
    networkMode: 'always',
    retry: false,
    gcTime: 0
  })
}

export function confirmPaymentMutationOptions(ownerId: string) {
  return mutationOptions({
    mutationKey: paymentKeys.confirm(ownerId),
    // Do not retry a transaction token. Reconcile through GET payment status.
    mutationFn: ({ paymentId, transactionToken, signal }: ConfirmRequest) =>
      ownedRequest(ownerId, () => paymentApi.confirmPayment(paymentId, transactionToken, signal)),
    networkMode: 'always',
    retry: false,
    gcTime: 0
  })
}

export function paymentStatusQueryOptions(ownerId: string, paymentId: string | null) {
  return queryOptions({
    queryKey: paymentKeys.detail(ownerId, paymentId ?? ''),
    queryFn: ({ signal }) => {
      if (!paymentId) throw new Error('Chưa có mã giao dịch để kiểm tra trạng thái.')
      return ownedRequest(ownerId, () => paymentApi.getPaymentById(paymentId, signal))
    },
    enabled: Boolean(ownerId && paymentId),
    retry: false,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false
  })
}

export function useP2pQuote() {
  const ownerId = useAuthStore(state => state.user?.id) ?? ''
  return useMutation(p2pQuoteMutationOptions(ownerId))
}

export function useP2pCheckout() {
  const ownerId = useAuthStore(state => state.user?.id) ?? ''
  return useMutation(p2pCheckoutMutationOptions(ownerId))
}

export function useConfirmPayment() {
  const ownerId = useAuthStore(state => state.user?.id) ?? ''
  // Call reset() after completion so the observer releases transactionToken.
  return useMutation(confirmPaymentMutationOptions(ownerId))
}
