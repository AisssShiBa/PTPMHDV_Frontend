import { useState } from 'react'
import {
  PlusCircle,
  ArrowLeftRight,
  Download,
  CreditCard,
  ShoppingCart,
  ArrowDownLeft,
  FileText,
  Utensils,
  Plane,
  TrendingUp
} from 'lucide-react'
import { useAuthStore } from '@/features/auth/stores/useAuthStore'

/* ─── Mock Activities Data ─────────────────────────────────────── */
const recentActivities = [
  {
    id: 'act-1',
    title: 'Thanh toán siêu thị',
    time: 'Hôm nay, 14:20',
    amount: '- ₫ 1,500,000',
    isPositive: false,
    status: 'Hoàn thành',
    statusType: 'success',
    icon: ShoppingCart
  },
  {
    id: 'act-2',
    title: 'Nhận lương tháng 10',
    time: 'Hôm qua, 09:00',
    amount: '+ ₫ 45,000,000',
    isPositive: true,
    status: 'Hoàn thành',
    statusType: 'success',
    icon: ArrowDownLeft
  },
  {
    id: 'act-3',
    title: 'Thanh toán hóa đơn điện',
    time: '20 Tháng 10, 10:15',
    amount: '- ₫ 850,000',
    isPositive: false,
    status: 'Đang xử lý',
    statusType: 'pending',
    icon: FileText
  },
  {
    id: 'act-4',
    title: 'Ăn tối nhà hàng',
    time: '19 Tháng 10, 19:45',
    amount: '- ₫ 2,200,000',
    isPositive: false,
    status: 'Hoàn thành',
    statusType: 'success',
    icon: Utensils
  },
  {
    id: 'act-5',
    title: 'Vé máy bay',
    time: '15 Tháng 10, 08:20',
    amount: '- ₫ 4,500,000',
    isPositive: false,
    status: 'Hoàn thành',
    statusType: 'success',
    icon: Plane
  }
]

/* ─── Cashflow Chart Bars Data ─────────────────────────────────── */
const cashflowData = [
  { income: 65, expense: 38 },
  { income: 85, expense: 50 },
  { income: 70, expense: 28 }
]

export default function Dashboard() {
  const user = useAuthStore((state) => state.user)
  const [] = useState<'all' | 'income' | 'expense'>('all')

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* ────────────────────────────────────────────────────────
          LEFT COLUMN: QUICK ACTIONS SIDEBAR
          ──────────────────────────────────────────────────────── */}
      <aside className="w-full lg:w-56 shrink-0 space-y-4">
        <div>
          <h2 className="text-sm font-bold text-primary tracking-tight">
            Quick Actions
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Manage Funds</p>
        </div>

        {/* Sidebar Vertical Action Buttons */}
        <div className="flex flex-row flex-wrap lg:flex-col gap-2">
          {/* Nạp tiền (Active highlight button) */}
          <button
            type="button"
            className="flex-1 lg:flex-none flex items-center gap-2.5 rounded-xl bg-primary px-4 py-2.5 text-xs sm:text-sm font-bold text-primary-foreground shadow-md shadow-primary/25 hover:bg-primary/90 transition-all active:scale-95"
          >
            <PlusCircle className="size-4" />
            <span>Nạp tiền</span>
          </button>

          {/* Chuyển khoản */}
          <button
            type="button"
            className="flex-1 lg:flex-none flex items-center gap-2.5 rounded-xl border border-border/60 bg-card/60 px-4 py-2.5 text-xs sm:text-sm font-medium text-foreground hover:bg-muted transition-all active:scale-95"
          >
            <ArrowLeftRight className="size-4 text-muted-foreground" />
            <span>Chuyển khoản</span>
          </button>

          {/* Rút tiền */}
          <button
            type="button"
            className="flex-1 lg:flex-none flex items-center gap-2.5 rounded-xl border border-border/60 bg-card/60 px-4 py-2.5 text-xs sm:text-sm font-medium text-foreground hover:bg-muted transition-all active:scale-95"
          >
            <Download className="size-4 text-muted-foreground" />
            <span>Rút tiền</span>
          </button>

          {/* Thanh toán */}
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
          RIGHT COLUMN: MAIN DASHBOARD AREA
          ──────────────────────────────────────────────────────── */}
      <main className="flex-1 space-y-6 min-w-0">
        {/* Page Title & Greeting */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
            Tổng quan tài chính
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Chào mừng trở lại{user?.firstName ? `, ${user.firstName}` : ''}, đây
            là tóm tắt tài khoản của bạn.
          </p>
        </div>

        {/* ── 1. Top Row: Violet Balance Card + 4 Shortcut Boxes ── */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Big Violet Balance Card */}
          <div className="md:col-span-7 rounded-2xl bg-linear-to-br from-violet-600 via-primary to-purple-800 p-6 text-white shadow-xl shadow-primary/20 flex flex-col justify-between">
            <div>
              <p className="text-xs font-semibold upbg-linear-to-brwider text-purple-200">
                Tổng số dư
              </p>
              <h2 className="text-2xl sm:text-4xl font-black tracking-tight mt-1">
                ₫ 1,245,000,000
              </h2>
            </div>

            <div className="mt-6 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-bold text-emerald-300 border border-emerald-400/30">
                <TrendingUp className="size-3" />
                +12.5%
              </span>
              <span className="text-xs text-purple-200">
                so với tháng trước
              </span>
            </div>
          </div>

          {/* 4 Quick Action Shortcuts 2x2 Grid */}
          <div className="md:col-span-5 grid grid-cols-2 gap-3">
            <button
              type="button"
              className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-border/60 bg-card/60 p-4 hover:bg-card hover:border-primary/40 transition-all group active:scale-95"
            >
              <div className="size-9 rounded-full bg-primary/15 text-primary flex items-center justify-center group-hover:scale-110 transition-transform">
                <PlusCircle className="size-4" />
              </div>
              <span className="text-xs font-semibold text-foreground">
                Nạp tiền
              </span>
            </button>

            <button
              type="button"
              className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-border/60 bg-card/60 p-4 hover:bg-card hover:border-primary/40 transition-all group active:scale-95"
            >
              <div className="size-9 rounded-full bg-muted text-muted-foreground flex items-center justify-center group-hover:scale-110 transition-transform">
                <ArrowLeftRight className="size-4" />
              </div>
              <span className="text-xs font-semibold text-foreground">
                Chuyển khoản
              </span>
            </button>

            <button
              type="button"
              className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-border/60 bg-card/60 p-4 hover:bg-card hover:border-primary/40 transition-all group active:scale-95"
            >
              <div className="size-9 rounded-full bg-muted text-muted-foreground flex items-center justify-center group-hover:scale-110 transition-transform">
                <Download className="size-4" />
              </div>
              <span className="text-xs font-semibold text-foreground">
                Rút tiền
              </span>
            </button>

            <button
              type="button"
              className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-border/60 bg-card/60 p-4 hover:bg-card hover:border-primary/40 transition-all group active:scale-95"
            >
              <div className="size-9 rounded-full bg-muted text-muted-foreground flex items-center justify-center group-hover:scale-110 transition-transform">
                <CreditCard className="size-4" />
              </div>
              <span className="text-xs font-semibold text-foreground">
                Thanh toán
              </span>
            </button>
          </div>
        </div>

        {/* ── 2. Middle Row: Cashflow Bar Chart & Expense Donut Chart ── */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Card: Dòng tiền (Dual Bar Chart) */}
          <div className="md:col-span-7 rounded-2xl border border-border/60 bg-card/80 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm sm:text-base font-bold text-foreground">
                Dòng tiền
              </h3>
              <button
                type="button"
                className="text-xs font-semibold text-primary hover:underline"
              >
                Chi tiết
              </button>
            </div>

            {/* Bars Illustration */}
            <div className="relative h-44 rounded-xl bg-muted/20 border border-border/40 p-4 flex flex-col justify-between">
              <div className="text-[10px] text-muted-foreground flex justify-between">
                <span>Max</span>
                <span>Tháng này</span>
              </div>

              {/* Bars Row */}
              <div className="flex items-end justify-around h-28 gap-4 px-2">
                {cashflowData.map((item, index) => (
                  <div key={index} className="flex items-end gap-1.5 h-full">
                    {/* Income bar (Cyan/Green) */}
                    <div
                      className="w-4 sm:w-6 rounded-t-sm bg-emerald-400/90 hover:bg-emerald-400 transition-all"
                      style={{ height: `${item.income}%` }}
                      title={`Thu nhập: ${item.income}%`}
                    />
                    {/* Expense bar (Violet) */}
                    <div
                      className="w-4 sm:w-6 rounded-t-sm bg-primary/90 hover:bg-primary transition-all"
                      style={{ height: `${item.expense}%` }}
                      title={`Chi phí: ${item.expense}%`}
                    />
                  </div>
                ))}
              </div>

              <div className="text-[10px] text-muted-foreground flex justify-between">
                <span>Min</span>
                <span>Kỳ báo cáo</span>
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground pt-1">
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-emerald-400" />
                <span>Thu nhập</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-sm bg-primary" />
                <span>Chi phí</span>
              </div>
            </div>
          </div>

          {/* Card: Phân tích chi tiêu (Expense Breakdown Donut) */}
          <div className="md:col-span-5 rounded-2xl border border-border/60 bg-card/80 p-5 shadow-sm space-y-4">
            <h3 className="text-sm sm:text-base font-bold text-foreground">
              Phân tích chi tiêu
            </h3>

            {/* Donut Chart with Center Total */}
            <div className="relative size-36 mx-auto flex items-center justify-center">
              <svg className="size-full -rotate-90" viewBox="0 0 36 36">
                {/* Background base circle */}
                <path
                  className="text-muted/40"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                {/* Shopping (45% - Cyan/Blue) */}
                <path
                  className="text-blue-500"
                  strokeDasharray="45, 100"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                {/* Food (30% - Green) */}
                <path
                  className="text-emerald-400"
                  strokeDasharray="30, 100"
                  strokeDashoffset="-45"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                {/* Services (25% - Violet) */}
                <path
                  className="text-primary"
                  strokeDasharray="25, 100"
                  strokeDashoffset="-75"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>

              {/* Center text */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] text-muted-foreground uppercase font-medium">
                  Tổng chi
                </span>
                <span className="text-base font-black text-foreground">
                  ₫ 45M
                </span>
              </div>
            </div>

            {/* Donut Legend */}
            <div className="space-y-2 pt-2 border-t border-border/40 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-blue-500" />
                  <span className="text-muted-foreground">Mua sắm</span>
                </div>
                <span className="font-bold text-foreground">45%</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-emerald-400" />
                  <span className="text-muted-foreground">Ăn uống</span>
                </div>
                <span className="font-bold text-foreground">30%</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-primary" />
                  <span className="text-muted-foreground">Dịch vụ</span>
                </div>
                <span className="font-bold text-foreground">25%</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── 3. Bottom Row: Hoạt động gần đây (Recent Activities) ── */}
        <div className="rounded-2xl border border-border/60 bg-card/80 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm sm:text-base font-bold text-foreground">
              Hoạt động gần đây
            </h3>
            <button
              type="button"
              className="text-xs font-semibold text-primary hover:underline"
            >
              Xem tất cả
            </button>
          </div>

          <div className="divide-y divide-border/40">
            {recentActivities.map((act) => {
              const Icon = act.icon
              return (
                <div
                  key={act.id}
                  className="flex items-center justify-between py-3 hover:bg-muted/30 px-2 rounded-xl transition-colors"
                >
                  {/* Left: Icon + Title + Time */}
                  <div className="flex items-center gap-3">
                    <div className="size-9 rounded-xl bg-muted flex items-center justify-center text-foreground shrink-0">
                      <Icon className="size-4" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-semibold text-foreground">
                        {act.title}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {act.time}
                      </p>
                    </div>
                  </div>

                  {/* Right: Amount + Status Badge */}
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs sm:text-sm font-bold tracking-tight ${
                        act.isPositive ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {act.amount}
                    </span>

                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        act.statusType === 'success'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                          : 'bg-blue-500/15 text-blue-400 border border-blue-500/20'
                      }`}
                    >
                      {act.status}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </main>
    </div>
  )
}
