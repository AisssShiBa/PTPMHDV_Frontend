import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function SignUpPage() {
  return (
    <Card className="w-full shadow-lg border-border">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold tracking-tight">Đăng ký tài khoản</CardTitle>
        <CardDescription>
          Tạo tài khoản ví điện tử mô phỏng FinVault
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="ban@vi-du.com" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Mật khẩu</Label>
          <Input id="password" type="password" placeholder="Tối thiểu 8 ký tự" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Nhập lại mật khẩu</Label>
          <Input id="confirmPassword" type="password" placeholder="••••••••" required />
        </div>
        <Button className="w-full mt-2" disabled>
          Đăng ký (Khung trang - Phase B-1)
        </Button>
      </CardContent>
      <CardFooter className="text-center text-xs text-muted-foreground flex justify-center">
        <span>Đã có tài khoản? </span>
        <Link to="/sign-in" className="ml-1 text-primary hover:underline font-medium">
          Đăng nhập
        </Link>
      </CardFooter>
    </Card>
  )
}

export default SignUpPage
