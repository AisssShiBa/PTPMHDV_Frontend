import {
  ArrowDownCircle,
  ArrowUpCircle,
  BadgeCheck,
  Bell,
  Clock,
  CreditCard,
  Receipt,
  RotateCcw,
  Store,
  WalletCards,
  XCircle
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { NotificationItem, NotificationType } from '../types/notification.types'

interface NotificationVisual {
  title: string
  icon: LucideIcon
  tone: 'primary' | 'warning' | 'success'
}

const DEFAULT_VISUAL: NotificationVisual = {
  title: 'Thông báo',
  icon: Bell,
  tone: 'primary'
}

const visualByType: Record<NotificationType, NotificationVisual> = {
  PAYMENT_SUCCESS: { title: 'Giao dịch thanh toán', icon: CreditCard, tone: 'success' },
  PAYMENT_FAILED: { title: 'Thanh toán thất bại', icon: CreditCard, tone: 'warning' },
  PAYMENT_EXPIRED: { title: 'Thanh toán hết hạn', icon: Clock, tone: 'warning' },
  PAYMENT_REFUNDED: { title: 'Hoàn tiền', icon: RotateCcw, tone: 'success' },
  PAYMENT_CANCELLED: { title: 'Thanh toán đã hủy', icon: XCircle, tone: 'warning' },
  WALLET_CREDITED: { title: 'Biến động số dư', icon: WalletCards, tone: 'success' },
  WALLET_DEBITED: { title: 'Biến động số dư', icon: WalletCards, tone: 'primary' },
  KYC_APPROVED: { title: 'Xác thực hồ sơ', icon: BadgeCheck, tone: 'success' },
  KYC_REJECTED: { title: 'Hồ sơ xác thực bị từ chối', icon: BadgeCheck, tone: 'warning' },
  KYC_TIER_CHANGED: { title: 'Cấp xác thực thay đổi', icon: BadgeCheck, tone: 'primary' },
  MERCHANT_APPROVED: { title: 'Cổng Merchant', icon: Store, tone: 'success' },
  MERCHANT_REJECTED: { title: 'Cổng Merchant', icon: Store, tone: 'warning' },
  TOPUP_SUCCEEDED: { title: 'Nạp tiền thành công', icon: ArrowDownCircle, tone: 'success' },
  CASHOUT_SUCCEEDED: { title: 'Rút tiền thành công', icon: ArrowUpCircle, tone: 'success' },
  CASHOUT_FAILED: { title: 'Rút tiền thất bại', icon: ArrowUpCircle, tone: 'warning' },
  UTILITY_SUCCEEDED: { title: 'Giao dịch tiện ích', icon: Receipt, tone: 'success' },
  UTILITY_FAILED: { title: 'Giao dịch tiện ích thất bại', icon: Receipt, tone: 'warning' },
  UTILITY_REFUNDED: { title: 'Hoàn tiền tiện ích', icon: Receipt, tone: 'success' }
}

/** Unknown enum values (a newer backend) render with the neutral default. */
export function notificationVisual(type: NotificationType | string): NotificationVisual {
  return visualByType[type as NotificationType] ?? DEFAULT_VISUAL
}

const toneClass: Record<NotificationVisual['tone'], string> = {
  primary: 'bg-primary/10 text-primary border-primary/20',
  warning: 'bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400',
  success: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400'
}

export function NotificationIcon({ type }: { type: NotificationType | string }) {
  const visual = notificationVisual(type)
  const Icon = visual.icon
  return (
    <div
      className={`flex size-10 shrink-0 items-center justify-center rounded-xl border ${toneClass[visual.tone]}`}
    >
      <Icon className="size-5" aria-hidden="true" />
    </div>
  )
}

export function formatNotificationTime(createdAt: string): string {
  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function isToday(createdAt: string): boolean {
  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) return false
  const now = new Date()
  return (
    date.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) ===
    now.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
  )
}

interface NotificationListItemProps {
  notification: NotificationItem
  onMarkRead: (id: string) => void
}

export function NotificationListItem({ notification, onMarkRead }: NotificationListItemProps) {
  const visual = notificationVisual(notification.type)
  return (
    <button
      type="button"
      onClick={() => onMarkRead(notification.id)}
      className={`relative w-full overflow-hidden rounded-2xl border p-4 text-left transition-all hover:border-primary/40 ${
        notification.read
          ? 'border-border/80 bg-card opacity-85'
          : 'border-primary/20 bg-primary/5 shadow-xs'
      }`}
    >
      {!notification.read && <span className="absolute inset-y-0 left-0 w-1 bg-primary" />}
      <div className="flex items-start gap-4">
        <NotificationIcon type={notification.type} />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-foreground">{visual.title}</h3>
            <span className="shrink-0 text-[11px] text-muted-foreground">
              {formatNotificationTime(notification.createdAt)}
            </span>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
            {notification.message}
          </p>
        </div>
      </div>
    </button>
  )
}
