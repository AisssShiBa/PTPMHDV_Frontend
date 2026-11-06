import { Link } from 'react-router-dom'
import { ShieldAlert, ArrowLeft, Home, LogIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export function ForbiddenPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 sm:px-6 relative overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-destructive/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full text-center space-y-6 relative z-10 py-12">
        {/* Security Alert Icon */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-destructive/10 text-destructive border border-destructive/20 shadow-sm animate-pulse">
          <ShieldAlert className="h-10 w-10" />
        </div>

        {/* Error Code & Details */}
        <div className="space-y-3">
          <Badge variant="outline" className="border-destructive/30 text-destructive bg-destructive/5 px-3 py-1 font-semibold text-xs">
            Mã lỗi 403 • Quyền truy cập bị từ chối
          </Badge>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Khu vực giới hạn đặc quyền
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Tài khoản hiện tại của bạn không được cấp quyền quản trị để truy cập vào phân vùng này. Vui lòng quay về trang ví hoặc đăng nhập bằng tài khoản quản trị viên.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button asChild size="lg" className="w-full sm:w-auto font-semibold shadow-md cursor-pointer">
            <Link to="/app" className="inline-flex items-center justify-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              <span>Quay lại ví của tôi</span>
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full sm:w-auto font-semibold cursor-pointer">
            <Link to="/" className="inline-flex items-center justify-center gap-2">
              <Home className="h-4 w-4" />
              <span>Trang chủ</span>
            </Link>
          </Button>
        </div>

        {/* Secondary Switch Account Link */}
        <div className="pt-4 border-t border-border/60">
          <Link
            to="/sign-in"
            className="inline-flex items-center gap-1.5 text-xs text-primary font-medium hover:underline cursor-pointer"
          >
            <LogIn className="h-3.5 w-3.5" />
            <span>Đăng nhập tài khoản Quản trị viên khác</span>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default ForbiddenPage
