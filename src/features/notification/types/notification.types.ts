// d:\PTPMHDV\Frontend\src\features\notification\types\notification.types.ts

export type NotificationType =
  | 'PAYMENT_SUCCESS'
  | 'PAYMENT_FAILED'
  | 'PAYMENT_REFUNDED'
  | 'PAYMENT_CANCELLED'
  | 'WALLET_CREDITED'
  | 'WALLET_DEBITED'
  | 'KYC_APPROVED'
  | 'KYC_REJECTED'
  | 'MERCHANT_APPROVED'
  | 'MERCHANT_REJECTED'

export interface NotificationItem {
  id: string
  userId: string
  type: NotificationType
  message: string
  read: boolean
  createdAt: string
}

export interface NotificationListResponse {
  userId: string
  notifications: NotificationItem[]
  unreadCount: number
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
