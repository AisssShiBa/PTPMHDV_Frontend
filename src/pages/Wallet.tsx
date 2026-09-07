import { useState } from 'react'
import {
  Plus,
  PlusCircle,
  ArrowLeftRight,
  Download,
  CreditCard,
  Wifi,
  Key,
  Building2,
  ChevronRight,
  Globe,
  DollarSign,
  Lock,
  AlertCircle
} from 'lucide-react'
import { useAuthStore } from '@/features/auth/stores/useAuthStore'

export default function Wallet() {
  const user = useAuthStore((state) => state.user)
  const fullName =
    `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'NGUYEN VAN A'

  // State cho các công tắc Cài đặt thẻ
  const [onlinePay, setOnlinePay] = useState(true)
  const [lockCard, setLockCard] = useState(false)

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* ────────────────────────────────────────────────────────
          LEFT SIDEBAR: QUICK ACTIONS
          ──────────────────────────────────────────────────────── */}
      <aside className="w-full lg:w-52 shrink-0 space-y-4">
        <div>
          <h2 className="text-sm font-bold text-primary tracking-tight">
            FinVault Admin
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Manage Funds</p>
        </div>

        <div className="flex flex-row flex-wrap lg:flex-col gap-2">
          <button
            type="button"
            className="flex-1 lg:flex-none flex items-center gap-2.5 rounded-xl border border-border/60 bg-card/60 px-4 py-2.5 text-xs sm:text-sm font-medium text-foreground hover:bg-muted transition-all active:scale-95"
          >
            <PlusCircle className="size-4 text-muted-foreground" />
            <span>Nạp tiền</span>
          </button>

          <button
            type="button"
            className="flex-1 lg:flex-none flex items-center gap-2.5 rounded-xl border border-border/60 bg-card/60 px-4 py-2.5 text-xs sm:text-sm font-medium text-foreground hover:bg-muted transition-all active:scale-95"
          >
            <ArrowLeftRight className="size-4 text-muted-foreground" />
            <span>Chuyển khoản</span>
          </button>

          <button
            type="button"
            className="flex-1 lg:flex-none flex items-center gap-2.5 rounded-xl border border-border/60 bg-card/60 px-4 py-2.5 text-xs sm:text-sm font-medium text-foreground hover:bg-muted transition-all active:scale-95"
          >
            <Download className="size-4 text-muted-foreground" />
            <span>Rút tiền</span>
          </button>

          <button
            type="button"
            className="flex-1 lg:flex-none flex items-center gap-2.5 rounded-xl border border-border/60 bg-card/60 px-4 py-2.5 text-xs sm:text-sm font-medium text-foreground hover:bg-muted transition-all active:scale-95"
          >
            <CreditCard className="size-4 text-muted-foreground" />
            <span>Thanh toán</span>
          </button>
        </div>
      </aside>

      {/* ────────────────────────────────────────────────────────
          MAIN CONTENT AREA
          ──────────────────────────────────────────────────────── */}
      <main className="flex-1 space-y-6 min-w-0">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              Ví & Thẻ của tôi
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Quản lý thẻ, tài khoản liên kết và hạn mức chi tiêu.
            </p>
          </div>

          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs sm:text-sm font-bold text-primary-foreground shadow-md shadow-primary/25 hover:bg-primary/90 transition-all active:scale-95"
          >
            <Plus className="size-4" />
            <span>Thêm thẻ mới</span>
          </button>
        </div>

        {/* ── ROW 1: Active Cards + Spending Limits ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Active Cards Box */}
          <div className="lg:col-span-8 rounded-2xl border border-border/60 bg-card/80 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm sm:text-base font-bold text-foreground">
                Thẻ Đang Hoạt Động
              </h3>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                2 Thẻ
              </span>
            </div>

            {/* Credit Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Card 1: Dark FinVault Business */}
              <div className="relative rounded-2xl bg-linear-to-br from-neutral-900 via-neutral-950 to-neutral-900 p-5 text-white border border-neutral-800 shadow-xl flex flex-col justify-between h-44 overflow-hidden">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-bold tracking-tight text-neutral-300">
                    FinVault Business
                  </span>
                  <Wifi className="size-4 text-neutral-400 rotate-90" />
                </div>

                <div className="space-y-1">
                  <p className="text-xs text-neutral-500 tracking-widest">
                    •••• •••• ••••
                  </p>
                  <p className="text-lg font-mono font-bold tracking-widest">
                    4289
                  </p>
                </div>

                <div className="flex justify-between items-end text-[11px] font-mono">
                  <span className="uppercase truncate max-w-30">
                    {fullName}
                  </span>
                  <span className="text-neutral-400">12/25</span>
                </div>
              </div>

              {/* Card 2: Purple Virtual Debit */}
              <div className="relative rounded-2xl bg-linear-to-br from-violet-600 via-primary to-purple-800 p-5 text-white border border-primary/40 shadow-xl shadow-primary/10 flex flex-col justify-between h-44 overflow-hidden">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold tracking-tight">
                      Virtual Debit
                    </span>
                    <span className="text-[9px] font-extrabold uppercase bg-white/20 px-1.5 py-0.5 rounded text-white tracking-wider">
                      VIRTUAL
                    </span>
                  </div>
                  <Key className="size-4 text-purple-200" />
                </div>

                <div className="space-y-1">
                  <p className="text-xs text-purple-200/60 tracking-widest">
                    •••• •••• ••••
                  </p>
                  <p className="text-lg font-mono font-bold tracking-widest">
                    9012
                  </p>
                </div>

                <div className="flex justify-between items-end text-[11px] font-mono">
                  <span className="uppercase truncate max-w-30">
                    {fullName}
                  </span>
                  <span className="text-purple-200">08/26</span>
                </div>
              </div>
            </div>
          </div>

          {/* Spending Limit Box */}
          <div className="lg:col-span-4 rounded-2xl border border-border/60 bg-card/80 p-5 shadow-sm space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <h3 className="text-sm sm:text-base font-bold text-foreground">
                Hạn Mức Chi Tiêu
              </h3>

              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">
                    Đã chi tiêu (Tháng này)
                  </span>
                  <span className="font-bold text-foreground">
                    12.500.000 ₫
                  </span>
                </div>
                {/* Progress bar */}
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: '62%' }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-muted-foreground pt-0.5">
                  <span>0 ₫</span>
                  <span>20.000.000 ₫</span>
                </div>
              </div>
            </div>

            {/* Warning Alert Pill */}
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 flex items-start gap-2.5">
              <AlertCircle className="size-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-xs">
                <p className="font-bold text-amber-500">Sắp đạt giới hạn</p>
                <p className="text-muted-foreground mt-0.5 leading-snug text-[11px]">
                  Bạn đã sử dụng 62% hạn mức của thẻ FinVault Business.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ── ROW 2: Linked Accounts + Card Settings ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Linked Bank Accounts */}
          <div className="lg:col-span-6 rounded-2xl border border-border/60 bg-card/80 p-5 shadow-sm space-y-4">
            <h3 className="text-sm sm:text-base font-bold text-foreground">
              Tài Khoản Liên Kết
            </h3>

            <div className="space-y-3">
              {/* Vietcombank Item */}
              <div className="flex items-center justify-between rounded-xl border border-border/50 bg-background/50 p-3 hover:border-primary/40 transition-colors cursor-pointer group">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-xs text-white">
                    VCB
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">
                      Vietcombank
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      •••• 5678
                    </p>
                  </div>
                </div>
                <ChevronRight className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>

              {/* Techcombank Item */}
              <div className="flex items-center justify-between rounded-xl border border-border/50 bg-background/50 p-3 hover:border-primary/40 transition-colors cursor-pointer group">
                <div className="flex items-center gap-3">
                  <div className="size-10 rounded-lg bg-red-600 flex items-center justify-center font-bold text-xs text-white">
                    TCB
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground">
                      Techcombank
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      •••• 1234
                    </p>
                  </div>
                </div>
                <ChevronRight className="size-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>

              {/* Link new account button */}
              <button
                type="button"
                className="w-full py-2.5 text-xs font-semibold text-primary hover:underline flex items-center justify-center gap-1.5"
              >
                <Building2 className="size-3.5" />
                <span>Liên kết tài khoản khác</span>
              </button>
            </div>
          </div>

          {/* Card Settings */}
          <div className="lg:col-span-6 rounded-2xl border border-border/60 bg-card/80 p-5 shadow-sm space-y-4">
            <h3 className="text-sm sm:text-base font-bold text-foreground">
              Cài Đặt Thẻ (Business)
            </h3>

            <div className="space-y-3">
              {/* Toggle 1: Online Payment */}
              <div className="flex items-center justify-between p-2 rounded-xl hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
                    <Globe className="size-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">
                      Thanh toán trực tuyến
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Cho phép giao dịch online
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setOnlinePay(!onlinePay)}
                  className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                    onlinePay
                      ? 'bg-primary justify-end'
                      : 'bg-muted justify-start'
                  }`}
                >
                  <span className="size-4 rounded-full bg-white shadow-sm" />
                </button>
              </div>

              {/* Setting 2: ATM Withdrawal Limit */}
              <div className="flex items-center justify-between p-2 rounded-xl hover:bg-muted/30 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-xl bg-muted flex items-center justify-center text-muted-foreground">
                    <DollarSign className="size-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">
                      Giới hạn rút tiền ATM
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      5.000.000 ₫ / ngày
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>

              {/* Toggle 3: Temporary Lock */}
              <div className="flex items-center justify-between p-2 rounded-xl hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="size-9 rounded-xl bg-destructive/10 flex items-center justify-center text-destructive">
                    <Lock className="size-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">
                      Khóa thẻ tạm thời
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      Ngăn chặn mọi giao dịch
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setLockCard(!lockCard)}
                  className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors ${
                    lockCard
                      ? 'bg-destructive justify-end'
                      : 'bg-muted justify-start'
                  }`}
                >
                  <span className="size-4 rounded-full bg-white shadow-sm" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
