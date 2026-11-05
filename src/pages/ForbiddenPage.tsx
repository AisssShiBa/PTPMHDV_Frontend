import { Link } from 'react-router-dom'
import { ShieldAlert, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ForbiddenPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">403 - Không có quyền truy cập</h1>
          <p className="text-sm text-muted-foreground">
            Tài khoản của bạn không có đặc quyền để truy cập vào phân vùng này. Vui lòng quay lại màn hình chính của ví.
          </p>
        </div>
        <div>
          <Button asChild variant="default">
            <Link to="/app" className="inline-flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              <span>Quay lại trang ví</span>
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

export default ForbiddenPage
