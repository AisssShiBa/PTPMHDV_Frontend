export type NotificationType =
  | 'PAYMENT_SUCCESS'
  | 'PAYMENT_FAILED'
  | 'PAYMENT_EXPIRED'
  | 'PAYMENT_REFUNDED'
  | 'PAYMENT_CANCELLED'
  | 'WALLET_CREDITED'
  | 'WALLET_DEBITED'
  | 'KYC_APPROVED'
  | 'KYC_REJECTED'
  | 'KYC_TIER_CHANGED'
  | 'MERCHANT_APPROVED'
  | 'MERCHANT_REJECTED'
  | 'TOPUP_SUCCEEDED'
  | 'CASHOUT_SUCCEEDED'
  | 'CASHOUT_FAILED'
  | 'UTILITY_SUCCEEDED'
  | 'UTILITY_FAILED'
  | 'UTILITY_REFUNDED'

export interface NotificationItem {
  id: string
  /** Outbox/inbox event id when the backend exposes it; used to dedupe realtime events. */
  eventId?: string | null
  userId: string
  type: NotificationType
  message: string
  read: boolean
  createdAt: string
}

export interface NotificationPagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface NotificationListResponse {
  notifications: NotificationItem[]
  unreadCount: number
  pagination: NotificationPagination
}

export interface NotificationSocketTicket {
  ticket: string
  expiresAt: string
}

export type NotificationFilter = 'ALL' | 'BALANCE' | 'SECURITY'

const BALANCE_TYPES: ReadonlySet<NotificationType> = new Set([
  'PAYMENT_SUCCESS',
  'PAYMENT_FAILED',
  'PAYMENT_EXPIRED',
  'PAYMENT_REFUNDED',
  'PAYMENT_CANCELLED',
  'WALLET_CREDITED',
  'WALLET_DEBITED',
  'TOPUP_SUCCEEDED',
  'CASHOUT_SUCCEEDED',
  'CASHOUT_FAILED',
  'UTILITY_SUCCEEDED',
  'UTILITY_FAILED',
  'UTILITY_REFUNDED'
])

const SECURITY_TYPES: ReadonlySet<NotificationType> = new Set([
  'KYC_APPROVED',
  'KYC_REJECTED',
  'KYC_TIER_CHANGED',
  'MERCHANT_APPROVED',
  'MERCHANT_REJECTED'
])

export function notificationFilter(type: NotificationType): Exclude<NotificationFilter, 'ALL'> {
  return SECURITY_TYPES.has(type) ? 'SECURITY' : 'BALANCE'
}

export function isNotificationType(value: unknown): value is NotificationType {
  if (typeof value !== 'string') return false
  return BALANCE_TYPES.has(value as NotificationType) || SECURITY_TYPES.has(value as NotificationType)
}
