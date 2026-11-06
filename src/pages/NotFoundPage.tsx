import { useNavigate, Link } from 'react-router-dom'
import { FileQuestion, ArrowLeft, Home, Wallet, ArrowRightLeft, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 sm:px-6 relative overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-lg w-full text-center space-y-6 relative z-10 py-12">
        {/* Large 404 Visual Graphic */}
        <div className="relative mx-auto flex items-center justify-center">
          <span className="text-8xl sm:text-9xl font-black text-primary/10 tracking-widest select-none">
            404
          </span>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10 text-primary border border-primary/20 shadow-md">
              <FileQuestion className="h-10 w-10" />
            </div>
          </div>
        </div>

        {/* Error Details */}
        <div className="space-y-3">
          <div className="flex justify-center">
            <Badge
              variant="outline"
              className="border-primary/30 text-primary bg-primary/5 px-3 py-1 font-semibold text-xs"
            >
              Mã lỗi 404 • Không tìm thấy tài nguyên
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Đường dẫn không tồn tại
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-md mx-auto">
            Trang bạn đang tìm kiếm có thể đã bị thay đổi địa chỉ, tạm ngừng hoạt động hoặc đường dẫn URL nhập chưa chính xác.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Button
            size="lg"
            className="w-full sm:w-auto font-semibold shadow-md shadow-primary/20 cursor-pointer"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            <span>Quay lại trang trước</span>
          </Button>
          <Button
            asChild
            variant="outline"
            size="lg"
            className="w-full sm:w-auto font-semibold cursor-pointer"
          >
            <Link to="/" className="inline-flex items-center justify-center gap-2">
              <Home className="h-4 w-4" />
              <span>Về trang chủ</span>
            </Link>
          </Button>
        </div>

        {/* Quick Utility Links */}
        <div className="pt-6 border-t border-border/60 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Các liên kết hữu ích:
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
            <Link
              to="/app"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/60 hover:bg-muted text-foreground font-medium transition-colors cursor-pointer"
            >
              <Wallet className="h-3.5 w-3.5 text-primary" />
              <span>Ví của tôi</span>
            </Link>
            <Link
              to="/app/transfer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/60 hover:bg-muted text-foreground font-medium transition-colors cursor-pointer"
            >
              <ArrowRightLeft className="h-3.5 w-3.5 text-primary" />
              <span>Chuyển tiền</span>
            </Link>
            <Link
              to="/sign-in"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/60 hover:bg-muted text-foreground font-medium transition-colors cursor-pointer"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              <span>Đăng nhập</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NotFoundPage
