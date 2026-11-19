import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { ArrowRight, Eye, EyeOff, Lock, Mail, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { loginSchema } from '../schemas/auth.schema'
import type { LoginInput } from '../schemas/auth.schema'
import { useAuthStore } from '../stores/useAuthStore'
import type { User } from '../types/auth.types'

type Credentials = Pick<LoginInput, 'username' | 'password'>
interface SignInFormProps {
  onApproved: (user: User) => void
}

function useSignInForm(onApproved: SignInFormProps['onApproved']) {
  const [showPassword, setShowPassword] = useState(false)
  const submitting = useRef(false)
  const loading = useAuthStore(state => state.loading)
  const form = useForm<Credentials>({ resolver: zodResolver(loginSchema), defaultValues: { username: '', password: '' } })
  const mutation = useMutation({
    mutationKey: ['auth', 'sign-in'],
    mutationFn: ({ username, password }: Credentials) => useAuthStore.getState().signIn(username, password),
    networkMode: 'always', retry: false, gcTime: 0
  })
  const busy = loading || mutation.isPending
  const submit = (data: Credentials) => {
    if (submitting.current || useAuthStore.getState().loading) return
    submitting.current = true
    mutation.mutate(data, {
      onSuccess: success => {
        const user = useAuthStore.getState().user
        if (success && user) onApproved(user)
      },
      onSettled: () => {
        submitting.current = false
        mutation.reset() // Release credential variables instead of retaining the completed mutation.
      }
    })
  }
  const selectDemoAccount = (username: string) => {
    if (busy || submitting.current) return
    form.resetField('username', { defaultValue: username })
    form.resetField('password')
    setShowPassword(false)
    form.setFocus('password')
  }
  return { form, busy, showPassword, setShowPassword, submit, selectDemoAccount }
}

type FormController = ReturnType<typeof useSignInForm>

function renderUsernameField({ form, busy }: FormController) {
  const error = form.formState.errors.username
  return (
    <div className="space-y-1.5 text-left">
      <Label htmlFor="username" className="text-xs font-semibold">Email hoặc Tên đăng nhập</Label>
      <div className="relative">
        <Mail aria-hidden="true" className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input id="username" autoComplete="username" placeholder="Ví dụ: an@demo.vn hoặc annguyen"
          className="h-11 pl-10 text-base md:text-base" disabled={busy} aria-invalid={Boolean(error)}
          aria-describedby={error ? 'signin-username-error' : undefined} {...form.register('username')} />
      </div>
      {error && <p id="signin-username-error" role="alert" className="text-xs font-medium text-destructive">{error.message}</p>}
    </div>
  )
}

function renderPasswordField({ form, busy, showPassword, setShowPassword }: FormController) {
  const error = form.formState.errors.password
  return (
    <div className="space-y-1.5 text-left">
      <Label htmlFor="password" className="text-xs font-semibold">Mật khẩu</Label>
      <div className="relative">
        <Lock aria-hidden="true" className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input id="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password"
          placeholder="Nhập mật khẩu tài khoản" className="h-11 pl-10 pr-12 text-base md:text-base" disabled={busy}
          aria-invalid={Boolean(error)} aria-describedby={error ? 'signin-password-error' : undefined} {...form.register('password')} />
        <Button type="button" variant="ghost" size="icon" disabled={busy} aria-label="Ẩn hoặc hiện mật khẩu"
          aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)} className="absolute right-0 top-0 h-11 w-11">
          {showPassword ? <EyeOff aria-hidden="true" className="h-4 w-4" /> : <Eye aria-hidden="true" className="h-4 w-4" />}
        </Button>
      </div>
      {error && <p id="signin-password-error" role="alert" className="text-xs font-medium text-destructive">{error.message}</p>}
    </div>
  )
}

function renderDemoAccounts({ busy, selectDemoAccount }: FormController) {
  return (
    <div className="space-y-2 rounded-xl border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
      <p className="flex items-center gap-1.5 font-medium text-foreground">
        <Sparkles aria-hidden="true" className="h-3.5 w-3.5 text-primary" />Chọn tài khoản kiểm thử:
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => selectDemoAccount('an@demo.vn')}
          className="h-auto min-h-11 justify-start whitespace-normal text-left text-xs">Điền email khách hàng (an@demo.vn)</Button>
        <Button type="button" variant="outline" size="sm" disabled={busy} onClick={() => selectDemoAccount('admin@demo.vn')}
          className="h-auto min-h-11 justify-start whitespace-normal text-left text-xs">Điền email quản trị viên (admin@demo.vn)</Button>
      </div>
      <p>Chỉ điền email. Nhập mật khẩu của tài khoản rồi bấm Đăng nhập.</p>
    </div>
  )
}

export function SignInForm({ onApproved }: SignInFormProps) {
  const controller = useSignInForm(onApproved)
  return (
    <div className="space-y-5">
      <form onSubmit={controller.form.handleSubmit(controller.submit)} aria-label="Đăng nhập bằng mật khẩu" aria-busy={controller.busy} className="space-y-4">
        {renderUsernameField(controller)}
        {renderPasswordField(controller)}
        <Button type="submit" size="lg" loading={controller.busy} className="mt-2 w-full font-semibold shadow-md shadow-primary/20">
          Đăng nhập<ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Button>
      </form>
      {import.meta.env.DEV && renderDemoAccounts(controller)}
    </div>
  )
}
