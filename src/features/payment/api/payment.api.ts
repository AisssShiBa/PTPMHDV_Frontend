import api from '@/lib/axios'
import { unwrap, type ApiResponse } from '@/lib/apiResponse'
import type {
  P2pQuoteDto,
  P2pQuoteResult,
  P2pCheckoutDto,
  P2pCheckoutResult,
  ConfirmPaymentResult,
  PaymentRecord
} from '../types/payment.types'

export const paymentApi = {
  /**
   * Tính báo giá chuyển tiền P2P (phí 0đ, hạn 60s)
   * Endpoint: POST /api/payments/p2p/quote
   */
  async p2pQuote(dto: P2pQuoteDto, signal?: AbortSignal): Promise<P2pQuoteResult> {
    const res = await api.post<ApiResponse<P2pQuoteResult>>('/payments/p2p/quote', dto, { signal })
    return unwrap(res.data)
  },

  /**
   * Khởi tạo giao dịch chuyển tiền P2P kèm Idempotency-Key
   * Endpoint: POST /api/payments/p2p/checkout
   */
  async p2pCheckout(
    dto: P2pCheckoutDto,
    idempotencyKey: string,
    signal?: AbortSignal
  ): Promise<P2pCheckoutResult> {
    const res = await api.post<ApiResponse<P2pCheckoutResult>>('/payments/p2p/checkout', dto, {
      headers: {
        'Idempotency-Key': idempotencyKey
      },
      signal
    })
    return unwrap(res.data)
  },

  /**
   * Xác nhận thanh toán với mã xác thực giao dịch
   * Endpoint: POST /api/payments/:id/confirm
   * Header: X-Transaction-Token
   */
  async confirmPayment(
    paymentId: string,
    transactionToken: string,
    signal?: AbortSignal
  ): Promise<ConfirmPaymentResult> {
    const res = await api.post<ApiResponse<ConfirmPaymentResult>>(
      `/payments/${encodeURIComponent(paymentId)}/confirm`,
      {},
      {
        headers: {
          'X-Transaction-Token': transactionToken
        },
        signal
      }
    )
    return unwrap(res.data)
  },

  /**
   * Tra cứu trạng thái giao dịch
   * Endpoint: GET /api/payments/:id
   */
  async getPaymentById(paymentId: string, signal?: AbortSignal): Promise<PaymentRecord> {
    const res = await api.get<ApiResponse<PaymentRecord>>(`/payments/${encodeURIComponent(paymentId)}`, {
      signal
    })
    return unwrap(res.data)
  }
}
