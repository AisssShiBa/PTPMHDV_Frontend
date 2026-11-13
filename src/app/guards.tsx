import { type ReactNode, useEffect } from 'react'
import { Navigate, useLocation, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/stores/useAuthStore'
import type { UserRole } from '@/features/auth/types/auth.types'
import { Loader2 } from 'lucide-react'

interface GuardProps {
  children?: ReactNode
}

/**
 * Chờ khôi phục phiên trước khi quyết định điều hướng
 */
function useEnsureInitialized() {
  const { initialized, initialize } = useAuthStore()
  useEffect(() => {
    if (!initialized) {
      initialize()
    }
  }, [initialized, initialize])
  return initialized
}

/**
 * Guard yêu cầu người dùng phải đăng nhập.
 * Nhớ đường dẫn hiện tại để chuyển hướng quay lại sau khi đăng nhập thành công.
 */
export function RequireAuth({ children }: GuardProps) {
  const location = useLocation()
  const initialized = useEnsureInitialized()
  const { accessToken, user } = useAuthStore()

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground" role="status">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-medium">Đang tải phiên làm việc…</p>
        </div>
      </div>
    )
  }

  if (!accessToken || !user) {
    return <Navigate to="/sign-in" state={{ from: location.pathname + location.search }} replace />
  }

  return children ? <>{children}</> : <Outlet />
}

/**
 * Guard kiểm tra vai trò người dùng (vd: ADMIN)
 */
export function RequireRole({ role, children }: { role: UserRole; children?: ReactNode }) {
  const initialized = useEnsureInitialized()
  const { user } = useAuthStore()

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" role="status">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (user?.role !== role) {
    return <Navigate to="/403" replace />
  }

  return children ? <>{children}</> : <Outlet />
}

/**
 * Chuyển hướng người dùng đã đăng nhập sang /app nếu truy cập các trang công khai (/, /sign-in, /sign-up)
 */
export function RedirectIfAuthed({ children }: GuardProps) {
  const initialized = useEnsureInitialized()
  const { accessToken, user } = useAuthStore()

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" role="status">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (accessToken && user) {
    return <Navigate to="/app" replace />
  }

  return children ? <>{children}</> : <Outlet />
}
