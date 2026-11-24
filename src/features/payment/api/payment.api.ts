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

function quoteMoney(value: unknown): string | null {
  if (typeof value !== 'string' || !/^(0|[1-9]\d{0,17})(?:\.0{1,2})?$/.test(value)) return null
  return value.split('.')[0]
}

function normalizeQuote(value: unknown, dto: P2pQuoteDto): P2pQuoteResult {
  const invalid = () => new Error('Máy chủ trả về báo giá chuyển tiền không hợp lệ. Vui lòng lấy báo giá mới.')
  if (!value || typeof value !== 'object' || !('amount' in value) || !('fee' in value) || !('expiresAt' in value)) {
    throw invalid()
  }
  const amount = quoteMoney(value.amount)
  // The backend contract currently returns numeric zero; all money inside the UI remains a string.
  const fee = value.fee === 0 ? '0' : quoteMoney(value.fee)
  if (!amount || amount === '0' || amount !== quoteMoney(dto.amount) || fee === null
    || typeof value.expiresAt !== 'string' || !Number.isFinite(Date.parse(value.expiresAt))
    || ('destinationUserId' in value && value.destinationUserId !== dto.destinationUserId)) {
    throw invalid()
  }
  return { amount, fee, expiresAt: value.expiresAt }
}

export const paymentApi = {
  /**
   * Tính báo giá chuyển tiền P2P (phí 0đ, hạn 60s)
   * Endpoint: POST /api/payments/p2p/quote
   */
  async p2pQuote(dto: P2pQuoteDto, signal?: AbortSignal): Promise<P2pQuoteResult> {
    const res = await api.post<ApiResponse<unknown>>('/payments/p2p/quote', dto, { signal })
    return normalizeQuote(unwrap(res.data), dto)
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
        // Transaction tokens are single-use; reconcile instead of replaying on HTTP 401.
        fundingNoReplay: true,
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
