import { useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { input, output } from 'zod'
import { ArrowRight, Eye, EyeOff, Info, Lock, Mail } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { errorMessage, isApiAxiosError } from '@/lib/apiResponse'
import { useSignUp } from '../api/auth.queries'
import { registerSchema } from '../schemas/auth.schema'

interface SignUpFormProps {
  onRegistered: (email: string) => void
}

function useSignUpForm(onRegistered: SignUpFormProps['onRegistered']) {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const submitting = useRef(false)
  const mutation = useSignUp()
  const form = useForm<input<typeof registerSchema>, unknown, output<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', password: '', confirmPassword: '', terms: true }
  })
  const password = useWatch({ control: form.control, name: 'password' }) || ''
  const submit = async (data: output<typeof registerSchema>) => {
    // React may not render pending before a second submit event arrives.
    if (submitting.current) return
    submitting.current = true
    try {
      await mutation.mutateAsync({ email: data.email, password: data.password })
      toast.success('Đăng ký tài khoản FinVault thành công!')
      onRegistered(data.email)
    } catch (error: unknown) {
      toast.error(errorMessage(isApiAxiosError(error) ? error : undefined))
    } finally {
      submitting.current = false
      mutation.reset() // Release credentials from the completed mutation.
    }
  }
  return { form, password, submit, busy: mutation.isPending,
    showPassword, setShowPassword, showConfirmPassword, setShowConfirmPassword }
}

type FormController = ReturnType<typeof useSignUpForm>

function passwordStrength(password: string) {
  let score = 0
  if (password.length >= 6) score++
  if (password.length >= 8) score++
  if (/[0-9]/.test(password)) score++
  if (/[A-Z]/.test(password) || /[^A-Za-z0-9]/.test(password)) score++
  if (score <= 1) return { score: 1, label: 'Yếu', color: 'bg-destructive' }
  if (score === 2) return { score: 2, label: 'Trung bình', color: 'bg-amber-500' }
  if (score === 3) return { score: 3, label: 'Khá tốt', color: 'bg-emerald-500' }
  return { score: 4, label: 'Rất mạnh', color: 'bg-primary' }
}

function renderStrength(password: string) {
  if (!password) return null
  const strength = passwordStrength(password)
  return <div className="pt-1 space-y-1">
    <div className="grid grid-cols-4 gap-1.5 h-1.5">
      {[1, 2, 3, 4].map(step => <div key={step}
        className={`rounded-full transition-all duration-300 ${step <= strength.score ? strength.color : 'bg-muted'}`} />)}
    </div>
    <div className="flex items-center justify-between text-[11px]">
      <span className="font-semibold text-foreground">Độ mạnh: {strength.label}</span>
      <span className="text-muted-foreground">Tối thiểu 6 ký tự</span>
    </div>
  </div>
}

function renderEmail(controller: FormController) {
  const error = controller.form.formState.errors.email
  return <div className="space-y-1.5 text-left">
    <Label htmlFor="email" className="text-xs font-semibold text-foreground">Địa chỉ Email</Label>
    <div className="relative">
      <Mail aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input id="email" type="email" placeholder="Ví dụ: an.nguyen@finvault.vn" className="pl-10 h-11"
        disabled={controller.busy} autoComplete="email" aria-invalid={Boolean(error)}
        aria-describedby={error ? 'signup-email-error' : 'signup-email-help'} {...controller.form.register('email')} />
    </div>
    {error ? <p id="signup-email-error" role="alert" className="text-xs text-destructive font-medium mt-1">{error.message}</p>
      : <p id="signup-email-help" className="text-[11px] text-muted-foreground flex items-center gap-1 mt-1">
        <Info aria-hidden="true" className="h-3 w-3 text-primary shrink-0" />
        <span>Email dùng để nhận thông báo biến động số dư và hóa đơn thanh toán.</span>
      </p>}
  </div>
}

function renderPassword(controller: FormController, name: 'password' | 'confirmPassword') {
  const confirmation = name === 'confirmPassword'
  const visible = confirmation ? controller.showConfirmPassword : controller.showPassword
  const setVisible = confirmation ? controller.setShowConfirmPassword : controller.setShowPassword
  const error = controller.form.formState.errors[name]
  return <div className="space-y-1.5 text-left">
    <Label htmlFor={name} className="text-xs font-semibold text-foreground">
      {confirmation ? 'Xác nhận lại mật khẩu' : 'Mật khẩu'}
    </Label>
    <div className="relative">
      <Lock aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input id={name} type={visible ? 'text' : 'password'}
        placeholder={confirmation ? 'Nhập lại mật khẩu vừa đặt' : 'Nhập ít nhất 6 ký tự bảo mật'}
        className="pl-10 pr-10 h-11" disabled={controller.busy} autoComplete="new-password"
        aria-invalid={Boolean(error)} aria-describedby={error ? `signup-${name}-error` : undefined}
        {...controller.form.register(name)} />
      <button type="button" disabled={controller.busy}
        aria-label={confirmation ? 'Ẩn hoặc hiện xác nhận mật khẩu' : 'Ẩn hoặc hiện mật khẩu'}
        onClick={() => setVisible(current => !current)}
        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5">
        {visible ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}
      </button>
    </div>
    {error && <p id={`signup-${name}-error`} role="alert" className="text-xs text-destructive font-medium mt-1">{error.message}</p>}
    {!confirmation && renderStrength(controller.password)}
  </div>
}

function renderTerms(controller: FormController) {
  const error = controller.form.formState.errors.terms
  return <div className="pt-1 text-left">
    <label className="flex items-start gap-2.5 cursor-pointer select-none">
      <input type="checkbox" disabled={controller.busy} aria-invalid={Boolean(error)}
        aria-describedby={error ? 'signup-terms-error' : undefined}
        className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary accent-primary"
        {...controller.form.register('terms')} />
      <span className="text-xs text-muted-foreground leading-relaxed">
        Tôi đồng ý với{' '}<span className="text-primary font-semibold hover:underline">Điều khoản sử dụng</span>
        {' '}và{' '}<span className="text-primary font-semibold hover:underline">Chính sách bảo mật</span> của FinVault.
      </span>
    </label>
    {error && <p id="signup-terms-error" role="alert" className="text-xs text-destructive font-medium mt-1">{error.message}</p>}
  </div>
}

export function SignUpForm({ onRegistered }: SignUpFormProps) {
  const controller = useSignUpForm(onRegistered)
  return <form onSubmit={event => { void controller.form.handleSubmit(controller.submit)(event) }}
    aria-label="Đăng ký tài khoản" aria-busy={controller.busy} className="space-y-4">
    {renderEmail(controller)}
    {renderPassword(controller, 'password')}
    {renderPassword(controller, 'confirmPassword')}
    {renderTerms(controller)}
    <Button type="submit" size="lg" className="w-full mt-2 font-semibold shadow-md shadow-primary/20" loading={controller.busy}>
      <span>Tạo tài khoản ví</span><ArrowRight aria-hidden="true" className="ml-2 h-4 w-4" />
    </Button>
  </form>
}
