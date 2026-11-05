import { Outlet, Link } from 'react-router-dom'
import { Wallet, ShieldCheck, Zap, ArrowLeftRight } from 'lucide-react'

export function AuthLayout() {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-background text-foreground">
      <div className="flex-1 grid lg:grid-cols-2 min-h-screen">
        {/* Left Column: Branding & Overview */}
        <div className="hidden lg:flex flex-col justify-between p-12 bg-primary text-primary-foreground relative overflow-hidden">
          {/* Subtle Background Pattern */}
          <div className="absolute -right-20 -bottom-20 w-96 h-96 rounded-full bg-white/5 blur-3xl pointer-events-none" />
          <div className="absolute -left-20 -top-20 w-96 h-96 rounded-full bg-white/5 blur-3xl pointer-events-none" />

          {/* Brand Header */}
          <div className="relative z-10">
            <Link to="/" className="inline-flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-white backdrop-blur">
                <Wallet className="h-6 w-6" />
              </div>
              <div>
                <span className="text-2xl font-bold tracking-tight">FinVault</span>
                <span className="block text-xs text-white/70">Hệ thống ví điện tử mô phỏng</span>
              </div>
            </Link>
          </div>

          {/* Center Highlight */}
          <div className="relative z-10 max-w-md my-auto py-12">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-xs font-medium mb-6">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Đồ án học tập mô phỏng ví điện tử</span>
            </div>

            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl leading-tight">
              Quản lý tài chính cá nhân thông minh & an toàn
            </h2>

            <p className="mt-4 text-base text-white/80 leading-relaxed">
              Trải nghiệm các giao dịch chuyển tiền P2P, nạp tiền cổng thanh toán, thanh toán hóa đơn và quản lý hạn mức theo cấp độ KYC mô phỏng.
            </p>

            <div className="mt-8 space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-white/10 flex items-center justify-center text-white shrink-0">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold">Xác thực phân tầng & Mã PIN</h4>
                  <p className="text-xs text-white/70">Mã hóa xác thực và kiểm soát giao dịch qua mã PIN 6 số</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-white/10 flex items-center justify-center text-white shrink-0">
                  <ArrowLeftRight className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold">Chuyển tiền P2P tức thì</h4>
                  <p className="text-xs text-white/70">Cơ chế khóa Idempotency chống gửi trùng lặp giao dịch</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-white/10 flex items-center justify-center text-white shrink-0">
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold">Kiến trúc Microservices</h4>
                  <p className="text-xs text-white/70">Giao tiếp duy nhất qua API Gateway tại /api</p>
                </div>
              </div>
            </div>
          </div>

          {/* Disclaimer at bottom left */}
          <div className="relative z-10 text-xs text-white/60">
            <p>© 2026 FinVault. Đồ án học tập - Không phải dịch vụ tài chính thực tế.</p>
          </div>
        </div>

        {/* Right Column: Form Outlet */}
        <div className="flex flex-col justify-between p-6 sm:p-12 lg:p-16 overflow-y-auto">
          {/* Mobile Brand Header */}
          <div className="lg:hidden flex items-center justify-between mb-8">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
                <Wallet className="h-5 w-5" />
              </div>
              <span className="text-xl font-bold text-primary">FinVault</span>
            </Link>
            <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
              Mô phỏng
            </span>
          </div>

          <div className="flex-1 flex items-center justify-center my-auto w-full max-w-md mx-auto">
            <Outlet />
          </div>

          <div className="mt-8 text-center text-xs text-muted-foreground pt-4 border-t border-border/40">
            <p>FinVault là đồ án học tập mô phỏng ví điện tử, không phải dịch vụ tài chính thật.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuthLayout
