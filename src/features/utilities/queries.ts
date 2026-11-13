import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { paymentApi } from '@/features/payment'
import type { ConfirmPaymentResult } from '@/features/payment'
import { utilitiesApi } from './api'
import { orderPollInterval } from './status'
import type {
  BillLookup,
  BillLookupRequest,
  BillPayPayload,
  TopupPayload,
  UtilityOrderView
} from './types'

export const utilitiesKeys = {
  all: ['utilities'] as const,
  bills: () => [...utilitiesKeys.all, 'bills'] as const,
  billLookup: (request: BillLookupRequest | null) =>
    [
      ...utilitiesKeys.bills(),
      'lookup',
      request?.provider ?? '',
      request?.customerCode ?? ''
    ] as const,
  orders: () => [...utilitiesKeys.all, 'orders'] as const,
  order: (orderId: string) => [...utilitiesKeys.orders(), orderId] as const
}

/** GET /api/utilities/bills/lookup */
export function useBillLookup(request: BillLookupRequest | null) {
  return useQuery<BillLookup, Error>({
    queryKey: utilitiesKeys.billLookup(request),
    queryFn: ({ signal }) => {
      if (!request) throw new Error('Chưa có thông tin tra cứu hóa đơn.')
      return utilitiesApi.lookupBill(request.provider, request.customerCode, signal)
    },
    enabled: request !== null,
    retry: false,
    staleTime: 0
  })
}

/**
 * GET /api/utilities/orders/:id
 * Polling follows the backend state machine and stops at any terminal status.
 */
export function useUtilityOrder(orderId: string | null) {
  return useQuery<UtilityOrderView, Error>({
    queryKey: utilitiesKeys.order(orderId ?? ''),
    queryFn: ({ signal }) => {
      if (!orderId) throw new Error('Chưa có mã đơn hàng.')
      return utilitiesApi.getOrder(orderId, signal)
    },
    enabled: Boolean(orderId),
    staleTime: 0,
    refetchInterval: (query) => orderPollInterval(query.state.data?.status)
  })
}

/** POST /api/utilities/topup */
export function useCreateTopup() {
  const queryClient = useQueryClient()
  return useMutation<
    UtilityOrderView,
    Error,
    { payload: TopupPayload; idempotencyKey: string }
  >({
    mutationFn: ({ payload, idempotencyKey }) => utilitiesApi.topup(payload, idempotencyKey),
    onSuccess: (order) => {
      queryClient.setQueryData(utilitiesKeys.order(order.orderId), order)
    }
  })
}

/** POST /api/utilities/bills/pay */
export function usePayBill() {
  const queryClient = useQueryClient()
  return useMutation<
    UtilityOrderView,
    Error,
    { payload: BillPayPayload; idempotencyKey: string }
  >({
    mutationFn: ({ payload, idempotencyKey }) => utilitiesApi.payBill(payload, idempotencyKey),
    onSuccess: (order) => {
      queryClient.setQueryData(utilitiesKeys.order(order.orderId), order)
    }
  })
}

/**
 * POST /api/payments/:id/confirm with the in-memory transaction token.
 * The token is passed directly to the API and never stored in React state,
 * Zustand, localStorage or sessionStorage.
 */
export function useConfirmUtilityPayment() {
  return useMutation<
    ConfirmPaymentResult,
    Error,
    { paymentId: string; transactionToken: string }
  >({
    mutationFn: ({ paymentId, transactionToken }) =>
      paymentApi.confirmPayment(paymentId, transactionToken)
  })
}
