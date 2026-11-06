import { Link } from 'react-router-dom'
import { ArrowRight, Sparkles } from 'lucide-react'
import { DashboardMockup } from './DashboardMockup'

export function HeroSection() {
  return (
    <section className="relative pt-4 sm:pt-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left Column: Heading, Pitch, and Call-to-action */}
        <div className="lg:col-span-6 space-y-6">
          {/* Pill Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
            <Sparkles className="size-3 text-primary animate-pulse" />
            <span className="tracking-wide uppercase text-[11px]">
              Tài chính doanh nghiệp đỉnh cao
            </span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] font-black tracking-tight text-foreground leading-[1.15]">
            Quản lý tài sản số với độ{' '}
            <span className="text-primary bg-linear-to-r from-violet-400 via-primary to-purple-300 bg-clip-text">
              chính xác tuyệt đối
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed max-w-xl">
            Ví tiền kỹ thuật số cấp độ tổ chức dành riêng cho giới tinh hoa. Bảo
            mật đa lớp, giao dịch siêu tốc và khả năng kiểm soát tài sản toàn
            diện trên phạm vi toàn cầu.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link
              to="/signup"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/30 hover:bg-primary/90 hover:shadow-primary/40 active:scale-95 transition-all"
            >
              Mở tài khoản ngay
              <ArrowRight className="size-4" />
            </Link>

            <a
              href="#sponsors"
              className="inline-flex items-center justify-center rounded-xl border border-border/80 bg-card/60 px-6 py-3 text-sm font-semibold text-foreground hover:bg-muted/70 hover:border-border active:scale-95 transition-all"
            >
              Liên hệ tư vấn viên
            </a>
          </div>
        </div>

        {/* Right Column: Interactive Mockup Dashboard */}
        <div className="lg:col-span-6">
          <DashboardMockup />
        </div>
      </div>
    </section>
  )
}
