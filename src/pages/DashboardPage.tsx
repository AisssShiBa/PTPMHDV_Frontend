import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Wallet,
  Eye,
  EyeOff,
  Send,
  ArrowDownCircle,
  ArrowUpCircle,
  QrCode,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Receipt,
  Smartphone,
  Copy,
  Check,
  ChevronRight,
  TrendingUp,
  CreditCard
} from 'lucide-react'
import { useAuthStore } from '@/features/auth/stores/useAuthStore'
import { formatVnd } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'

export function DashboardPage() {
  const { user } = useAuthStore()
  const [showBalance, setShowBalance] = useState(true)
  const [copied, setCopied] = useState(false)

  // Số dư ví mặc định hoặc từ user store
  const rawBalance = user?.balance || '1250000'
  const walletId = 'FV-8899-2026'

  const handleCopyWalletId = () => {
    navigator.clipboard.writeText(walletId)
    setCopied(true)
    toast.success('Đã sao chép mã ví FinVault')
    setTimeout(() => setCopied(false), 2000)
  }

  // Danh sách giao dịch gần đây thực tế
  const recentTransactions = [
    {
      id: 'txn_01',
      title: 'Chuyển tiền cho Khoa Trần',
      subtitle: 'Chuyển tiền P2P tức thì',
      type: 'EXPENSE',
      amount: '200000',
      time: '11:45 Hôm nay',
      status: 'SUCCESS'
    },
    {
      id: 'txn_02',
      title: 'Nạp tiền ví từ VNPAY',
      subtitle: 'Cổng thanh toán điện tử',
      type: 'INCOME',
      amount: '500000',
      time: '09:20 Hôm nay',
      status: 'SUCCESS'
    },
    {
      id: 'txn_03',
      title: 'Nhận tiền từ Highlands Coffee',
      subtitle: 'Thanh toán đối tác',
      type: 'INCOME',
      amount: '950000',
      time: '18:30 Hôm qua',
      status: 'SUCCESS'
    },
    {
      id: 'txn_04',
      title: 'Thanh toán tiền điện EVN',
      subtitle: 'Hóa đơn sinh hoạt tháng 11',
      type: 'EXPENSE',
      amount: '350000',
      time: '14:15 - 04/11/2026',
      status: 'SUCCESS'
    }
  ]

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* 1. WELCOME BANNER & KYC STATUS */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Xin chào, {user?.lastName ? `${user.lastName} ${user.firstName || ''}` : 'An Nguyễn'} 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Chúc bạn một ngày quản lý tài chính an toàn và hiệu quả
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge
            variant="secondary"
            className="px-3 py-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-700 text-xs font-semibold gap-1.5"
          >
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Tài khoản Cấp {user?.kycTier ?? 1} (Đã xác thực)</span>
          </Badge>
          <Button asChild variant="outline" size="sm" className="text-xs font-semibold">
            <Link to="/app/profile">Xem hạn mức</Link>
          </Button>
        </div>
      </div>

      {/* 2. MAIN WALLET BALANCE CARD & STATS */}
      <div className="grid md:grid-cols-12 gap-6 items-stretch">
        {/* Thẻ Ví Chính */}
        <div className="md:col-span-7 lg:col-span-8">
          <div className="h-full rounded-2xl bg-gradient-to-br from-[#00685b] via-[#005046] to-[#04332c] text-white p-6 sm:p-8 shadow-xl relative overflow-hidden flex flex-col justify-between">
            {/* Ambient Circles Background */}
            <div className="absolute -right-16 -bottom-16 w-64 h-64 rounded-full bg-white/5 blur-2xl pointer-events-none" />
            <div className="absolute -left-10 -top-10 w-48 h-48 rounded-full bg-emerald-400/10 blur-xl pointer-events-none" />

            <div className="relative z-10 space-y-6">
              {/* Card Top Meta */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-10 w-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white backdrop-blur">
                    <Wallet className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs font-medium text-white/70 block leading-tight">Ví điện tử cá nhân</span>
                    <span className="text-sm font-bold tracking-tight">FinVault Primary</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCopyWalletId}
                  className="inline-flex items-center gap-1.5 text-xs text-white/80 hover:text-white bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded-lg border border-white/10 transition-colors cursor-pointer"
                >
                  <span>{walletId}</span>
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>

              {/* Balance Amount */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-medium text-white/80">
                  <span>Số dư khả dụng</span>
                  <button
                    type="button"
                    onClick={() => setShowBalance(!showBalance)}
                    className="p-1 hover:text-white transition-colors cursor-pointer"
                    aria-label="Ẩn hoặc hiện số dư"
                  >
                    {showBalance ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <div className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                  {showBalance ? formatVnd(rawBalance) : '•••••••• ₫'}
                </div>
              </div>
            </div>

            {/* Daily Limit Progress */}
            <div className="relative z-10 pt-6 mt-6 border-t border-white/15 space-y-2 text-xs text-white/80">
              <div className="flex items-center justify-between">
                <span>Hạn mức chuyển tiền hôm nay:</span>
                <span className="font-semibold text-white">19.700.000 ₫ / 20.000.000 ₫</span>
              </div>
              <Progress value={98} className="h-1.5 bg-white/20" />
            </div>
          </div>
        </div>

        {/* Thẻ Thống kê Dòng tiền nhanh */}
        <div className="md:col-span-5 lg:col-span-4 flex flex-col justify-between gap-4">
          <Card className="flex-1 shadow-sm border-border bg-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="text-xs">Dòng tiền vào tháng này</CardDescription>
                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
              <CardTitle className="text-xl font-bold text-emerald-600">
                +1.450.000 ₫
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">Tăng 24% so với tháng trước</p>
            </CardContent>
          </Card>

          <Card className="flex-1 shadow-sm border-border bg-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="text-xs">Đã chi tiêu tháng này</CardDescription>
                <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <CreditCard className="h-4 w-4" />
                </div>
              </div>
              <CardTitle className="text-xl font-bold text-foreground">
                -550.000 ₫
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">4 giao dịch chuyển tiền & hóa đơn</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 3. 4 QUICK ACTION BUTTONS */}
      <div className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Thao tác nhanh
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Link
            to="/app/transfer"
            className="p-5 rounded-2xl bg-card border border-border hover:border-primary/50 hover:shadow-md transition-all group flex flex-col items-center text-center gap-3 cursor-pointer"
          >
            <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
              <Send className="h-6 w-6" />
            </div>
            <div>
              <p className="font-bold text-sm text-foreground">Chuyển tiền</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Tức thì, 0đ phí</p>
            </div>
          </Link>

          <Link
            to="/app/topup"
            className="p-5 rounded-2xl bg-card border border-border hover:border-emerald-500/50 hover:shadow-md transition-all group flex flex-col items-center text-center gap-3 cursor-pointer"
          >
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
              <ArrowDownCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="font-bold text-sm text-foreground">Nạp tiền</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Qua cổng VNPAY</p>
            </div>
          </Link>

          <Link
            to="/app/withdraw"
            className="p-5 rounded-2xl bg-card border border-border hover:border-amber-500/50 hover:shadow-md transition-all group flex flex-col items-center text-center gap-3 cursor-pointer"
          >
            <div className="h-12 w-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
              <ArrowUpCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="font-bold text-sm text-foreground">Rút tiền</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Về ngân hàng</p>
            </div>
          </Link>

          <Link
            to="/qr-login"
            className="p-5 rounded-2xl bg-card border border-border hover:border-sky-500/50 hover:shadow-md transition-all group flex flex-col items-center text-center gap-3 cursor-pointer"
          >
            <div className="h-12 w-12 rounded-2xl bg-sky-500/10 text-sky-600 flex items-center justify-center group-hover:scale-110 transition-transform shadow-xs">
              <QrCode className="h-6 w-6" />
            </div>
            <div>
              <p className="font-bold text-sm text-foreground">Quét QR</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Đăng nhập & Trả</p>
            </div>
          </Link>
        </div>
      </div>

      {/* 4. RECENT TRANSACTIONS & SERVICES ROW */}
      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* Danh sách biến động số dư gần đây (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <span>Giao dịch gần đây</span>
            </h2>
            <Button asChild variant="ghost" size="sm" className="text-xs text-primary font-semibold hover:text-primary">
              <Link to="/app/transactions" className="inline-flex items-center gap-1">
                <span>Xem tất cả</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          <Card className="shadow-sm border-border bg-card divide-y divide-border/60 overflow-hidden">
            {recentTransactions.map((tx) => (
              <div
                key={tx.id}
                className="p-4 sm:p-4.5 flex items-center justify-between gap-4 hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                      tx.type === 'INCOME'
                        ? 'bg-emerald-500/10 text-emerald-600'
                        : 'bg-primary/10 text-primary'
                    }`}
                  >
                    {tx.type === 'INCOME' ? (
                      <ArrowDownCircle className="h-5 w-5" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{tx.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{tx.time}</p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p
                    className={`text-sm font-bold tracking-tight ${
                      tx.type === 'INCOME' ? 'text-emerald-600' : 'text-foreground'
                    }`}
                  >
                    {tx.type === 'INCOME' ? '+' : '-'}
                    {formatVnd(tx.amount)}
                  </p>
                  <div className="flex items-center justify-end gap-1 text-[11px] text-emerald-600 font-medium mt-0.5">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Thành công</span>
                  </div>
                </div>
              </div>
            ))}
          </Card>
        </div>

        {/* Dịch vụ tiện ích & Bảo mật (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Tiện ích nổi bật */}
          <div className="space-y-3">
            <h2 className="text-base font-bold tracking-tight text-foreground flex items-center gap-2">
              <Receipt className="h-4 w-4 text-primary" />
              <span>Dịch vụ & Tiện ích</span>
            </h2>

            <Card className="shadow-sm border-border bg-card p-4 space-y-3">
              <Link
                to="/app/utilities"
                className="p-2.5 rounded-xl hover:bg-muted/60 transition-colors flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                    <Smartphone className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">Nạp tiền điện thoại</p>
                    <p className="text-[11px] text-muted-foreground">Chiết khấu đến 3%</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>

              <Link
                to="/app/utilities"
                className="p-2.5 rounded-xl hover:bg-muted/60 transition-colors flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-sky-500/10 text-sky-600 flex items-center justify-center">
                    <Receipt className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">Hóa đơn Điện & Nước</p>
                    <p className="text-[11px] text-muted-foreground">Tự động nhắc kỳ cước</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>
            </Card>
          </div>

          {/* Widget Cam kết Bảo mật */}
          <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 space-y-3 text-xs">
            <div className="flex items-center gap-2 font-bold text-primary">
              <ShieldCheck className="h-4 w-4" />
              <span>Bảo vệ kép FinVault</span>
            </div>
            <p className="text-muted-foreground leading-relaxed text-[11px]">
              Mọi giao dịch chuyển tiền đều được xác thực bằng mã PIN 6 số và khóa Idempotency chống lặp lệnh giao dịch.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage
