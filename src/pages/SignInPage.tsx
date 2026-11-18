import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import {
  Wallet,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  QrCode,
  ShieldCheck,
  RefreshCw,
  Sparkles
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { useAuthStore } from '@/features/auth/stores/useAuthStore'
import { authApi, type QrInitResponse } from '@/features/auth/api/auth.api'
import { loginSchema } from '@/features/auth/schemas/auth.schema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { errorCode, errorMessage } from '@/lib/apiResponse'

export function SignInPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [activeTab, setActiveTab] = useState<'password' | 'qr'>('password')
  const { signIn, loading, setSession } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  const state: unknown = location.state
  const requestedPath = state && typeof state === 'object' && 'from' in state ? state.from : undefined
  const from = typeof requestedPath === 'string' && requestedPath.startsWith('/')
    && !requestedPath.startsWith('//') && !requestedPath.includes('\\')
    && Array.from(requestedPath).every((character) => character.charCodeAt(0) >= 32)
    ? requestedPath : '/app'

  // State cho luồng Mã QR thật ngay trên Tab
  const [qrData, setQrData] = useState<QrInitResponse | null>(null)
  const [qrCountdown, setQrCountdown] = useState(120)
  const [isQrLoading, setIsQrLoading] = useState(false)
  const [isQrExpired, setIsQrExpired] = useState(false)
  const [isQrRejected, setIsQrRejected] = useState(false)
  const [qrError, setQrError] = useState<string | null>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const qrGeneration = useRef(0)

  // Resolve only the QR request belonging to the currently selected tab/session.
  const initQrSession = useCallback(() => {
    const current = ++qrGeneration.current
    return authApi.initQrLogin()
      .then((res) => {
        if (current !== qrGeneration.current) return
        const expiresAt = Date.parse(res.expiresAt)
        if (!res.qrId || !res.nonce || !res.pollSecret || !Number.isFinite(expiresAt)) {
          setQrError('Phản hồi mã QR chưa hợp lệ. Vui lòng tạo lại mã.')
          return
        }
        setQrData(res)
        const remaining = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000))
        setQrCountdown(remaining)
        setIsQrExpired(remaining === 0)
      })
      .catch((error: unknown) => {
        if (current !== qrGeneration.current) return
        setQrError(errorMessage(errorCode(error) ? error : undefined))
      })
      .finally(() => {
        if (current === qrGeneration.current) setIsQrLoading(false)
      })
  }, [])

  const resetQrSession = (isLoading: boolean) => {
    qrGeneration.current += 1
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
    setQrData(null)
    setIsQrLoading(isLoading)
    setIsQrExpired(false)
    setIsQrRejected(false)
    setQrError(null)
  }

  const changeTab = (value: string) => {
    if ((value !== 'password' && value !== 'qr') || value === activeTab || loading) return
    resetQrSession(value === 'qr')
    setActiveTab(value)
  }

  const refreshQrSession = () => {
    resetQrSession(true)
    void initQrSession()
  }

  // Loading is set by the tab event; the effect only starts the asynchronous request.
  useEffect(() => {
    if (activeTab !== 'qr') return
    void initQrSession()
    return () => {
      qrGeneration.current += 1
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [activeTab, initQrSession])

  // Use the server deadline instead of decrementing an assumed 120-second lifetime.
  useEffect(() => {
    if (activeTab !== 'qr' || !qrData || isQrLoading || isQrExpired || isQrRejected) return
    const expiresAt = Date.parse(qrData.expiresAt)
    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000))
      setQrCountdown(remaining)
      if (remaining === 0) setIsQrExpired(true)
    }, 1000)

    return () => clearInterval(timer)
  }, [activeTab, qrData, isQrLoading, isQrExpired, isQrRejected])

  // Polling kiểm tra trạng thái duyệt mã QR mỗi 2 giây
  useEffect(() => {
    if (activeTab !== 'qr' || !qrData || isQrLoading || isQrExpired || isQrRejected) {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
      return
    }

    const current = qrGeneration.current
    let cancelled = false
    let inFlight = false
    let terminal = false
    const pollStatus = async () => {
      if (cancelled || inFlight || terminal || current !== qrGeneration.current) return
      if (Date.now() >= Date.parse(qrData.expiresAt)) {
        terminal = true
        setIsQrExpired(true)
        return
      }
      inFlight = true
      try {
        const res = await authApi.getQrStatus(qrData.qrId, qrData.pollSecret)
        if (cancelled || current !== qrGeneration.current) return
        if (Date.now() >= Date.parse(qrData.expiresAt)) {
          terminal = true
          setIsQrExpired(true)
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
          navigate(isRoleAdmin ? '/admin' : from, { replace: true })
        } else if (res.status === 'REJECTED') {
          terminal = true
          if (pollingRef.current) clearInterval(pollingRef.current)
          setIsQrRejected(true)
          toast.error('Yêu cầu đăng nhập đã bị từ chối từ điện thoại.')
        }
      } catch (err: unknown) {
        if (cancelled || current !== qrGeneration.current) return
        if (errorCode(err) === 'QR_EXPIRED') {
          terminal = true
          if (pollingRef.current) clearInterval(pollingRef.current)
          setIsQrExpired(true)
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
  }, [activeTab, qrData, isQrLoading, isQrExpired, isQrRejected, from, navigate, setSession])

  // Định dạng hiển thị phút:giây (01:59)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const qrPayload = qrData ? JSON.stringify({ qrId: qrData.qrId, nonce: qrData.nonce }) : ''

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<{ username: string; password: string }>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: '',
      password: ''
    }
  })

  // Xử lý gửi biểu mẫu đăng nhập
  const onSubmit = async (data: { username: string; password: string }) => {
    const success = await signIn(data.username, data.password)
    if (success) {
      const user = useAuthStore.getState().user
      const isRoleAdmin = user?.role === 'ADMIN'
      navigate(isRoleAdmin ? '/admin' : from, { replace: true })
    }
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      {/* Brand & Heading */}
      <div className="text-center space-y-2">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-1 border border-primary/20 shadow-sm">
          <Wallet className="h-6 w-6" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Chào mừng trở lại
        </h1>
        <p className="text-sm text-muted-foreground">
          Đăng nhập vào FinVault để quản lý tài chính cá nhân an toàn
        </p>
      </div>

      <Card className="shadow-lg border-border bg-card">
        <CardContent className="pt-6">
          <Tabs
            value={activeTab}
            onValueChange={changeTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="password" disabled={loading} className="text-xs sm:text-sm font-semibold">
                Mật khẩu
              </TabsTrigger>
              <TabsTrigger value="qr" disabled={loading} className="text-xs sm:text-sm font-semibold flex items-center gap-1.5">
                <QrCode className="h-4 w-4" />
                <span>Mã QR</span>
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: ĐĂNG NHẬP BẰNG MẬT KHẨU */}
            <TabsContent value="password" className="space-y-5 mt-0">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Trường Email / Tên đăng nhập */}
                <div className="space-y-1.5 text-left">
                  <Label htmlFor="username" className="text-xs font-semibold text-foreground">
                    Email hoặc Tên đăng nhập
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="username"
                      placeholder="Ví dụ: an@demo.vn hoặc annguyen"
                      className="pl-10 h-11"
                      disabled={loading}
                      autoComplete="username"
                      {...register('username')}
                    />
                  </div>
                  {errors.username && (
                    <p className="text-xs text-destructive font-medium mt-1">
                      {errors.username.message}
                    </p>
                  )}
                </div>

                {/* Trường Mật khẩu */}
                <div className="space-y-1.5 text-left">
                  <Label htmlFor="password" className="text-xs font-semibold text-foreground">
                    Mật khẩu
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Nhập mật khẩu tài khoản"
                      className="pl-10 pr-10 h-11"
                      disabled={loading}
                      autoComplete="current-password"
                      {...register('password')}
                    />
                    <button
                      type="button"
                      aria-label="Ẩn hoặc hiện mật khẩu"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-xs text-destructive font-medium mt-1">
                      {errors.password.message}
                    </p>
                  )}
                </div>

                {/* Nút Đăng nhập */}
                <Button
                  type="submit"
                  size="lg"
                  className="w-full mt-2 font-semibold shadow-md shadow-primary/20 cursor-pointer"
                  loading={loading}
                >
                  <span>Đăng nhập</span>
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>

              {/* Gợi ý tài khoản nhanh */}
              <div className="p-3 rounded-xl bg-muted/40 border border-border/60 text-xs text-muted-foreground space-y-1.5">
                <div className="flex items-center gap-1.5 font-medium text-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <span>Tài khoản kiểm thử nhanh (Seed):</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      void onSubmit({ username: 'an@demo.vn', password: 'password123' })
                    }}
                    className="p-1.5 rounded-lg border border-border bg-card hover:bg-muted text-left transition-colors font-medium text-[11px] cursor-pointer"
                  >
                    👤 Khách hàng (an@demo.vn)
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      void onSubmit({ username: 'admin@demo.vn', password: 'password123' })
                    }}
                    className="p-1.5 rounded-lg border border-border bg-card hover:bg-muted text-left transition-colors font-medium text-[11px] cursor-pointer"
                  >
                    🛡️ Quản trị viên (admin@demo.vn)
                  </button>
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: ĐĂNG NHẬP BẰNG MÃ QR THẬT */}
            <TabsContent value="qr" className="space-y-4 mt-0 text-center">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Bảo mật không dùng mật khẩu</span>
                </div>
                <p className="text-xs text-muted-foreground pt-1">
                  Quét mã QR bằng ứng dụng di động để đăng nhập tức thì
                </p>
              </div>

              {/* Khung mã QR Thật */}
              <div className="relative mx-auto w-56 h-56 p-3 bg-white rounded-2xl border-2 border-primary/20 shadow-inner flex flex-col items-center justify-center">
                {isQrLoading ? (
                  <div className="flex flex-col items-center justify-center p-4 text-center space-y-2">
                    <RefreshCw className="h-7 w-7 text-primary animate-spin" />
                    <p className="text-xs text-slate-500 font-medium">Đang tạo mã QR...</p>
                  </div>
                ) : qrError ? (
                  <div className="space-y-3 p-3 text-center">
                    <p role="alert" className="text-xs text-destructive">{qrError}</p>
                    <Button size="sm" onClick={refreshQrSession}>Thử tạo lại mã QR</Button>
                  </div>
                ) : isQrExpired || isQrRejected ? (
                  <div className="flex flex-col items-center justify-center p-3 text-center space-y-2">
                    <div className="h-10 w-10 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center">
                      <RefreshCw className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-800">
                        {isQrRejected ? 'Yêu cầu đăng nhập bị từ chối' : 'Mã QR đã hết hạn'}
                      </p>
                      <p className="text-[11px] text-slate-500">Bấm nút bên dưới để tạo mã mới</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={refreshQrSession}
                      className="gap-1.5 text-xs font-medium shadow-sm cursor-pointer"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span>{isQrRejected ? 'Tạo mã QR khác' : 'Làm mới mã QR'}</span>
                    </Button>
                  </div>
                ) : (
                  <div className="relative w-full h-full flex items-center justify-center">
                    <QRCodeSVG
                      value={qrPayload}
                      size={180}
                      level="H"
                      includeMargin={false}
                    />

                    {/* Logo FinVault nhỏ ở giữa QR */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-md border-2 border-white">
                        <Wallet className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {qrData && !isQrLoading && !isQrExpired && !isQrRejected && (
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <RefreshCw className="h-3 w-3 animate-spin text-primary" />
                  <span>
                    Mã QR có hiệu lực trong{' '}
                    <strong className="text-foreground font-semibold">{formatTime(qrCountdown)}</strong>
                  </span>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Link dẫn sang trang Đăng ký */}
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

export default SignInPage
