import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { UseQueryResult } from '@tanstack/react-query'
import { paymentApi } from '@/features/payment'
import type { ConfirmPaymentResult } from '@/features/payment'
import { ORDER_SLOW_POLL_AFTER_MS } from './constants'
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

export type UtilityOrderQuery = UseQueryResult<UtilityOrderView, Error> & {
  /** True once the order has stayed 60s in `PROVIDER_PENDING`. */
  slowPolling: boolean
}

/**
 * GET /api/utilities/orders/:id
 * Polling follows the backend state machine and stops at any terminal status.
 * While the provider keeps the order pending, polling slows down after 60s and
 * the caller can render a "provider has not answered yet" note.
 */
export function useUtilityOrder(orderId: string | null): UtilityOrderQuery {
  const pendingRef = useRef<{ orderId: string | null; since: number | null }>({
    orderId: null,
    since: null
  })
  const [slowState, setSlowState] = useState<{ orderId: string | null; slow: boolean }>({
    orderId: null,
    slow: false
  })

  const query = useQuery<UtilityOrderView, Error>({
    queryKey: utilitiesKeys.order(orderId ?? ''),
    queryFn: ({ signal }) => {
      if (!orderId) throw new Error('Chưa có mã đơn hàng.')
      return utilitiesApi.getOrder(orderId, signal)
    },
    enabled: Boolean(orderId),
    staleTime: 0,
    refetchInterval: (current) => {
      const status = current.state.data?.status
      const now = Date.now()

      // Timers and refs are reset per order without an effect on purpose.
      if (pendingRef.current.orderId !== orderId) {
        pendingRef.current = { orderId, since: null }
      }
      const alreadySlow = slowState.orderId === orderId && slowState.slow

      if (status === 'PROVIDER_PENDING') {
        if (pendingRef.current.since === null) pendingRef.current.since = now
        const slow = now - pendingRef.current.since >= ORDER_SLOW_POLL_AFTER_MS
        if (slow !== alreadySlow) setSlowState({ orderId, slow })
        return orderPollInterval(status, pendingRef.current.since, now)
      }

      pendingRef.current.since = null
      if (alreadySlow) setSlowState({ orderId, slow: false })
      return orderPollInterval(status)
    }
  })

  return Object.assign(query, {
    slowPolling: slowState.orderId === orderId && slowState.slow
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
