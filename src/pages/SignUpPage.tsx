import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle2, ShieldCheck, Wallet } from 'lucide-react'
import { SignUpForm } from '@/features/auth'
import { Card, CardContent } from '@/components/ui/card'

export function SignUpPage() {
  const navigate = useNavigate()
  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-1 border border-primary/20 shadow-sm">
          <Wallet aria-hidden="true" className="h-6 w-6" />
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
          <SignUpForm onRegistered={email => navigate('/sign-in', { state: { email } })} />
          <div className="mt-6 pt-5 border-t border-border/60 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground text-left">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>Miễn phí mở ví</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>Bảo mật kép 2 lớp</span>
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="text-center text-sm text-muted-foreground">
        <span>Đã có tài khoản FinVault? </span>
        <Link to="/sign-in" className="font-semibold text-primary hover:underline inline-flex items-center gap-0.5">
          <span>Đăng nhập ngay</span>
        </Link>
      </div>
    </div>
  )
}

export default SignUpPage
