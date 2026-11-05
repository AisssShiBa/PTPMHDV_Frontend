import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/stores/useAuthStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { LogIn, QrCode } from 'lucide-react'

export function SignInPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const { signIn, loading } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()

  // Lấy đường dẫn ban đầu trước khi bị chặn để quay lại sau đăng nhập
  const from = (location.state as { from?: string })?.from || '/app'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim()) return
    const success = await signIn(username, password)
    if (success) {
      navigate(from, { replace: true })
    }
  }

  const handleQuickLogin = async (mockRole: 'user' | 'admin') => {
    const success = await signIn(mockRole, 'password123')
    if (success) {
      navigate(mockRole === 'admin' ? '/admin' : from, { replace: true })
    }
  }

  return (
    <Card className="w-full shadow-lg border-border">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold tracking-tight">Đăng nhập ví</CardTitle>
        <CardDescription>
          Nhập thông tin tài khoản FinVault để truy cập
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Tên đăng nhập hoặc Email</Label>
            <Input
              id="username"
              placeholder="ví dụ: annguyen hoặc admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              autoComplete="username"
              required
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Mật khẩu</Label>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoComplete="current-password"
              required
            />
          </div>

          <Button type="submit" className="w-full mt-2" loading={loading}>
            <LogIn className="mr-2 h-4 w-4" />
            <span>Đăng nhập</span>
          </Button>

          {/* Quick Mock Login Buttons For Testing Phase 0-2 */}
          <div className="rounded-lg border border-dashed border-border p-3 text-xs bg-muted/30 space-y-2">
            <p className="font-semibold text-muted-foreground text-center">
              Kiểm thử nhanh (Phase 0–2):
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickLogin('user')}
                disabled={loading}
              >
                Tài khoản User thường
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickLogin('admin')}
                disabled={loading}
              >
                Tài khoản Admin
              </Button>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-3 text-center text-xs text-muted-foreground">
          <div className="flex items-center justify-center gap-2">
            <Link to="/qr-login" className="inline-flex items-center gap-1 text-primary hover:underline font-medium">
              <QrCode className="h-3.5 w-3.5" />
              <span>Đăng nhập bằng mã QR</span>
            </Link>
          </div>
          <div>
            Chưa có tài khoản?{' '}
            <Link to="/sign-up" className="text-primary hover:underline font-medium">
              Đăng ký ngay
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  )
}

export default SignInPage
