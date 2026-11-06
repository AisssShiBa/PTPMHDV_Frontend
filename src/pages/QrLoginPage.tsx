import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Wallet,
  QrCode,
  ShieldCheck,
  RefreshCw,
  Smartphone,
  ArrowRight,
  Lock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import { useAuthStore } from '@/features/auth/stores/useAuthStore'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export function QrLoginPage() {
  const [countdown, setCountdown] = useState(180)
  const [isExpired, setIsExpired] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const { signIn } = useAuthStore()
  const navigate = useNavigate()

  // Bộ đếm thời gian hiệu lực của mã QR (180 giây)
  useEffect(() => {
    if (countdown <= 0) {
      setIsExpired(true)
      return
    }

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [countdown])

  // Hàm làm mới mã QR
  const handleRefreshQr = () => {
    setCountdown(180)
    setIsExpired(false)
    toast.info('Đã tạo mã QR đăng nhập mới')
  }

  // Giả lập quét QR thành công từ ứng dụng di động
  const handleSimulateScanSuccess = async () => {
    setIsScanning(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 800))
      const success = await signIn('annguyen', '123456')
      if (success) {
        toast.success('Xác nhận đăng nhập từ điện thoại thành công!')
        navigate('/app', { replace: true })
      }
    } finally {
      setIsScanning(false)
    }
  }

  // Định dạng hiển thị phút:giây (02:45)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      {/* Brand & Heading */}
      <div className="text-center space-y-2">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-1 border border-primary/20 shadow-sm">
          <QrCode className="h-6 w-6" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Đăng nhập bằng mã QR
        </h1>
        <p className="text-sm text-muted-foreground">
          Xác thực an toàn tức thì từ ứng dụng FinVault trên điện thoại
        </p>
      </div>

      <Card className="shadow-lg border-border bg-card overflow-hidden">
        <CardContent className="pt-6 space-y-5 text-center">
          {/* Badge trạng thái bảo mật */}
          <div className="flex justify-center">
            <Badge
              variant="outline"
              className="border-primary/30 text-primary bg-primary/5 px-3 py-1 font-medium gap-1.5 text-xs"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Bảo mật không dùng mật khẩu</span>
            </Badge>
          </div>

          {/* Khung hiển thị Mã QR */}
          <div className="relative mx-auto w-60 h-60 p-4 bg-white rounded-2xl border-2 border-primary/20 shadow-inner flex flex-col items-center justify-center">
            {isExpired ? (
              /* Trạng thái mã QR hết hạn */
              <div className="flex flex-col items-center justify-center p-4 text-center space-y-3">
                <div className="h-12 w-12 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <AlertCircle className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-800">Mã QR đã hết hạn</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Vui lòng bấm nút bên dưới để tạo mã mới</p>
                </div>
                <Button
                  size="sm"
                  onClick={handleRefreshQr}
                  className="gap-1.5 text-xs font-medium shadow-sm"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Làm mới mã QR</span>
                </Button>
              </div>
            ) : (
              /* Trạng thái mã QR đang hiệu lực */
              <div className="relative w-full h-full flex items-center justify-center">
                <svg className="w-full h-full text-slate-800" fill="currentColor" viewBox="0 0 100 100">
                  {/* Top-Left Finder */}
                  <rect fill="none" height="28" rx="4" stroke="currentColor" strokeWidth="4" width="28" x="5" y="5" />
                  <rect fill="currentColor" height="16" rx="2" width="16" x="11" y="11" />
                  {/* Top-Right Finder */}
                  <rect fill="none" height="28" rx="4" stroke="currentColor" strokeWidth="4" width="28" x="67" y="5" />
                  <rect fill="currentColor" height="16" rx="2" width="16" x="73" y="11" />
                  {/* Bottom-Left Finder */}
                  <rect fill="none" height="28" rx="4" stroke="currentColor" strokeWidth="4" width="28" x="5" y="67" />
                  <rect fill="currentColor" height="16" rx="2" width="16" x="11" y="73" />
                  {/* Alignment */}
                  <rect fill="none" height="16" rx="2" stroke="currentColor" strokeWidth="3" width="16" x="71" y="71" />
                  <rect fill="currentColor" height="6" width="6" x="76" y="76" />
                  {/* Pattern data bits */}
                  <rect height="5" rx="1" width="5" x="38" y="8" />
                  <rect height="5" rx="1" width="5" x="47" y="8" />
                  <rect height="5" rx="1" width="5" x="56" y="8" />
                  <rect height="5" rx="1" width="5" x="38" y="18" />
                  <rect height="5" rx="1" width="5" x="56" y="18" />
                  <rect height="5" rx="1" width="5" x="38" y="27" />
                  <rect height="5" rx="1" width="5" x="47" y="27" />
                  <rect height="5" rx="1" width="5" x="56" y="27" />
                  <rect height="5" rx="1" width="5" x="8" y="38" />
                  <rect height="5" rx="1" width="5" x="18" y="38" />
                  <rect height="5" rx="1" width="5" x="27" y="38" />
                  <rect height="5" rx="1" width="5" x="67" y="38" />
                  <rect height="5" rx="1" width="5" x="77" y="38" />
                  <rect height="5" rx="1" width="5" x="87" y="38" />
                  <rect height="5" rx="1" width="5" x="38" y="47" />
                  <rect height="5" rx="1" width="5" x="47" y="47" />
                  <rect height="5" rx="1" width="5" x="56" y="47" />
                  <rect height="5" rx="1" width="5" x="67" y="47" />
                  <rect height="5" rx="1" width="5" x="38" y="56" />
                  <rect height="5" rx="1" width="5" x="47" y="56" />
                  <rect height="5" rx="1" width="5" x="56" y="56" />
                  <rect height="5" rx="1" width="5" x="77" y="56" />
                  <rect height="5" rx="1" width="5" x="38" y="67" />
                  <rect height="5" rx="1" width="5" x="47" y="67" />
                  <rect height="5" rx="1" width="5" x="56" y="67" />
                  <rect height="5" rx="1" width="5" x="87" y="67" />
                  <rect height="5" rx="1" width="5" x="47" y="77" />
                  <rect height="5" rx="1" width="5" x="67" y="77" />
                  <rect height="5" rx="1" width="5" x="38" y="87" />
                  <rect height="5" rx="1" width="5" x="56" y="87" />
                </svg>

                {/* Logo FinVault nổi bật ở trung tâm */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg border-2 border-white">
                    <Wallet className="h-5 w-5" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bộ đếm thời gian */}
          {!isExpired && (
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-primary" />
              <span>
                Mã QR có hiệu lực trong{' '}
                <strong className="text-foreground font-semibold">{formatTime(countdown)}</strong>
              </span>
            </div>
          )}

          {/* Hướng dẫn 3 bước thao tác */}
          <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60 text-left space-y-2 text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-foreground">
              <Smartphone className="h-4 w-4 text-primary" />
              <span>Cách thức đăng nhập:</span>
            </div>
            <ol className="space-y-1.5 text-muted-foreground list-decimal list-inside pl-1 text-[11px] leading-relaxed">
              <li>Mở ứng dụng <strong className="text-foreground font-medium">FinVault</strong> trên điện thoại.</li>
              <li>Chọn biểu tượng <strong className="text-foreground font-medium">Quét mã</strong> ở góc trên màn hình.</li>
              <li>Hướng camera vào mã QR và bấm <strong className="text-foreground font-medium">Xác nhận đăng nhập</strong>.</li>
            </ol>
          </div>

          {/* Nút mô phỏng xác nhận quét thành công */}
          <Button
            type="button"
            className="w-full font-semibold shadow-md shadow-primary/20"
            size="lg"
            onClick={handleSimulateScanSuccess}
            loading={isScanning}
            disabled={isExpired}
          >
            <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-400" />
            <span>Xác nhận đã quét trên điện thoại</span>
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>

          {/* Nút chuyển sang Đăng nhập Mật khẩu */}
          <div className="pt-1">
            <Button asChild variant="outline" size="sm" className="w-full text-xs font-semibold">
              <Link to="/sign-in" className="flex items-center justify-center gap-1.5">
                <Lock className="h-3.5 w-3.5" />
                <span>Đăng nhập bằng Mật khẩu</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Link dẫn sang Đăng ký */}
      <div className="text-center text-sm text-muted-foreground">
        <span>Chưa có tài khoản FinVault? </span>
        <Link
          to="/sign-up"
          className="font-semibold text-primary hover:underline inline-flex items-center gap-0.5"
        >
          <span>Mở ví số ngay</span>
        </Link>
      </div>
    </div>
  )
}

export default QrLoginPage
