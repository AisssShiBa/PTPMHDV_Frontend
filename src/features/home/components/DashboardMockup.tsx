import { TrendingUp, Check, CreditCard } from 'lucide-react'

export function DashboardMockup() {
  return (
    <div className="relative w-full max-w-xl mx-auto lg:max-w-none">
      {/* Glow effect behind dashboard */}
      <div className="absolute -top-10 -right-10 size-72 rounded-full bg-primary/25 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 size-60 rounded-full bg-violet-600/15 blur-3xl pointer-events-none" />

      {/* Main Mockup Frame */}
      <div className="relative rounded-2xl border border-border/70 bg-card/95 p-4 sm:p-5 shadow-2xl backdrop-blur-xl transition-all hover:border-border">
        {/* Top App Bar inside mockup */}
        <div className="flex items-center justify-between border-b border-border/50 pb-3 mb-4 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-bold text-primary tracking-tight text-sm">
              FinVault
            </span>
            <div className="hidden sm:flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="text-foreground font-medium">Tổng quan</span>
              <span>•</span>
              <span>Danh mục</span>
              <span>•</span>
              <span>Giao dịch</span>
              <span>•</span>
              <span>Báo cáo</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
              AV
            </div>
            <span className="text-[11px] text-muted-foreground hidden sm:inline">
              Alexander V.
            </span>
          </div>
        </div>

        {/* Greeting */}
        <div className="mb-3">
          <p className="text-xs text-muted-foreground">Chào buổi sáng,</p>
          <h4 className="text-sm sm:text-base font-bold text-foreground">
            Alexander!
          </h4>
        </div>

        {/* Balance & Donut Chart Row */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 mb-4 items-center rounded-xl bg-muted/30 border border-border/40 p-3 sm:p-4">
          <div className="sm:col-span-7">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
              Tổng tài sản
            </p>
            <p className="text-xl sm:text-2xl font-black text-foreground tracking-tight mt-0.5">
              1,258,450,000.00{' '}
              <span className="text-xs font-semibold text-muted-foreground">
                VND
              </span>
            </p>
            <div className="flex items-center gap-1.5 mt-1 text-xs font-semibold text-emerald-400">
              <TrendingUp className="size-3.5" />
              <span>+385,950,000.00 VND</span>
              <span className="text-[10px] text-muted-foreground font-normal ml-1">
                (+14.2%)
              </span>
            </div>
          </div>

          {/* Mini Donut Chart visualization */}
          <div className="sm:col-span-5 flex items-center justify-start sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
            <div className="relative size-14 shrink-0">
              <svg className="size-full -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-muted/60"
                  strokeWidth="4"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-primary"
                  strokeDasharray="52, 100"
                  strokeWidth="4"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-emerald-400"
                  strokeDasharray="31, 100"
                  strokeDashoffset="-52"
                  strokeWidth="4"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-foreground">
                83%
              </div>
            </div>
            <div className="text-[10px] text-muted-foreground space-y-0.5">
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-primary" />
                <span>Cổ phiếu: 52%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-emerald-400" />
                <span>Tài sản số: 31%</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-muted-foreground/40" />
                <span>Tiền mặt: 17%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Small Metric Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          <div className="rounded-lg bg-muted/40 p-2 border border-border/30">
            <p className="text-[10px] text-muted-foreground truncate">
              Quản lý Tài chính
            </p>
            <p className="text-xs font-bold text-foreground mt-0.5">
              1,230,000 VND
            </p>
            <span className="text-[9px] text-emerald-400 font-semibold">
              +2% tuần này
            </span>
          </div>
          <div className="rounded-lg bg-muted/40 p-2 border border-border/30">
            <p className="text-[10px] text-muted-foreground truncate">
              Thẻ ghi nợ
            </p>
            <p className="text-xs font-bold text-foreground mt-0.5">
              385,150,000 VND
            </p>
            <span className="text-[9px] text-emerald-400 font-semibold">
              +12%
            </span>
          </div>
          <div className="rounded-lg bg-muted/40 p-2 border border-border/30">
            <p className="text-[10px] text-muted-foreground truncate">
              Bảo mật tài khoản
            </p>
            <p className="text-xs font-bold text-foreground mt-0.5">
              Xác thực 2FA
            </p>
            <span className="text-[9px] text-emerald-400 font-semibold">
              Đã kích hoạt
            </span>
          </div>
          <div className="rounded-lg bg-muted/40 p-2 border border-border/30">
            <p className="text-[10px] text-muted-foreground truncate">
              Hạn mức chuyển khoản
            </p>
            <p className="text-xs font-bold text-foreground mt-0.5">
              Không giới hạn
            </p>
            <span className="text-[9px] text-primary font-semibold">
              Cấp VIP 3
            </span>
          </div>
        </div>

        {/* Recent Transactions inside mockup */}
        <div className="rounded-xl bg-muted/20 border border-border/30 p-2.5 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground px-1">
            <span>Giao dịch gần đây</span>
            <span className="text-primary cursor-pointer hover:underline">
              Xem tất cả
            </span>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between rounded-lg bg-card/60 px-2.5 py-1.5 text-xs">
              <div className="flex items-center gap-2">
                <div className="size-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">
                  +
                </div>
                <div>
                  <p className="font-semibold text-foreground text-[11px]">
                    Lê Văn Thành (CK)
                  </p>
                  <p className="text-[9px] text-muted-foreground">
                    Thanh toán dịch vụ công nghệ
                  </p>
                </div>
              </div>
              <span className="font-bold text-emerald-400 text-xs">
                +15,200,000 VND
              </span>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-card/60 px-2.5 py-1.5 text-xs">
              <div className="flex items-center gap-2">
                <div className="size-5 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-[10px]">
                  <CreditCard className="size-3" />
                </div>
                <div>
                  <p className="font-semibold text-foreground text-[11px]">
                    Thanh toán thẻ VISA
                  </p>
                  <p className="text-[9px] text-muted-foreground">
                    Chi tiêu trực tuyến quốc tế
                  </p>
                </div>
              </div>
              <span className="font-bold text-muted-foreground text-xs">
                -850,000 VND
              </span>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-card/60 px-2.5 py-1.5 text-xs">
              <div className="flex items-center gap-2">
                <div className="size-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">
                  +
                </div>
                <div>
                  <p className="font-semibold text-foreground text-[11px]">
                    Lãi tiết kiệm tự động
                  </p>
                  <p className="text-[9px] text-muted-foreground">
                    Kỳ hạn 3 tháng linh hoạt
                  </p>
                </div>
              </div>
              <span className="font-bold text-emerald-400 text-xs">
                +22,500,000 VND
              </span>
            </div>
          </div>
        </div>

        {/* Floating Success Pill Banner at bottom of mockup */}
        <div className="mt-3 flex items-center justify-between rounded-xl bg-emerald-950/40 border border-emerald-500/30 p-2.5 shadow-lg">
          <div className="flex items-center gap-2.5">
            <div className="size-7 rounded-full bg-emerald-500 flex items-center justify-center text-black font-bold shadow-md shadow-emerald-500/30">
              <Check className="size-4 stroke-3" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">
                Giao dịch thành công
              </p>
              <p className="text-[10px] text-muted-foreground">
                Chuyển khoản quốc tế tức thì
              </p>
            </div>
          </div>
          <span className="text-sm sm:text-base font-black text-emerald-400 tracking-tight">
            +$2.4M
          </span>
        </div>
      </div>
    </div>
  )
}
