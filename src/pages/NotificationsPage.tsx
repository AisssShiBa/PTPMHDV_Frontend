import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Bell,
  CheckCheck,
  Trash2,
  ShieldAlert,
  Gift,
  ArrowLeft,
  Clock,
  ChevronRight,
  Shield,
  CreditCard,
  Tag
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'

export type NotificationCategory = 'ALL' | 'BALANCE' | 'PROMOTION' | 'SECURITY'

export interface AppNotification {
  id: string
  title: string
  message: string
  category: 'BALANCE' | 'PROMOTION' | 'SECURITY'
  time: string
  dateGroup: 'Hôm nay' | 'Trước đó'
  isRead: boolean
  amount?: string
  isAmountPositive?: boolean
  transactionCode?: string
  actionUrl?: string
  actionLabel?: string
  securityAction?: boolean
}

const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'NOTIF-01',
    title: 'Nạp tiền thành công',
    message: 'Bạn đã nạp thành công +100.000 ₫ từ cổng VNPAY vào ví FinVault.',
    category: 'BALANCE',
    time: '09:15',
    dateGroup: 'Hôm nay',
    isRead: false,
    amount: '+100.000 ₫',
    isAmountPositive: true,
    transactionCode: 'VNP-89214',
    actionUrl: '/app/transactions',
    actionLabel: 'Chi tiết giao dịch'
  },
  {
    id: 'NOTIF-02',
    title: 'Chuyển tiền thành công',
    message: 'Giao dịch chuyển -60.000 ₫ cho Trần Văn Bình đã hoàn tất thành công.',
    category: 'BALANCE',
    time: '14:30',
    dateGroup: 'Hôm nay',
    isRead: false,
    amount: '-60.000 ₫',
    isAmountPositive: false,
    transactionCode: 'TXN-90184',
    actionUrl: '/app/transactions',
    actionLabel: 'Biên lai chuyển khoản'
  },
  {
    id: 'NOTIF-03',
    title: 'Cảnh báo đăng nhập thiết bị mới',
    message: 'Tài khoản được đăng nhập từ thiết bị Chrome macOS tại TP. Hồ Chí Minh.',
    category: 'SECURITY',
    time: '08:12',
    dateGroup: 'Hôm nay',
    isRead: false,
    securityAction: true
  },
  {
    id: 'NOTIF-04',
    title: 'Ưu đãi hoàn tiền 20% Highlands Coffee',
    message: 'Áp dụng cho mọi đơn thanh toán qua mã QR FinVault tuần này. Tối đa hoàn 50.000 ₫.',
    category: 'PROMOTION',
    time: 'Hôm qua',
    dateGroup: 'Trước đó',
    isRead: true,
    actionUrl: '/app/utilities',
    actionLabel: 'Lưu mã ưu đãi'
  },
  {
    id: 'NOTIF-05',
    title: 'Nâng cấp hạn mức KYC Cấp 2 thành công',
    message: 'Tài khoản của bạn đã được nâng cấp lên Cấp xác minh 2. Hạn mức giao dịch mở rộng tới 200.000.000 ₫/ngày.',
    category: 'SECURITY',
    time: '20/10/2026',
    dateGroup: 'Trước đó',
    isRead: true,
    actionUrl: '/app/profile',
    actionLabel: 'Xem chi tiết hạn mức'
  },
  {
    id: 'NOTIF-06',
    title: 'Nhận tiền từ Nguyễn Thị Thu',
    message: 'Bạn vừa nhận được +250.000 ₫ với nội dung: "Tien an trua nhom phong".',
    category: 'BALANCE',
    time: '18/10/2026',
    dateGroup: 'Trước đó',
    isRead: true,
    amount: '+250.000 ₫',
    isAmountPositive: true,
    transactionCode: 'TXN-88102',
    actionUrl: '/app/transactions',
    actionLabel: 'Xem số dư khả dụng'
  }
]

export function NotificationsPage() {
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<AppNotification[]>(INITIAL_NOTIFICATIONS)
  const [selectedCategory, setSelectedCategory] = useState<NotificationCategory>('ALL')
  const [unreadOnly, setUnreadOnly] = useState(false)

  // Số lượng chưa đọc
  const unreadCount = notifications.filter((n) => !n.isRead).length

  // Lọc theo Category và Unread
  const filteredNotifications = notifications.filter((n) => {
    if (unreadOnly && n.isRead) return false
    if (selectedCategory === 'ALL') return true
    return n.category === selectedCategory
  })

  // Đánh dấu tất cả đã đọc
  const handleMarkAllAsRead = () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })))
    toast.success('Đã đánh dấu tất cả thông báo là đã đọc')
  }

  // Đánh dấu 1 thông báo là đã đọc
  const handleMarkItemAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isRead: true } : item))
    )
  }

  // Xóa các thông báo đã đọc
  const handleClearRead = () => {
    setNotifications((prev) => prev.filter((item) => !item.isRead))
    toast.success('Đã xóa tất cả thông báo đã đọc')
  }

  // Xử lý xác nhận bảo mật
  const handleConfirmSecurity = (id: string, isMe: boolean) => {
    handleMarkItemAsRead(id)
    if (isMe) {
      toast.success('Đã xác nhận thiết bị tin cậy')
    } else {
      toast.error('Đã ghi nhận yêu cầu bảo vệ tài khoản! Phiên đăng nhập lạ đã bị đăng xuất.')
    }
  }

  // Render Icon theo danh mục
  const renderCategoryIcon = (category: AppNotification['category']) => {
    switch (category) {
      case 'BALANCE':
        return (
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
            <CreditCard className="h-5 w-5" />
          </div>
        )
      case 'SECURITY':
        return (
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
            <ShieldAlert className="h-5 w-5" />
          </div>
        )
      case 'PROMOTION':
        return (
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/20">
            <Gift className="h-5 w-5" />
          </div>
        )
    }
  }

  // Gom nhóm danh sách theo "Hôm nay" và "Trước đó"
  const todayList = filteredNotifications.filter((n) => n.dateGroup === 'Hôm nay')
  const earlierList = filteredNotifications.filter((n) => n.dateGroup === 'Trước đó')

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Header điều hướng */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Button asChild variant="outline" size="sm" className="h-8 px-2.5 text-xs gap-1 cursor-pointer">
              <Link to="/app">
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Trang chủ</span>
              </Link>
            </Button>
            <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold gap-1">
              <Bell className="h-3 w-3" />
              <span>{unreadCount} thông báo mới</span>
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Trung tâm thông báo
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Cập nhật biến động số dư, ưu đãi khuyến mãi độc quyền và cảnh báo bảo mật tài khoản FinVault.
          </p>
        </div>

        {/* Các nút hành động thao tác nhanh */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0}
            className="h-9 text-xs font-semibold gap-1.5 cursor-pointer"
          >
            <CheckCheck className="h-4 w-4 text-primary" />
            <span>Đọc tất cả</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClearRead}
            className="h-9 text-xs text-muted-foreground hover:text-destructive gap-1.5 cursor-pointer"
          >
            <Trash2 className="h-4 w-4" />
            <span>Xóa đã đọc</span>
          </Button>
        </div>
      </div>

      {/* Tabs Bộ lọc danh mục */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-1.5 bg-muted/50 rounded-2xl border border-border">
        {/* Nhóm danh mục: Tất cả, Biến động số dư, Khuyến mãi, Bảo mật */}
        <div className="flex items-center gap-1 overflow-x-auto p-0.5">
          <Button
            type="button"
            variant={selectedCategory === 'ALL' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSelectedCategory('ALL')}
            className="h-8 text-xs font-semibold rounded-xl cursor-pointer"
          >
            Tất cả
          </Button>
          <Button
            type="button"
            variant={selectedCategory === 'BALANCE' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSelectedCategory('BALANCE')}
            className="h-8 text-xs font-semibold rounded-xl gap-1.5 cursor-pointer"
          >
            <CreditCard className="h-3.5 w-3.5" />
            <span>Biến động số dư</span>
          </Button>
          <Button
            type="button"
            variant={selectedCategory === 'PROMOTION' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSelectedCategory('PROMOTION')}
            className="h-8 text-xs font-semibold rounded-xl gap-1.5 cursor-pointer"
          >
            <Tag className="h-3.5 w-3.5" />
            <span>Khuyến mãi</span>
          </Button>
          <Button
            type="button"
            variant={selectedCategory === 'SECURITY' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setSelectedCategory('SECURITY')}
            className="h-8 text-xs font-semibold rounded-xl gap-1.5 cursor-pointer"
          >
            <Shield className="h-3.5 w-3.5" />
            <span>Bảo mật</span>
          </Button>
        </div>

        {/* Nút bật/tắt Chỉ hiển thị chưa đọc */}
        <div className="flex items-center justify-end px-2">
          <button
            type="button"
            onClick={() => setUnreadOnly((prev) => !prev)}
            className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer ${
              unreadOnly
                ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                : 'bg-card text-muted-foreground border-border hover:text-foreground'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${unreadOnly ? 'bg-white' : 'bg-primary'}`} />
            <span>Chỉ chưa đọc ({unreadCount})</span>
          </button>
        </div>
      </div>

      {/* Danh sách thông báo */}
      {filteredNotifications.length === 0 ? (
        <Card className="border-border shadow-xs p-12 text-center flex flex-col items-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
            <Bell className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-foreground">Không có thông báo nào</h3>
          <p className="text-xs text-muted-foreground max-w-sm">
            Bạn đã xem hết các thông báo trong mục này hoặc chưa có thông báo mới phát sinh.
          </p>
          {(selectedCategory !== 'ALL' || unreadOnly) && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedCategory('ALL')
                setUnreadOnly(false)
              }}
              className="text-xs font-semibold mt-2 cursor-pointer"
            >
              Xem tất cả thông báo
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-6">
          {/* NHÓM 1: HÔM NAY */}
          {todayList.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  <span>Hôm nay</span>
                </span>
                <span className="text-xs text-muted-foreground">
                  {todayList.filter((n) => !n.isRead).length} chưa đọc
                </span>
              </div>

              <div className="space-y-2.5">
                {todayList.map((item) => (
                  <Card
                    key={item.id}
                    onClick={() => handleMarkItemAsRead(item.id)}
                    className={`border transition-all cursor-pointer relative overflow-hidden group hover:border-primary/40 ${
                      item.isRead
                        ? 'bg-card border-border/80 opacity-85'
                        : item.category === 'SECURITY'
                        ? 'bg-amber-500/5 border-amber-500/30'
                        : 'bg-primary/5 border-primary/20 shadow-xs'
                    }`}
                  >
                    {!item.isRead && (
                      <div className="absolute top-0 left-0 bottom-0 w-1 bg-primary" />
                    )}

                    <CardContent className="p-4 sm:p-5 flex items-start gap-4">
                      {renderCategoryIcon(item.category)}

                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                              {item.title}
                            </h3>
                            {item.category === 'SECURITY' && (
                              <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-none text-[10px] font-bold">
                                BẢO MẬT
                              </Badge>
                            )}
                            {item.category === 'BALANCE' && item.amount && (
                              <span
                                className={`text-xs font-bold font-mono px-2 py-0.5 rounded-md ${
                                  item.isAmountPositive
                                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                    : 'bg-muted text-foreground'
                                }`}
                              >
                                {item.amount}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-muted-foreground shrink-0">{item.time}</span>
                        </div>

                        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                          {item.message}
                        </p>

                        {/* Nút hành động theo loại thông báo */}
                        {item.securityAction && (
                          <div className="pt-2 flex items-center gap-2 flex-wrap">
                            <Button
                              type="button"
                              size="sm"
                              variant="destructive"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleConfirmSecurity(item.id, false)
                              }}
                              className="h-8 text-xs font-semibold cursor-pointer"
                            >
                              Không phải tôi (Khóa phiên)
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleConfirmSecurity(item.id, true)
                              }}
                              className="h-8 text-xs font-semibold cursor-pointer"
                            >
                              Xác nhận thiết bị của tôi
                            </Button>
                          </div>
                        )}

                        {item.actionUrl && item.actionLabel && (
                          <div className="pt-1 flex items-center gap-3">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                navigate(item.actionUrl!)
                              }}
                              className="h-7 px-2 text-xs font-semibold text-primary hover:text-primary/80 gap-1 p-0 cursor-pointer"
                            >
                              <span>{item.actionLabel}</span>
                              <ChevronRight className="h-3.5 w-3.5" />
                            </Button>
                            {item.transactionCode && (
                              <span className="text-[11px] text-muted-foreground font-mono">
                                Mã: #{item.transactionCode}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* NHÓM 2: TRƯỚC ĐÓ */}
          {earlierList.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Trước đó</span>
                </span>
              </div>

              <div className="space-y-2.5">
                {earlierList.map((item) => (
                  <Card
                    key={item.id}
                    onClick={() => handleMarkItemAsRead(item.id)}
                    className={`border transition-all cursor-pointer relative overflow-hidden group hover:border-primary/40 ${
                      item.isRead
                        ? 'bg-card border-border/80 opacity-85'
                        : 'bg-primary/5 border-primary/20 shadow-xs'
                    }`}
                  >
                    {!item.isRead && (
                      <div className="absolute top-0 left-0 bottom-0 w-1 bg-primary" />
                    )}

                    <CardContent className="p-4 sm:p-5 flex items-start gap-4">
                      {renderCategoryIcon(item.category)}

                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                              {item.title}
                            </h3>
                            {item.category === 'PROMOTION' && (
                              <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-none text-[10px] font-bold">
                                ƯU ĐÃI
                              </Badge>
                            )}
                            {item.amount && (
                              <span
                                className={`text-xs font-bold font-mono px-2 py-0.5 rounded-md ${
                                  item.isAmountPositive
                                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                    : 'bg-muted text-foreground'
                                }`}
                              >
                                {item.amount}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-muted-foreground shrink-0">{item.time}</span>
                        </div>

                        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                          {item.message}
                        </p>

                        {item.actionUrl && item.actionLabel && (
                          <div className="pt-1 flex items-center gap-3">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                navigate(item.actionUrl!)
                              }}
                              className="h-7 px-2 text-xs font-semibold text-primary hover:text-primary/80 gap-1 p-0 cursor-pointer"
                            >
                              <span>{item.actionLabel}</span>
                              <ChevronRight className="h-3.5 w-3.5" />
                            </Button>
                            {item.transactionCode && (
                              <span className="text-[11px] text-muted-foreground font-mono">
                                Mã: #{item.transactionCode}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default NotificationsPage
