import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckCheck, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth/stores/useAuthStore'
import { QueryBoundary } from '@/components/common/QueryBoundary'
import {
  applyRealtimeNotification,
  hasNotificationInCache,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationList
} from '../api/notification.queries'
import { useNotificationSocket } from '../hooks/useNotificationSocket'
import type { NotificationItem } from '../types/notification.types'
import { NotificationIcon, formatNotificationTime } from './NotificationList'

const BELL_PAGE_SIZE = 8

/**
 * Header bell. The notification list and `unreadCount` live in the TanStack
 * Query cache; socket events are merged into that cache (dedupe by id/eventId)
 * instead of being kept in local component state.
 */
export function NotificationBell() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)
  const accessToken = useAuthStore((state) => state.accessToken)
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const listQuery = useNotificationList(1, BELL_PAGE_SIZE, { enabled: Boolean(user) })
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()
  const unreadCount = listQuery.data?.unreadCount ?? 0

  const handleRealtimeNotification = (notification: NotificationItem) => {
    if (hasNotificationInCache(queryClient, notification)) return
    applyRealtimeNotification(queryClient, notification)
    toast.info(notification.message)
  }

  useNotificationSocket(
    user?.id ? String(user.id) : undefined,
    accessToken ?? undefined,
    handleRealtimeNotification
  )

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleMarkRead = (id: string) => {
    markRead.mutate(id, {
      onError: () => toast.error('Không thể cập nhật trạng thái thông báo.')
    })
  }

  const handleMarkAllRead = () => {
    if (unreadCount === 0 || markAllRead.isPending) return
    markAllRead.mutate(undefined, {
      onSuccess: () => toast.success('Đã đánh dấu đọc tất cả thông báo!'),
      onError: () => toast.error('Không thể đánh dấu đọc tất cả thông báo.')
    })
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="relative rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
        aria-label="Thông báo"
      >
        <Bell className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-xs">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-2xl border border-border/80 bg-card p-3 shadow-2xl sm:w-96">
          <div className="flex items-center justify-between border-b border-border/50 px-2 py-1.5">
            <h4 className="text-sm font-bold text-foreground">Thông báo</h4>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={markAllRead.isPending}
                className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline disabled:opacity-60"
              >
                <CheckCheck className="size-3" /> Đọc tất cả
              </button>
            )}
          </div>

          <div className="my-1 max-h-80 divide-y divide-border/40 overflow-y-auto">
            <QueryBoundary
              query={listQuery}
              skeleton={
                <div className="py-8 text-center text-muted-foreground" role="status">
                  <Loader2 className="mx-auto size-5 animate-spin text-primary" />
                  <span className="sr-only">Đang tải thông báo…</span>
                </div>
              }
              isEmpty={(data) => data.notifications.length === 0}
              emptyFallback={
                <div className="py-8 text-center text-xs text-muted-foreground">
                  Bạn chưa có thông báo nào
                </div>
              }
            >
              {(data) => (
                <div className="divide-y divide-border/40">
                  {data.notifications.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleMarkRead(item.id)}
                      className={`flex w-full cursor-pointer items-start gap-2.5 rounded-xl p-2.5 text-left text-xs transition-colors ${
                        item.read
                          ? 'text-muted-foreground hover:bg-muted/50'
                          : 'bg-primary/5 font-medium text-foreground hover:bg-primary/10'
                      }`}
                    >
                      <span className="mt-0.5 shrink-0">
                        <NotificationIcon type={item.type} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-2 block leading-relaxed">{item.message}</span>
                        <span className="mt-1 block text-[10px] text-muted-foreground">
                          {formatNotificationTime(item.createdAt)}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </QueryBoundary>
          </div>

          <button
            type="button"
            onClick={() => {
              setIsOpen(false)
              navigate('/app/notifications')
            }}
            className="w-full rounded-lg py-2 text-xs font-semibold text-primary hover:bg-primary/5"
          >
            Xem tất cả thông báo
          </button>
        </div>
      )}
    </div>
  )
}
