// d:\PTPMHDV\Frontend\src\features\notification\components\NotificationBell.tsx
import { useEffect, useRef, useState } from 'react'
import { Bell, CheckCheck, Loader2 } from 'lucide-react'
import { notificationService } from '../services/notificationService'
import type { NotificationItem } from '../types/notification.types'
import { useAuthStore } from '@/features/auth/stores/useAuthStore'
import { toast } from 'sonner'

export const NotificationBell: React.FC = () => {
  const user = useAuthStore((state) => state.user)
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const fetchNotifications = async () => {
    if (!user?.id) return
    try {
      setLoading(true)
      const data = await notificationService.getNotifications(String(user.id), 1, 10)
      setNotifications(data.notifications || [])
      setUnreadCount(data.unreadCount || 0)
    } catch {
      // Silent fail on polling/fetching notifications
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()
    const timer = setInterval(fetchNotifications, 15000) // Poll mỗi 15s
    return () => clearInterval(timer)
  }, [user?.id])

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
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
      setUnreadCount((c) => Math.max(0, c - 1))
    } catch (err: any) {
      toast.error('Lỗi cập nhật: ' + err.message)
    }
  }

  const handleMarkAllRead = async () => {
    if (!user?.id || unreadCount === 0) return
    try {
      await notificationService.markAllRead(String(user.id))
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      setUnreadCount(0)
      toast.success('Đã đánh dấu đọc tất cả thông báo!')
    } catch (err: any) {
      toast.error('Lỗi cập nhật: ' + err.message)
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
                  <span className={`size-2 rounded-full mt-1.5 shrink-0 ${item.read ? 'bg-transparent' : 'bg-primary'}`} />
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
        </div>
      )}
    </div>
  )
}
