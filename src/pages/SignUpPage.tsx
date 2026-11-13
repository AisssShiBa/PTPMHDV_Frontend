import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import {
  Wallet,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Info
} from 'lucide-react'
import { registerSchema } from '@/features/auth/schemas/auth.schema'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { authApi } from '@/features/auth/api/auth.api'

export function SignUpPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm<{ email: string; password: string; confirmPassword: string; terms?: boolean }>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      terms: true
    }
  })

  const currentPassword = watch('password') || ''

  // Tính toán mức độ mạnh của mật khẩu
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: 'Chưa nhập', color: 'bg-muted' }
    let score = 0
    if (pwd.length >= 6) score += 1
    if (pwd.length >= 8) score += 1
    if (/[0-9]/.test(pwd)) score += 1
    if (/[A-Z]/.test(pwd) || /[^A-Za-z0-9]/.test(pwd)) score += 1

    if (score <= 1) return { score: 1, label: 'Yếu', color: 'bg-destructive' }
    if (score === 2) return { score: 2, label: 'Trung bình', color: 'bg-amber-500' }
    if (score === 3) return { score: 3, label: 'Khá tốt', color: 'bg-emerald-500' }
    return { score: 4, label: 'Rất mạnh', color: 'bg-primary' }
  }

  const strength = getPasswordStrength(currentPassword)

  // Xử lý gửi đăng ký qua API thật
  const onSubmit = async (data: { email: string; password: string; confirmPassword: string; terms?: boolean }) => {
    setIsSubmitting(true)
    try {
      await authApi.signUp({
        email: data.email,
        password: data.password
      })
      toast.success('Đăng ký tài khoản FinVault thành công!')
      navigate('/sign-in', { state: { email: data.email } })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Đăng ký không thành công. Vui lòng thử lại.'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
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
          Tạo tài khoản FinVault
        </h1>
        <p className="text-sm text-muted-foreground">
          Mở ví trong vài phút, bảo mật đa tầng cho mọi giao dịch
        </p>
      </div>

      <Card className="shadow-lg border-border bg-card">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Trường Email */}
            <div className="space-y-1.5 text-left">
              <Label htmlFor="email" className="text-xs font-semibold text-foreground">
                Địa chỉ Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Ví dụ: an.nguyen@finvault.vn"
                  className="pl-10 h-11"
                  disabled={isSubmitting}
                  autoComplete="email"
                  {...register('email')}
                />
              </div>
              {errors.email ? (
                <p className="text-xs text-destructive font-medium mt-1">
                  {errors.email.message}
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1">
                  <Info className="h-3 w-3 text-primary shrink-0" />
                  <span>Email dùng để nhận thông báo biến động số dư và hóa đơn thanh toán.</span>
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
                  placeholder="Nhập ít nhất 6 ký tự bảo mật"
                  className="pl-10 pr-10 h-11"
                  disabled={isSubmitting}
                  autoComplete="new-password"
                  {...register('password')}
                />
                <button
                  type="button"
                  aria-label="Ẩn hoặc hiện mật khẩu"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive font-medium mt-1">
                  {errors.password.message}
                </p>
              )}

              {/* Thang đo độ mạnh mật khẩu */}
              {currentPassword.length > 0 && (
                <div className="pt-1 space-y-1">
                  <div className="grid grid-cols-4 gap-1.5 h-1.5">
                    {[1, 2, 3, 4].map((step) => (
                      <div
                        key={step}
                        className={`rounded-full transition-all duration-300 ${
                          step <= strength.score ? strength.color : 'bg-muted'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-foreground">
                      Độ mạnh: {strength.label}
                    </span>
                    <span className="text-muted-foreground">Tối thiểu 6 ký tự</span>
                  </div>
                </div>
              )}
            </div>

            {/* Trường Xác nhận Mật khẩu */}
            <div className="space-y-1.5 text-left">
              <Label htmlFor="confirmPassword" className="text-xs font-semibold text-foreground">
                Xác nhận lại mật khẩu
              </Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Nhập lại mật khẩu vừa đặt"
                  className="pl-10 pr-10 h-11"
                  disabled={isSubmitting}
                  autoComplete="new-password"
                  {...register('confirmPassword')}
                />
                <button
                  type="button"
                  aria-label="Ẩn hoặc hiện xác nhận mật khẩu"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-destructive font-medium mt-1">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            {/* Checkbox Đồng ý điều khoản */}
            <div className="pt-1 text-left">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary accent-primary"
                  {...register('terms')}
                />
                <span className="text-xs text-muted-foreground leading-relaxed">
                  Tôi đồng ý với{' '}
                  <span className="text-primary font-semibold hover:underline">
                    Điều khoản sử dụng
                  </span>{' '}
                  và{' '}
                  <span className="text-primary font-semibold hover:underline">
                    Chính sách bảo mật
                  </span>{' '}
                  của FinVault.
                </span>
              </label>
              {errors.terms && (
                <p className="text-xs text-destructive font-medium mt-1">
                  {errors.terms.message}
                </p>
              )}
            </div>

            {/* Nút Tạo tài khoản */}
            <Button
              type="submit"
              size="lg"
              className="w-full mt-2 font-semibold shadow-md shadow-primary/20"
              loading={isSubmitting}
            >
              <span>Tạo tài khoản ví</span>
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>

          {/* 3 Lợi ích bảo mật */}
          <div className="mt-6 pt-5 border-t border-border/60 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground text-left">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>Miễn phí mở ví</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>Bảo mật kép 2 lớp</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Link dẫn về Đăng nhập */}
      <div className="text-center text-sm text-muted-foreground">
        <span>Đã có tài khoản FinVault? </span>
        <Link
          to="/sign-in"
          className="font-semibold text-primary hover:underline inline-flex items-center gap-0.5"
        >
          <span>Đăng nhập ngay</span>
        </Link>
      </div>
    </div>
  )
}

export default SignUpPage
