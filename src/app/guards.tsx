import { useAuthStore } from '@/features/auth/stores/useAuthStore'
import { Navigate, Outlet, useLocation } from 'react-router-dom'

/**
 * Guard yêu cầu người dùng đã đăng nhập.
 * Chờ initialize hoàn tất trước khi quyết định điều hướng, tránh nháy sang /signin.
 */
export function RequireAuth() {
  const { accessToken, user, initialized } = useAuthStore()
  const location = useLocation()

  if (!initialized) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background text-muted-foreground" role="status">
        <div className="flex flex-col items-center gap-2">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-sm">Đang khôi phục phiên đăng nhập…</span>
        </div>
      </div>
    )
  }

  if (!accessToken || !user) {
    return <Navigate to="/signin" replace state={{ from: location.pathname }} />
  }

  return <Outlet key={user.id} />
}

/**
 * Guard yêu cầu quyền cụ thể (vd: ADMIN)
 */
interface RequireRoleProps {
  role: 'ADMIN' | 'USER' | 'MERCHANT'
}

export function RequireRole({ role }: RequireRoleProps) {
  const { user } = useAuthStore()

  if (!user || user.role !== role) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
