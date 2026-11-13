import {
  ORDER_POLL_INTERVAL_MS,
  ORDER_STATUS_LABELS,
  TERMINAL_ORDER_STATUSES
} from './constants'
import type { UtilityOrderStatus, UtilityOrderType } from './types'

export function isTerminalOrderStatus(
  status: string | null | undefined
): status is UtilityOrderStatus {
  return Boolean(
    status && (TERMINAL_ORDER_STATUSES as readonly string[]).includes(status)
  )
}

/**
 * TanStack Query `refetchInterval` value. `false` stops polling at a final
 * state; every non-terminal state keeps the order tracker alive.
 */
export function orderPollInterval(
  status: string | null | undefined
): number | false {
  return isTerminalOrderStatus(status) ? false : ORDER_POLL_INTERVAL_MS
}

export function orderStatusLabel(status: string): string {
  return ORDER_STATUS_LABELS[status as UtilityOrderStatus] ?? `Trạng thái ${status}`
}

export function orderTypeLabel(type: UtilityOrderType | string): string {
  return type === 'TELCO_TOPUP' ? 'Nạp điện thoại' : 'Thanh toán hóa đơn'
}

/**
 * `failureReason` is a backend code (e.g. `PROVIDER_FAILED:PROVIDER_REJECTED`),
 * never user-facing English. Unknown codes intentionally fall back to null so
 * the UI can show a generic Vietnamese sentence instead of leaking raw text.
 */
export function failureReasonMessage(reason: string | null | undefined): string | null {
  if (!reason) return null
  if (reason.includes('PROVIDER_REJECTED')) {
    return 'Nhà cung cấp từ chối giao dịch. FinVault sẽ hoàn tiền nếu đã trừ ví.'
  }
  if (reason.includes('PAYMENT_REJECTED')) {
    return 'Thanh toán bị từ chối. Vui lòng kiểm tra hạn mức và số dư ví.'
  }
  if (reason.includes('REFUND_REJECTED')) {
    return 'Yêu cầu hoàn tiền bị từ chối. Vui lòng liên hệ hỗ trợ FinVault.'
  }
  if (reason.includes('TIMEOUT')) {
    return 'Nhà cung cấp chưa phản hồi. FinVault sẽ tiếp tục kiểm tra kết quả.'
  }
  return null
}
