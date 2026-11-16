import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { toast } from 'sonner'
import {
  Wallet,
  QrCode,
  ShieldCheck,
  RefreshCw,
  Smartphone,
  Lock,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useAuthStore } from '@/features/auth/stores/useAuthStore'
import { authApi, type QrInitResponse } from '@/features/auth/api/auth.api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { errorCode, errorMessage } from '@/lib/apiResponse'

export function QrLoginPage() {
  const [qrData, setQrData] = useState<QrInitResponse | null>(null)
  const [countdown, setCountdown] = useState(120)
  const [isLoading, setIsLoading] = useState(true)
  const [isExpired, setIsExpired] = useState(false)
  const [isRejected, setIsRejected] = useState(false)
  const [initError, setInitError] = useState<string | null>(null)
  const { setSession } = useAuthStore()
  const navigate = useNavigate()
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const generation = useRef(0)

  // Ignore initialization responses belonging to an older or unmounted session.
  const initQrSession = useCallback(() => {
    const current = ++generation.current
    return authApi.initQrLogin()
      .then((res) => {
        if (current !== generation.current) return
        const expiresAt = Date.parse(res.expiresAt)
        if (!res.qrId || !res.nonce || !res.pollSecret || !Number.isFinite(expiresAt)) {
          setInitError('Phản hồi mã QR chưa hợp lệ. Vui lòng tạo lại mã.')
          return
        }
        setQrData(res)
        const remaining = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000))
        setCountdown(remaining)
        setIsExpired(remaining === 0)
      })
      .catch((error: unknown) => {
        if (current !== generation.current) return
        setInitError(errorMessage(errorCode(error) ? error : undefined))
      })
      .finally(() => {
        if (current === generation.current) setIsLoading(false)
      })
  }, [])

  const refreshQrSession = () => {
    if (pollingRef.current) clearInterval(pollingRef.current)
    pollingRef.current = null
    setQrData(null)
    setIsLoading(true)
    setIsExpired(false)
    setIsRejected(false)
    setInitError(null)
    void initQrSession()
  }

  // Initial loading state is declared above; state updates happen after the request.
  useEffect(() => {
    void initQrSession()
    return () => {
      generation.current += 1
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [initQrSession])

  // Recompute against the server deadline so delayed ticks cannot extend the QR lifetime.
  useEffect(() => {
    if (!qrData || isLoading || isExpired || isRejected) return
    const expiresAt = Date.parse(qrData.expiresAt)
    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000))
      setCountdown(remaining)
      if (remaining === 0) setIsExpired(true)
    }, 1000)

    return () => clearInterval(timer)
  }, [qrData, isLoading, isExpired, isRejected])

  // Polling kiểm tra trạng thái mã QR mỗi 2 giây
  useEffect(() => {
    if (!qrData || isLoading || isExpired || isRejected) {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
      return
    }

    const current = generation.current
    let cancelled = false
    let inFlight = false
    let terminal = false
    const pollStatus = async () => {
      if (cancelled || inFlight || terminal || current !== generation.current) return
      if (Date.now() >= Date.parse(qrData.expiresAt)) {
        terminal = true
        setIsExpired(true)
        return
      }
      inFlight = true
      try {
        const res = await authApi.getQrStatus(qrData.qrId, qrData.pollSecret)
        if (cancelled || current !== generation.current) return
        if (Date.now() >= Date.parse(qrData.expiresAt)) {
          terminal = true
          setIsExpired(true)
          return
        }
        if (res.status === 'APPROVED' && res.accessToken && res.user) {
          terminal = true
          if (pollingRef.current) clearInterval(pollingRef.current)
          setSession({
            accessToken: res.accessToken,
            user: res.user
          })
          toast.success('Đăng nhập bằng mã QR thành công!')
          const isRoleAdmin = res.user.role === 'ADMIN'
          navigate(isRoleAdmin ? '/admin' : '/app', { replace: true })
        } else if (res.status === 'REJECTED') {
          terminal = true
          if (pollingRef.current) clearInterval(pollingRef.current)
          setIsRejected(true)
          toast.error('Yêu cầu đăng nhập đã bị từ chối từ thiết bị.')
        }
      } catch (err: unknown) {
        if (cancelled || current !== generation.current) return
        if (errorCode(err) === 'QR_EXPIRED') {
          terminal = true
          if (pollingRef.current) clearInterval(pollingRef.current)
          setIsExpired(true)
        }
      } finally {
        inFlight = false
      }
    }

    pollingRef.current = setInterval(pollStatus, 2000)

    return () => {
      cancelled = true
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [qrData, isLoading, isExpired, isRejected, navigate, setSession])

  // Định dạng hiển thị phút:giây (01:59)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // Nội dung mã QR: chuẩn JSON chứa qrId và nonce để Mobile quét xác nhận
  const qrPayload = qrData ? JSON.stringify({ qrId: qrData.qrId, nonce: qrData.nonce }) : ''

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
          <div className="relative mx-auto w-64 h-64 p-4 bg-white rounded-2xl border-2 border-primary/20 shadow-inner flex flex-col items-center justify-center">
            {isLoading ? (
              /* Trạng thái đang tải mã QR từ backend */
              <div className="flex flex-col items-center justify-center p-4 text-center space-y-3">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
                <p className="text-xs text-slate-500 font-medium">Đang tạo mã QR bảo mật...</p>
              </div>
            ) : initError ? (
              <div className="flex flex-col items-center justify-center p-4 text-center space-y-3">
                <AlertCircle className="h-8 w-8 text-destructive" />
                <p role="alert" className="text-xs text-destructive">{initError}</p>
                <Button size="sm" onClick={refreshQrSession}>Thử tạo lại mã QR</Button>
              </div>
            ) : isExpired ? (
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
                  onClick={refreshQrSession}
                  className="gap-1.5 text-xs font-medium shadow-sm cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Làm mới mã QR</span>
                </Button>
              </div>
            ) : isRejected ? (
              /* Trạng thái bị từ chối từ điện thoại */
              <div className="flex flex-col items-center justify-center p-4 text-center space-y-3">
                <div className="h-12 w-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
                  <AlertCircle className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-800">Yêu cầu bị từ chối</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Thiết bị di động đã hủy phiên đăng nhập này</p>
                </div>
                <Button
                  size="sm"
                  onClick={refreshQrSession}
                  className="gap-1.5 text-xs font-medium shadow-sm cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Tạo mã QR khác</span>
                </Button>
              </div>
            ) : (
              /* Trạng thái mã QR đang hiệu lực (render thật bằng qrcode.react) */
              <div className="relative w-full h-full flex items-center justify-center">
                <QRCodeSVG
                  value={qrPayload}
                  size={200}
                  level="H"
                  includeMargin={false}
                />

                {/* Logo FinVault nổi bật ở trung tâm mã QR */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="h-9 w-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-md border-2 border-white">
                    <Wallet className="h-5 w-5" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bộ đếm thời gian */}
          {qrData && !isLoading && !isExpired && !isRejected && (
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
