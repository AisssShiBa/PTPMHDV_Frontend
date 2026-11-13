import { useState } from 'react'
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
import { useAuthStore } from '@/features/auth/stores/useAuthStore'
import { loginSchema } from '@/features/auth/schemas/auth.schema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export function SignInPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [activeTab, setActiveTab] = useState<'password' | 'qr'>('password')
  const qrCountdown = 120
  const { signIn, loading } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  const from = (location.state as { from?: string })?.from || '/app'

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
      const isRoleAdmin = data.username.toLowerCase().includes('admin')
      navigate(isRoleAdmin ? '/admin' : from, { replace: true })
    }
  }

  // Xử lý đăng nhập bằng mã QR
  const handleQrSuccess = async () => {
    const success = await signIn('annguyen', 'password123')
    if (success) {
      toast.success('Xác thực mã QR thành công')
      navigate(from, { replace: true })
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
            onValueChange={(val) => setActiveTab(val as 'password' | 'qr')}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="password" className="text-xs sm:text-sm font-semibold">
                Mật khẩu
              </TabsTrigger>
              <TabsTrigger value="qr" className="text-xs sm:text-sm font-semibold flex items-center gap-1.5">
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
                      placeholder="Ví dụ: annguyen hoặc user@finvault.vn"
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
                  <span>Tài khoản trải nghiệm nhanh:</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      signIn('user1', '123456').then(() => navigate(from, { replace: true }))
                    }}
                    className="p-1.5 rounded-lg border border-border bg-card hover:bg-muted text-left transition-colors font-medium text-[11px] cursor-pointer"
                  >
                    👤 Người dùng 1 (100k)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      signIn('user2', '123456').then(() => navigate(from, { replace: true }))
                    }}
                    className="p-1.5 rounded-lg border border-border bg-card hover:bg-muted text-left transition-colors font-medium text-[11px] cursor-pointer"
                  >
                    👤 Người dùng 2 (100k)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      signIn('admin', '123456').then(() => navigate('/admin', { replace: true }))
                    }}
                    className="p-1.5 rounded-lg border border-border bg-card hover:bg-muted text-left transition-colors font-medium text-[11px] cursor-pointer col-span-2 text-center"
                  >
                    🛡️ Quản trị viên (Admin)
                  </button>
                </div>
              </div>
            </TabsContent>

            {/* TAB 2: ĐĂNG NHẬP BẰNG MÃ QR */}
            <TabsContent value="qr" className="space-y-4 mt-0 text-center">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Bảo mật không dùng mật khẩu</span>
                </div>
                <p className="text-xs text-muted-foreground pt-1">
                  Mở ứng dụng FinVault trên điện thoại và quét mã bên dưới
                </p>
              </div>

              {/* Khung mã QR */}
              <div className="relative mx-auto w-52 h-52 p-3 bg-white rounded-2xl border-2 border-primary/20 shadow-inner flex flex-col items-center justify-center">
                <svg className="w-full h-full text-slate-800" fill="currentColor" viewBox="0 0 100 100">
                  <rect fill="none" height="28" rx="4" stroke="currentColor" strokeWidth="4" width="28" x="5" y="5" />
                  <rect fill="currentColor" height="16" rx="2" width="16" x="11" y="11" />
                  <rect fill="none" height="28" rx="4" stroke="currentColor" strokeWidth="4" width="28" x="67" y="5" />
                  <rect fill="currentColor" height="16" rx="2" width="16" x="73" y="11" />
                  <rect fill="none" height="28" rx="4" stroke="currentColor" strokeWidth="4" width="28" x="5" y="67" />
                  <rect fill="currentColor" height="16" rx="2" width="16" x="11" y="73" />
                  <rect fill="none" height="16" rx="2" stroke="currentColor" strokeWidth="3" width="16" x="71" y="71" />
                  <rect fill="currentColor" height="6" width="6" x="76" y="76" />
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
                </svg>

                {/* Logo FinVault nhỏ ở giữa QR */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-md">
                    <Wallet className="h-4 w-4" />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <RefreshCw className="h-3 w-3 animate-spin text-primary" />
                <span>Mã QR tự làm mới sau {qrCountdown}s</span>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={handleQrSuccess}
              >
                Xác nhận đã quét trên điện thoại
              </Button>
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
