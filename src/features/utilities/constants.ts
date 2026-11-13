import type { UtilityOrderStatus } from './types'

/**
 * Values are copied from utilities-service/src/utils/money.ts. Keeping them in
 * sync is required by the backend validation (`INVALID_AMOUNT` otherwise).
 */
export const VALID_AMOUNTS = [
  '10000',
  '20000',
  '50000',
  '100000',
  '200000',
  '500000'
] as const

/** Same rule as utilities-service: Vietnamese mobile number, 10 digits. */
export const PHONE_PATTERN = /^(0|\+84)(3|5|7|8|9)\d{8}$/

/** Same rules as utilities-service/src/validations/utility.validation.ts. */
export const BILL_PROVIDER_PATTERN = /^[A-Za-z0-9._-]{2,32}$/
export const BILL_CUSTOMER_CODE_PATTERN = /^[A-Za-z0-9._-]{2,64}$/

export const DISCOUNT_PERCENT = 3n

/** Backend orders are asynchronous; poll until one of the terminal states. */
export const ORDER_POLL_INTERVAL_MS = 2000

export const TERMINAL_ORDER_STATUSES: readonly UtilityOrderStatus[] = [
  'SUCCESS',
  'FAILED',
  'REFUNDED',
  'REFUND_FAILED'
]

export const ORDER_STATUS_LABELS: Record<UtilityOrderStatus, string> = {
  PENDING_PAYMENT: 'Chờ thanh toán',
  PAID: 'Đã thanh toán, chờ xử lý',
  PROVIDER_PENDING: 'Đang xử lý với nhà cung cấp',
  SUCCESS: 'Thành công',
  FAILED: 'Thất bại',
  REFUND_REQUESTED: 'Đang hoàn tiền',
  REFUNDED: 'Đã hoàn tiền',
  REFUND_FAILED: 'Hoàn tiền thất bại'
}

/**
 * The backend has no provider catalogue endpoint. These three codes are the
 * sandbox-friendly set already used by the Utilities design; the service only
 * validates the string shape and uses it for display.
 */
export const BILL_PROVIDERS = [
  { code: 'EVN', label: 'Điện lực EVN' },
  { code: 'SAWACO', label: 'Cấp nước Sawaco' },
  { code: 'FPT', label: 'Internet FPT' }
] as const

export function billProviderLabel(code: string | null | undefined): string {
  return BILL_PROVIDERS.find((provider) => provider.code === code)?.label ?? code ?? ''
}
