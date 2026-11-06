import { Link } from 'react-router-dom'
import {
  Wallet,
  ShieldCheck,
  ArrowRightLeft,
  ArrowDownCircle,
  QrCode,
  ArrowUpCircle,
  Receipt,
  Lock,
  Clock,
  BookOpen,
  CheckCircle,
  ArrowRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/20">
      {/* 1. PUBLIC NAVBAR */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur px-4 sm:px-8 h-18 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-sm shadow-primary/20">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-primary block leading-none">FinVault</span>
            <span className="text-[11px] font-medium text-muted-foreground mt-0.5 block">
              Ví điện tử cá nhân
            </span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <a href="#tinh-nang" className="hover:text-primary transition-colors py-1">Tính năng</a>
          <a href="#bao-mat" className="hover:text-primary transition-colors py-1">Bảo mật</a>
          <a href="#han-muc" className="hover:text-primary transition-colors py-1">Hạn mức</a>
        </nav>

        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm" className="font-semibold text-foreground hover:text-primary">
            <Link to="/sign-in">Đăng nhập</Link>
          </Button>
          <Button asChild size="sm" className="shadow-sm shadow-primary/20 font-semibold">
            <Link to="/sign-up">Mở ví ngay</Link>
          </Button>
        </div>
      </header>

      {/* 2. HERO SECTION */}
      <section className="py-16 md:py-24 border-b border-border bg-surface-container-low/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6 text-left">
            <Badge variant="outline" className="border-primary/30 text-primary text-xs px-3 py-1 font-medium bg-primary/5">
              Hệ thống thanh toán số thông minh thế hệ mới
            </Badge>

            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
              Ví điện tử cá nhân, <br className="hidden sm:inline" />
              <span className="text-primary">mọi giao dịch đều có lớp bảo vệ thứ hai</span>
            </h1>

            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
              Nền tảng thanh toán số hiện đại: chuyển tiền P2P tức thì, kiểm soát số dư sổ cái minh bạch và bảo vệ tài khoản đa lớp bằng mã PIN bảo mật.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button asChild size="lg" className="shadow-md shadow-primary/20 font-semibold">
                <Link to="/sign-up" className="flex items-center gap-2">
                  <span>Mở tài khoản ngay</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="font-semibold">
                <Link to="/sign-in">Đăng nhập tài khoản</Link>
              </Button>
            </div>

            <div className="pt-4 flex items-center gap-6 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                <span>Miễn phí chuyển khoản</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                <span>Bảo mật kép với mã PIN</span>
              </div>
            </div>
          </div>

          {/* Hero Visual Mockup Card */}
          <div className="relative">
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-primary/20 to-secondary/20 blur-xl opacity-70" />
            <Card className="relative shadow-xl border-border bg-card">
              <CardHeader className="border-b border-border/50 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                      <Wallet className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold">Tài khoản ví chính</CardTitle>
                      <CardDescription className="text-xs">Chủ tài khoản: An Nguyễn</CardDescription>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs font-medium">Đã xác minh</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                <div>
                  <span className="text-xs text-muted-foreground font-medium">Số dư khả dụng</span>
                  <p className="text-3xl font-extrabold text-primary tracking-tight">1.250.000 ₫</p>
                  <p className="text-xs text-muted-foreground mt-1">Hạn mức còn lại hôm nay: 19.700.000 ₫ / 20.000.000 ₫</p>
                </div>

                <div className="grid grid-cols-4 gap-2 pt-2 text-center text-xs">
                  <Link to="/sign-in" className="p-2.5 rounded-lg bg-muted/60 hover:bg-muted transition-colors flex flex-col items-center gap-1.5 group">
                    <ArrowRightLeft className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                    <span className="font-medium">Chuyển tiền</span>
                  </Link>
                  <Link to="/sign-in" className="p-2.5 rounded-lg bg-muted/60 hover:bg-muted transition-colors flex flex-col items-center gap-1.5 group">
                    <ArrowDownCircle className="h-4 w-4 text-emerald-600 group-hover:scale-110 transition-transform" />
                    <span className="font-medium">Nạp tiền</span>
                  </Link>
                  <Link to="/sign-in" className="p-2.5 rounded-lg bg-muted/60 hover:bg-muted transition-colors flex flex-col items-center gap-1.5 group">
                    <ArrowUpCircle className="h-4 w-4 text-amber-600 group-hover:scale-110 transition-transform" />
                    <span className="font-medium">Rút tiền</span>
                  </Link>
                  <Link to="/qr-login" className="p-2.5 rounded-lg bg-muted/60 hover:bg-muted transition-colors flex flex-col items-center gap-1.5 group">
                    <QrCode className="h-4 w-4 text-secondary group-hover:scale-110 transition-transform" />
                    <span className="font-medium">QR Login</span>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* 3. FEATURES SECTION */}
      <section id="tinh-nang" className="py-20 border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Tính năng tài chính thiết yếu
            </h2>
            <p className="text-sm text-muted-foreground">
              Hệ thống cung cấp đầy đủ các tiện ích giao dịch cho một trải nghiệm thanh toán toàn diện.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary mb-2">
                  <ArrowRightLeft className="h-5 w-5" />
                </div>
                <CardTitle className="text-base font-semibold">Chuyển tiền P2P</CardTitle>
                <CardDescription className="text-xs">
                  Chuyển tiền tức thì theo số điện thoại hoặc mã tài khoản với luồng xác nhận mã PIN 3 bước an toàn.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 mb-2">
                  <ArrowDownCircle className="h-5 w-5" />
                </div>
                <CardTitle className="text-base font-semibold">Nạp tiền VNPAY</CardTitle>
                <CardDescription className="text-xs">
                  Nạp tiền nhanh chóng qua cổng thanh toán VNPAY, cập nhật số dư ví tức thì sau khi hoàn tất.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 mb-2">
                  <ArrowUpCircle className="h-5 w-5" />
                </div>
                <CardTitle className="text-base font-semibold">Rút tiền về ngân hàng</CardTitle>
                <CardDescription className="text-xs">
                  Rút số dư ví về tài khoản ngân hàng liên kết linh hoạt, ghi nhận lịch sử biến động sổ cái chính xác.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="h-10 w-10 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-600 mb-2">
                  <QrCode className="h-5 w-5" />
                </div>
                <CardTitle className="text-base font-semibold">Đăng nhập nhanh bằng mã QR</CardTitle>
                <CardDescription className="text-xs">
                  Quét mã QR từ điện thoại để xác thực đăng nhập máy tính tức thì mà không cần nhập lại mật khẩu.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 mb-2">
                  <Receipt className="h-5 w-5" />
                </div>
                <CardTitle className="text-base font-semibold">Thanh toán & Nạp điện thoại</CardTitle>
                <CardDescription className="text-xs">
                  Hỗ trợ tra cứu và thanh toán hóa đơn điện, nước, internet cùng dịch vụ nạp tiền điện thoại tiện lợi.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600 mb-2">
                  <BookOpen className="h-5 w-5" />
                </div>
                <CardTitle className="text-base font-semibold">Sổ cái kế toán ghi kép</CardTitle>
                <CardDescription className="text-xs">
                  Kiến trúc sổ cái chuẩn mực, đảm bảo mọi giao dịch đều cân bằng bút toán và minh bạch toàn vẹn số dư.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* 4. SECURITY SECTION */}
      <section id="bao-mat" className="py-20 border-b border-border bg-surface-container-low/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <Badge variant="outline" className="border-primary/30 text-primary text-xs font-medium">Bảo mật giao dịch</Badge>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Bảo vệ từng giao dịch bằng cơ chế kép
            </h2>
            <p className="text-sm text-muted-foreground">
              Thiết kế theo chuẩn an toàn bảo mật cho hệ thống ứng dụng tài chính phân tán.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-xl border border-border bg-card space-y-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Lock className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-base">Mã PIN 6 số</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Mọi lệnh chuyển tiền và rút tiền đều yêu cầu xác thực mã PIN. Khóa tài khoản tạm thời khi nhập sai quá số lần.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-border bg-card space-y-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Clock className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-base">Mã ủy quyền 60 giây</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Transaction Token chỉ có hiệu lực dùng một lần trong 60 giây sau khi xác thực PIN thành công.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-border bg-card space-y-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-base">Idempotency-Key</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Cơ chế chống lặp lệnh khi thao tác bấm đúp hoặc đường truyền chập chờn, loại bỏ rủi ro trừ tiền nhiều lần.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-border bg-card space-y-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <BookOpen className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-base">Sổ cái truy vết đầy đủ</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Lưu vết kiểm toán từng bút toán ghi nợ/ghi có, đồng bộ dữ liệu chuẩn chỉnh giữa các dịch vụ thanh toán.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. LIMITS SECTION (CHUẨN THEO BẢNG GHI ĐÈ PROMPT 0) */}
      <section id="han-muc" className="py-20 border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Hạn mức giao dịch theo cấp xác minh
            </h2>
            <p className="text-sm text-muted-foreground">
              Hạn mức giao dịch được phân tầng theo cấp độ xác thực tài khoản để đảm bảo an toàn tối đa.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Cấp 0 */}
            <Card className="border-border">
              <CardHeader className="text-center pb-4">
                <Badge variant="outline" className="w-fit mx-auto text-xs font-medium">Cấp 0</Badge>
                <CardTitle className="text-lg mt-2 font-semibold">Chưa xác minh</CardTitle>
                <CardDescription className="text-xs">Tài khoản mới đăng ký</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs pt-2">
                <div className="p-3 rounded-lg bg-muted/50 flex justify-between">
                  <span className="text-muted-foreground">Tối đa mỗi lần:</span>
                  <span className="font-semibold">200.000 ₫</span>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 flex justify-between">
                  <span className="text-muted-foreground">Tối đa mỗi ngày:</span>
                  <span className="font-semibold">500.000 ₫</span>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 flex justify-between">
                  <span className="text-muted-foreground">Tối đa mỗi tháng:</span>
                  <span className="font-semibold">2.000.000 ₫</span>
                </div>
              </CardContent>
            </Card>

            {/* Cấp 1 */}
            <Card className="border-primary shadow-md relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground text-xs px-3">Phổ biến</Badge>
              </div>
              <CardHeader className="text-center pb-4">
                <Badge variant="secondary" className="w-fit mx-auto text-xs font-medium">Cấp 1</Badge>
                <CardTitle className="text-lg mt-2 font-semibold">Đã duyệt CCCD</CardTitle>
                <CardDescription className="text-xs">Định danh thông tin cá nhân</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs pt-2">
                <div className="p-3 rounded-lg bg-primary/5 flex justify-between">
                  <span className="text-muted-foreground">Tối đa mỗi lần:</span>
                  <span className="font-semibold text-primary">10.000.000 ₫</span>
                </div>
                <div className="p-3 rounded-lg bg-primary/5 flex justify-between">
                  <span className="text-muted-foreground">Tối đa mỗi ngày:</span>
                  <span className="font-semibold text-primary">20.000.000 ₫</span>
                </div>
                <div className="p-3 rounded-lg bg-primary/5 flex justify-between">
                  <span className="text-muted-foreground">Tối đa mỗi tháng:</span>
                  <span className="font-semibold text-primary">100.000.000 ₫</span>
                </div>
              </CardContent>
            </Card>

            {/* Cấp 2 */}
            <Card className="border-border">
              <CardHeader className="text-center pb-4">
                <Badge variant="outline" className="w-fit mx-auto text-xs font-medium">Cấp 2</Badge>
                <CardTitle className="text-lg mt-2 font-semibold">Nâng cao</CardTitle>
                <CardDescription className="text-xs">Hạn mức giao dịch lớn</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs pt-2">
                <div className="p-3 rounded-lg bg-muted/50 flex justify-between">
                  <span className="text-muted-foreground">Tối đa mỗi lần:</span>
                  <span className="font-semibold">50.000.000 ₫</span>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 flex justify-between">
                  <span className="text-muted-foreground">Tối đa mỗi ngày:</span>
                  <span className="font-semibold">100.000.000 ₫</span>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 flex justify-between">
                  <span className="text-muted-foreground">Tối đa mỗi tháng:</span>
                  <span className="font-semibold">500.000.000 ₫</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* 6. CTA BANNER */}
      <section className="py-20 bg-primary text-primary-foreground text-center">
        <div className="max-w-4xl mx-auto px-4 space-y-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Sẵn sàng trải nghiệm ví điện tử FinVault?
          </h2>
          <p className="text-primary-foreground/80 max-w-xl mx-auto text-sm sm:text-base leading-relaxed">
            Mở tài khoản ngay hôm nay để quản lý dòng tiền cá nhân và thực hiện giao dịch thanh toán không giới hạn.
          </p>
          <div className="flex justify-center gap-4 pt-2">
            <Button asChild size="lg" variant="secondary" className="font-semibold shadow-md">
              <Link to="/sign-up">Đăng ký tài khoản</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="bg-transparent border-white/30 text-white hover:bg-white/10 font-semibold">
              <Link to="/sign-in">Đăng nhập</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* 7. CLEAN FOOTER */}
      <footer className="border-t border-border py-8 px-4 sm:px-8 bg-card text-center text-xs text-muted-foreground space-y-2">
        <p className="font-semibold text-foreground text-sm">FinVault – Nền tảng thanh toán số & Ví điện tử cá nhân</p>
        <p>© 2026 FinVault. Tất cả các quyền được bảo lưu.</p>
      </footer>
    </div>
  )
}

export default HomePage
