import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Bell, CheckCheck, Clock, CreditCard, Loader2, Shield } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth/stores/useAuthStore'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { QueryBoundary } from '@/components/common/QueryBoundary'
import {
  applyRealtimeNotification,
  hasNotificationInCache,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationFeed
} from '../api/notification.queries'
import { useNotificationSocket } from '../hooks/useNotificationSocket'
import {
  notificationFilter,
  type NotificationFilter,
  type NotificationItem
} from '../types/notification.types'
import { NotificationListItem, isToday } from './NotificationList'

const FEED_PAGE_SIZE = 10

const filters: Array<{ value: NotificationFilter; label: string; icon?: LucideIcon }> = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'BALANCE', label: 'Biến động số dư', icon: CreditCard },
  { value: 'SECURITY', label: 'Xác thực & bảo mật', icon: Shield }
]

const dedupeById = (items: NotificationItem[]): NotificationItem[] => {
  const seen = new Set<string>()
  return items.filter((item) => {
    if (seen.has(item.id)) return false
    seen.add(item.id)
    return true
  })
}

export function NotificationCenter() {
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)
  const accessToken = useAuthStore((state) => state.accessToken)
  const [filter, setFilter] = useState<NotificationFilter>('ALL')
  const [unreadOnly, setUnreadOnly] = useState(false)

  const feedQuery = useNotificationFeed(FEED_PAGE_SIZE, { enabled: Boolean(user) })
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()

  const handleRealtimeNotification = (notification: NotificationItem) => {
    if (hasNotificationInCache(queryClient, notification)) return
    applyRealtimeNotification(queryClient, notification)
    toast.info(notification.message)
  }

  const socketConnected = useNotificationSocket(
    user?.id ? String(user.id) : undefined,
    accessToken ?? undefined,
    handleRealtimeNotification
  )

  const notifications = useMemo(
    () => dedupeById(feedQuery.data?.pages.flatMap((page) => page.notifications) ?? []),
    [feedQuery.data]
  )
  const unreadCount = feedQuery.data?.pages[0]?.unreadCount ?? 0

  const visible = notifications.filter((item) => {
    if (unreadOnly && item.read) return false
    if (filter === 'ALL') return true
    return notificationFilter(item.type) === filter
  })
  const todayList = visible.filter((item) => isToday(item.createdAt))
  const earlierList = visible.filter((item) => !isToday(item.createdAt))

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

  const renderGroup = (title: string, items: NotificationItem[]) => {
    if (items.length === 0) return null
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            <Clock className="size-3.5 text-primary" />
            {title}
          </span>
          <span className="text-xs text-muted-foreground">
            {items.filter((item) => !item.read).length} chưa đọc
          </span>
        </div>
        <div className="space-y-2.5">
          {items.map((item) => (
            <NotificationListItem key={item.id} notification={item} onMarkRead={handleMarkRead} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-16">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Button asChild variant="outline" size="sm" className="h-8 gap-1 px-2.5 text-xs">
              <Link to="/app">
                <ArrowLeft className="size-3.5" />
                Trang chủ
              </Link>
            </Button>
            <Badge className="gap-1 border-primary/20 bg-primary/10 text-xs font-semibold text-primary">
              <Bell className="size-3" />
              {unreadCount} thông báo mới
            </Badge>
            <span className="text-[11px] text-muted-foreground">
              {socketConnected ? 'Đang nhận thông báo trực tiếp' : 'Kết nối trực tiếp đang tắt'}
            </span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            Trung tâm thông báo
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
            Cập nhật biến động số dư, xác thực hồ sơ và các thay đổi tài khoản FinVault của bạn.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0 || markAllRead.isPending}
            className="h-9 gap-1.5 text-xs font-semibold"
          >
            <CheckCheck className="size-4 text-primary" />
            Đọc tất cả
          </Button>
        </div>
      </div>

      <div className="flex flex-col justify-between gap-3 rounded-2xl border border-border bg-muted/50 p-1.5 sm:flex-row sm:items-center">
        <div className="flex items-center gap-1 overflow-x-auto p-0.5">
          {filters.map((item) => {
            const Icon = item.icon
            return (
              <Button
                key={item.value}
                type="button"
                variant={filter === item.value ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setFilter(item.value)}
                className="h-8 gap-1.5 rounded-xl text-xs font-semibold"
              >
                {Icon && <Icon className="size-3.5" />}
                {item.label}
              </Button>
            )
          })}
        </div>

        <div className="flex items-center justify-end px-2">
          <button
            type="button"
            onClick={() => setUnreadOnly((previous) => !previous)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
              unreadOnly
                ? 'border-primary bg-primary text-primary-foreground shadow-xs'
                : 'border-border bg-card text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className={`size-2 rounded-full ${unreadOnly ? 'bg-white' : 'bg-primary'}`} />
            Chỉ chưa đọc ({unreadCount})
          </button>
        </div>
      </div>

      <QueryBoundary
        query={feedQuery}
        skeleton={
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground" role="status">
            <Loader2 className="size-4 animate-spin text-primary" />
            Đang tải thông báo…
          </div>
        }
        isEmpty={(data) => data.pages.every((page) => page.notifications.length === 0)}
        emptyFallback={
          <Card className="flex flex-col items-center space-y-3 border-border p-12 text-center shadow-xs">
            <div className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Bell className="size-6" />
            </div>
            <h3 className="text-base font-bold text-foreground">Không có thông báo nào</h3>
            <p className="max-w-sm text-xs text-muted-foreground">
              Thông báo về giao dịch, xác thực hồ sơ và biến động số dư sẽ xuất hiện tại đây.
            </p>
          </Card>
        }
      >
        {() =>
          visible.length === 0 ? (
            <Card className="flex flex-col items-center space-y-3 border-border p-12 text-center shadow-xs">
              <div className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Bell className="size-6" />
              </div>
              <h3 className="text-base font-bold text-foreground">
                Không có thông báo trong mục này
              </h3>
              <p className="max-w-sm text-xs text-muted-foreground">
                Bạn đã xem hết thông báo của bộ lọc hiện tại hoặc chưa có thông báo mới.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setFilter('ALL')
                  setUnreadOnly(false)
                }}
                className="mt-2 text-xs font-semibold"
              >
                Xem tất cả thông báo
              </Button>
            </Card>
          ) : (
            <div className="space-y-6">
              {renderGroup('Hôm nay', todayList)}
              {earlierList.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between px-1">
                    <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      <Clock className="size-3.5" />
                      Trước đó
                    </span>
                  </div>
                  <div className="space-y-2.5">
                    {earlierList.map((item) => (
                      <NotificationListItem
                        key={item.id}
                        notification={item}
                        onMarkRead={handleMarkRead}
                      />
                    ))}
                  </div>
                </div>
              )}

              {feedQuery.hasNextPage && (
                <div className="flex justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void feedQuery.fetchNextPage()}
                    disabled={feedQuery.isFetchingNextPage}
                    className="text-xs font-semibold"
                  >
                    {feedQuery.isFetchingNextPage ? 'Đang tải…' : 'Xem thêm thông báo'}
                  </Button>
                </div>
              )}
            </div>
          )
        }
      </QueryBoundary>
    </div>
  )
}
