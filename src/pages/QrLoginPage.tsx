import { useNavigate, Link } from 'react-router-dom'
import { QrCode, Lock } from 'lucide-react'
import { QrLoginPanel } from '@/features/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export function QrLoginPage() {
  const navigate = useNavigate()

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-1 border border-primary/20 shadow-sm">
          <QrCode aria-hidden="true" className="h-6 w-6" />
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
          <QrLoginPanel onApproved={user => navigate(user.role === 'ADMIN' ? '/admin' : '/app', { replace: true })} />
          <Button asChild variant="outline" size="sm" className="min-h-11 w-full text-xs font-semibold">
            <Link to="/sign-in" className="flex items-center justify-center gap-1.5">
              <Lock aria-hidden="true" className="h-3.5 w-3.5" />
              <span>Đăng nhập bằng Mật khẩu</span>
            </Link>
          </Button>
        </CardContent>
      </Card>

      <div className="text-center text-sm text-muted-foreground">
        <span>Chưa có tài khoản FinVault? </span>
        <Link to="/sign-up" className="font-semibold text-primary hover:underline inline-flex items-center gap-0.5">
          <span>Mở ví số ngay</span>
        </Link>
      </div>
    </div>
  )
}

export default QrLoginPage
