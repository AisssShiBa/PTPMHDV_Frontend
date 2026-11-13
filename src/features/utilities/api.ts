import api from '@/lib/axios'
import { unwrap, type ApiResponse } from '@/lib/apiResponse'
import type { BillLookup, BillPayPayload, TopupPayload, UtilityOrderView } from './types'

const orderPath = (orderId: string) => `/utilities/orders/${encodeURIComponent(orderId)}`

export const utilitiesApi = {
  /** POST /api/utilities/topup — requires Idempotency-Key. */
  async topup(
    payload: TopupPayload,
    idempotencyKey: string,
    signal?: AbortSignal
  ): Promise<UtilityOrderView> {
    const res = await api.post<ApiResponse<UtilityOrderView>>('/utilities/topup', payload, {
      headers: { 'Idempotency-Key': idempotencyKey },
      signal
    })
    return unwrap(res.data)
  },

  /** GET /api/utilities/bills/lookup?provider=&customerCode= */
  async lookupBill(
    provider: string,
    customerCode: string,
    signal?: AbortSignal
  ): Promise<BillLookup> {
    const res = await api.get<ApiResponse<BillLookup>>('/utilities/bills/lookup', {
      params: { provider, customerCode },
      signal
    })
    return unwrap(res.data)
  },

  /** POST /api/utilities/bills/pay — requires Idempotency-Key. */
  async payBill(
    payload: BillPayPayload,
    idempotencyKey: string,
    signal?: AbortSignal
  ): Promise<UtilityOrderView> {
    const res = await api.post<ApiResponse<UtilityOrderView>>('/utilities/bills/pay', payload, {
      headers: { 'Idempotency-Key': idempotencyKey },
      signal
    })
    return unwrap(res.data)
  },

  /** GET /api/utilities/orders/:id — caller only, 404 for another user. */
  async getOrder(orderId: string, signal?: AbortSignal): Promise<UtilityOrderView> {
    const res = await api.get<ApiResponse<UtilityOrderView>>(orderPath(orderId), { signal })
    return unwrap(res.data)
  }
}
