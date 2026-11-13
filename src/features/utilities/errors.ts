import axios from 'axios'
import { errorCode, errorMessage } from '@/lib/apiResponse'

const messages: Record<string, string> = {
  INVALID_PHONE:
    'Số điện thoại không hợp lệ. Vui lòng nhập số di động Việt Nam (10 số, bắt đầu bằng 03/05/07/08/09).',
  INVALID_AMOUNT: 'Mệnh giá hoặc số tiền không hợp lệ. Vui lòng kiểm tra lại.',
  INVALID_PROVIDER: 'Mã nhà cung cấp không hợp lệ.',
  INVALID_CUSTOMER_CODE: 'Mã khách hàng không hợp lệ.',
  IDEMPOTENCY_KEY_REQUIRED: 'Thiếu mã chống trùng giao dịch. Vui lòng thử lại.',
  IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD:
    'Mã chống trùng đã được dùng cho nội dung khác. Vui lòng kiểm tra lại thông tin giao dịch.',
  IDEMPOTENCY_KEY_REUSED:
    'Yêu cầu giao dịch đang được xử lý hoặc đã hoàn tất. Vui lòng không gửi lại.',
  LIMIT_EXCEEDED:
    'Giao dịch vượt quá hạn mức cho phép. Vui lòng giảm số tiền hoặc nâng cấp hạn mức KYC.',
  INSUFFICIENT_FUNDS: 'Số dư khả dụng trong ví không đủ để thanh toán.',
  BILL_NOT_FOUND:
    'Không tìm thấy hóa đơn với mã khách hàng này. Vui lòng kiểm tra lại mã.',
  BILL_AMOUNT_MISMATCH:
    'Số tiền thanh toán không khớp với hóa đơn. Vui lòng tra cứu lại hóa đơn.',
  PROVIDER_TIMEOUT:
    'Nhà cung cấp không phản hồi. FinVault sẽ tiếp tục kiểm tra kết quả giao dịch.',
  UPSTREAM_UNAVAILABLE:
    'Hệ thống thanh toán tạm thời không phản hồi. Vui lòng thử lại với cùng giao dịch.',
  GATEWAY_TIMEOUT:
    'Cổng thanh toán không phản hồi. Vui lòng thử lại với cùng giao dịch.',
  NOT_FOUND: 'Không tìm thấy đơn hàng hoặc hóa đơn yêu cầu.',
  VALIDATION_ERROR: 'Thông tin gửi lên chưa hợp lệ. Vui lòng kiểm tra các trường.',
  PIN_LOCKED:
    'Mã PIN đã bị tạm khóa do nhập sai nhiều lần. Vui lòng thử lại sau.',
  INVALID_PIN: 'Mã PIN không chính xác. Vui lòng nhập lại.',
  PIN_INVALID: 'Mã PIN không chính xác. Vui lòng nhập lại.',
  PIN_NOT_SETUP: 'Bạn chưa thiết lập mã PIN giao dịch. Vui lòng cài đặt trong Hồ sơ.',
  PIN_NOT_SET: 'Bạn chưa thiết lập mã PIN giao dịch. Vui lòng cài đặt trong Hồ sơ.',
  TXN_TOKEN_MISSING: 'Thiếu mã xác thực giao dịch. Vui lòng xác thực PIN lại.',
  TXN_TOKEN_EXPIRED: 'Mã xác thực giao dịch đã hết hạn. Vui lòng xác thực PIN lại.',
  TXN_TOKEN_INVALID: 'Mã xác thực giao dịch không hợp lệ. Vui lòng xác thực PIN lại.',
  PAYMENT_PROCESSING:
    'Thanh toán đang được xử lý. Vui lòng không thực hiện lại, FinVault sẽ tự cập nhật kết quả.'
}

const prefixMessages: Array<{ prefix: string; message: string }> = [
  {
    prefix: 'PIN_',
    message: 'Không thể xác thực mã PIN. Vui lòng kiểm tra trạng thái PIN và thử lại.'
  },
  {
    prefix: 'TXN_TOKEN_',
    message: 'Mã xác thực giao dịch không hợp lệ hoặc đã hết hạn. Vui lòng xác thực PIN lại.'
  },
  {
    prefix: 'PAYMENT_',
    message: 'Thanh toán chưa hoàn tất. Vui lòng kiểm tra lại trạng thái đơn hàng.'
  }
]

/** Maps every documented utilities/PIN/payment code to Vietnamese. */
export function utilitiesErrorMessage(error: unknown): string {
  const code = errorCode(error)
  if (code && messages[code]) return messages[code]
  if (code) {
    const prefix = prefixMessages.find((entry) => code.startsWith(entry.prefix))
    if (prefix) return prefix.message
  }
  return errorMessage(error)
}

/**
 * A checkout is safe to retry with the SAME Idempotency-Key when the outcome is
 * unknown (network error, gateway timeout, upstream 5xx). A definite 4xx means
 * the order was rejected and must not be silently retried.
 */
export function isRetryableCheckoutError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false
  if (!error.response) return true
  const code = errorCode(error)
  return (
    error.response.status === 408 ||
    error.response.status === 502 ||
    error.response.status === 504 ||
    code === 'UPSTREAM_UNAVAILABLE' ||
    code === 'GATEWAY_TIMEOUT'
  )
}

/**
 * Confirm is never retried automatically. These errors mean the payment may
 * still complete, so the page starts polling the order instead of confirming
 * again with a fresh token.
 */
export function isRetryableConfirmError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false
  if (!error.response) return true
  const code = errorCode(error)
  return (
    error.response.status === 408 ||
    error.response.status === 502 ||
    error.response.status === 504 ||
    code === 'PAYMENT_PROCESSING' ||
    code === 'GATEWAY_TIMEOUT' ||
    code === 'UPSTREAM_UNAVAILABLE'
  )
}
