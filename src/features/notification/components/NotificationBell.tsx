// d:\PTPMHDV\Frontend\src\features\notification\components\NotificationBell.tsx
import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { BadgeCheck, Bell, CheckCheck, Clock, CreditCard, Loader2, RotateCcw, ShieldCheck, Store, WalletCards, XCircle } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { notificationService } from '../services/notificationService'
import type { NotificationItem, NotificationType, NotificationListResponse } from '../types/notification.types'
import { useNotificationSocket } from '../hooks/useNotificationSocket'
import { useAuthStore } from '@/features/auth/stores/useAuthStore'
import { toast } from 'sonner'
import { errorMessage } from '@/lib/apiResponse'

const notificationIconByType: Record<NotificationType, LucideIcon> = {
  PAYMENT_SUCCESS: CreditCard,
  PAYMENT_FAILED: CreditCard,
  PAYMENT_EXPIRED: Clock,
  PAYMENT_REFUNDED: RotateCcw,
  PAYMENT_CANCELLED: XCircle,
  WALLET_CREDITED: WalletCards,
  WALLET_DEBITED: WalletCards,
  KYC_APPROVED: BadgeCheck,
  KYC_REJECTED: BadgeCheck,
  KYC_TIER_CHANGED: ShieldCheck,
  MERCHANT_APPROVED: Store,
  MERCHANT_REJECTED: Store
}

function notificationErrorMessage(error: unknown): string {
  const message = errorMessage(error)
  if (axios.isAxiosError<{ requestId?: string }>(error)) {
    const requestId = error.response?.data?.requestId
    if (requestId) return `${message} (Mã yêu cầu: ${requestId})`
  }
  return message
}

export const NotificationBell: React.FC = () => {
  const owner = useAuthStore((state) => state.user?.id)
  return owner ? <AccountNotificationBell key={owner} owner={owner} /> : null
}

function AccountNotificationBell({ owner }: { owner: string }) {
  const accessToken = useAuthStore((state) => state.accessToken)
  const client = useQueryClient()
  const queryKey = ['notifications', owner] as const
  const [isOpen, setIsOpen] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const handleRealtimeNotification = (item: NotificationItem) => {
    if (item.userId !== owner) return
    let added = false
    client.setQueryData<NotificationListResponse>(queryKey, (current) => {
      if (!current || current.notifications.some((row) => row.id === item.id)) return current
      added = true
      return { ...current, notifications: [item, ...current.notifications], unreadCount: current.unreadCount + (item.read ? 0 : 1) }
    })
    if (added) toast.info(item.message)
  }
  const socketConnected = useNotificationSocket(owner, accessToken ?? undefined, handleRealtimeNotification)
  const query = useQuery({
    queryKey,
    queryFn: ({ signal }) => notificationService.getNotifications(1, 10, signal),
    gcTime: 0,
    refetchInterval: socketConnected ? 60000 : 15000
  })
  const notifications = query.data?.notifications ?? []
  const unreadCount = query.data?.unreadCount ?? 0
  const page = query.data?.pagination.page ?? 1
  const totalPages = query.data?.pagination.totalPages ?? 1
  const loading = query.isFetching || loadingMore
  useEffect(() => { if (query.error) toast.error(notificationErrorMessage(query.error)) }, [query.error])

  const handleLoadMore = async () => {
    if (loading || page >= totalPages) return
    setLoadingMore(true)
    try {
      const data = await notificationService.getNotifications(page + 1, 10)
      if (useAuthStore.getState().user?.id !== owner) return
      client.setQueryData<NotificationListResponse>(queryKey, (current) => {
        if (!current) return data
        const ids = new Set(current.notifications.map((item) => item.id))
        return { ...data, notifications: [...current.notifications, ...data.notifications.filter((item) => !ids.has(item.id))] }
      })
    } catch (error) { toast.error(notificationErrorMessage(error)) }
    finally { setLoadingMore(false) }
  }

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleMarkAsRead = async (id: string, currentlyRead: boolean) => {
    if (currentlyRead) return
    try {
      await notificationService.markRead(id)
      if (useAuthStore.getState().user?.id !== owner) return
      client.setQueryData<NotificationListResponse>(queryKey, (current) => {
        if (!current || current.notifications.find((n) => n.id === id)?.read) return current
        return { ...current, notifications: current.notifications.map((n) => n.id === id ? { ...n, read: true } : n), unreadCount: Math.max(0, current.unreadCount - 1) }
      })
    } catch (err: unknown) {
      toast.error('Lỗi cập nhật: ' + notificationErrorMessage(err))
    }
  }

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return
    try {
      await notificationService.markAllRead()
      if (useAuthStore.getState().user?.id !== owner) return
      client.setQueryData<NotificationListResponse>(queryKey, (current) => current && ({ ...current, notifications: current.notifications.map((n) => ({ ...n, read: true })), unreadCount: 0 }))
      toast.success('Đã đánh dấu đọc tất cả thông báo!')
    } catch (err: unknown) {
      toast.error('Lỗi cập nhật: ' + notificationErrorMessage(err))
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Nút Chuông */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-lg p-2 text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
        aria-label="Thông báo"
      >
        <Bell className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-xs">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-border/80 bg-card p-3 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between px-2 py-1.5 border-b border-border/50">
            <h4 className="text-sm font-bold text-foreground">Thông báo</h4>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
              >
                <CheckCheck className="size-3" /> Đọc tất cả
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-border/40 my-1">
            {loading && notifications.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <Loader2 className="size-5 animate-spin mx-auto text-primary" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                Bạn chưa có thông báo nào
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleMarkAsRead(item.id, item.read)}
                  className={`p-2.5 rounded-xl text-xs transition-colors cursor-pointer flex gap-2.5 items-start ${
                    item.read ? 'hover:bg-muted/50 text-muted-foreground' : 'bg-primary/5 hover:bg-primary/10 text-foreground font-medium'
                  }`}
                >
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    {(() => {
                      const NotificationIcon = notificationIconByType[item.type] ?? Bell
                      return <NotificationIcon className="size-3.5" aria-hidden="true" />
                    })()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="line-clamp-2 text-xs leading-relaxed">{item.message}</p>
                    <span className="text-[10px] text-muted-foreground mt-1 block">
                      {new Date(item.createdAt).toLocaleString('vi-VN')}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
          {notifications.length > 0 && page < totalPages && (
            <button
              type="button"
              onClick={handleLoadMore}
              disabled={loading}
              className="w-full rounded-lg py-2 text-xs font-semibold text-primary hover:bg-primary/5 disabled:cursor-wait disabled:opacity-60"
            >
              {loading ? 'Đang tải...' : 'Xem thêm'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
