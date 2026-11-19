import { useState } from 'react'
import type { ComponentProps } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { Wallet, QrCode } from 'lucide-react'
import { QrLoginPanel, SignInForm, useAuthStore } from '@/features/auth'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

function getReturnPath(state: unknown): string {
  const requested = state && typeof state === 'object' && 'from' in state ? state.from : undefined
  return typeof requested === 'string' && requested.startsWith('/')
    && !requested.startsWith('//') && !requested.includes('\\')
    && Array.from(requested).every(character => character.charCodeAt(0) >= 32)
    ? requested : '/app'
}

export function SignInPage() {
  const [activeTab, setActiveTab] = useState<'password' | 'qr'>('password')
  const loading = useAuthStore(state => state.loading)
  const navigate = useNavigate()
  const from = getReturnPath(useLocation().state)
  const onApproved: ComponentProps<typeof SignInForm>['onApproved'] = user => {
    navigate(user.role === 'ADMIN' ? '/admin' : from, { replace: true })
  }
  const changeTab = (value: string) => {
    if ((value === 'password' || value === 'qr') && !loading) setActiveTab(value)
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-1 border border-primary/20 shadow-sm">
          <Wallet aria-hidden="true" className="h-6 w-6" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">Chào mừng trở lại</h1>
        <p className="text-sm text-muted-foreground">Đăng nhập vào FinVault để quản lý tài chính cá nhân an toàn</p>
      </div>
      <Card className="shadow-lg border-border bg-card">
        <CardContent className="pt-6">
          <Tabs value={activeTab} onValueChange={changeTab}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="password" disabled={loading} className="text-xs sm:text-sm font-semibold">Mật khẩu</TabsTrigger>
              <TabsTrigger value="qr" disabled={loading} className="text-xs sm:text-sm font-semibold gap-1.5">
                <QrCode aria-hidden="true" className="h-4 w-4" />Mã QR
              </TabsTrigger>
            </TabsList>
            <TabsContent value="password" className="mt-0"><SignInForm onApproved={onApproved} /></TabsContent>
            <TabsContent value="qr" className="mt-0">
              <QrLoginPanel compact enabled={activeTab === 'qr'} onApproved={onApproved} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      <p className="text-center text-sm text-muted-foreground">
        Chưa có tài khoản FinVault? <Link to="/sign-up" className="font-semibold text-primary hover:underline">Mở ví số ngay</Link>
      </p>
    </div>
  )
}

export default SignInPage
