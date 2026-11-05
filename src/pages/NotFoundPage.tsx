import { Link } from 'react-router-dom'
import { FileQuestion, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <FileQuestion className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">404 - Không tìm thấy trang</h1>
          <p className="text-sm text-muted-foreground">
            Đường dẫn bạn yêu cầu không tồn tại hoặc đã được chuyển sang địa chỉ khác.
          </p>
        </div>
        <div>
          <Button asChild variant="default">
            <Link to="/app" className="inline-flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              <span>Về trang chủ</span>
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

export default NotFoundPage
