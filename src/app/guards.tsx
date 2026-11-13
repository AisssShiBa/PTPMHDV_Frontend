import { type ReactNode, useEffect } from 'react'
import { Navigate, useLocation, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/stores/useAuthStore'
import type { UserRole } from '@/features/auth/types/auth.types'
import { Loader2 } from 'lucide-react'

interface GuardProps {
  children?: ReactNode
}

/**
 * Component hiển thị màn hình chờ khi đang khôi phục phiên (F5 hoặc mở app)
 * Tránh việc nhấp nháy chuyển sang trang /sign-in trước khi đọc xong cookie
 */
function GuardLoading() {
  return (
    <div
      className="min-h-screen flex items-center justify-center bg-background text-foreground"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground font-medium">Đang tải phiên làm việc…</p>
      </div>
    </div>
  )
}

/**
 * Hook đảm bảo khôi phục phiên trước khi Router đưa ra quyết định điều hướng
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
 * 1. RequireAuth: Bắt buộc người dùng phải đăng nhập mới được vào
 * Nhớ lại đường dẫn hiện tại (state.from) để quay lại sau khi đăng nhập thành công
 */
export function RequireAuth({ children }: GuardProps) {
  const location = useLocation()
  const initialized = useEnsureInitialized()
  const { accessToken, user } = useAuthStore()

  if (!initialized) {
    return <GuardLoading />
  }

  if (!accessToken || !user) {
    return <Navigate to="/sign-in" state={{ from: location.pathname + location.search }} replace />
  }

  return children ? <>{children}</> : <Outlet />
}

/**
 * 2. RequireRole: Kiểm tra vai trò quyền hạn cụ thể (vd: ADMIN)
 * - Nếu chưa đăng nhập: chuyển hướng về /sign-in
 * - Nếu đã đăng nhập nhưng sai vai trò: chuyển hướng về /403
 */
export function RequireRole({ role, children }: { role: UserRole; children?: ReactNode }) {
  const initialized = useEnsureInitialized()
  const { user, accessToken } = useAuthStore()

  if (!initialized) {
    return <GuardLoading />
  }

  if (!accessToken || !user) {
    return <Navigate to="/sign-in" replace />
  }

  if (user.role !== role) {
    return <Navigate to="/403" replace />
  }

  return children ? <>{children}</> : <Outlet />
}

/**
 * 3. RedirectIfAuthed: Dành cho các trang công khai (/, /sign-in, /sign-up)
 * Nếu người dùng ĐÃ ĐĂNG NHẬP:
 * - ADMIN ➔ Tự động chuyển hướng về /admin
 * - USER / Khác ➔ Tự động chuyển hướng về /app
 */
export function RedirectIfAuthed({ children }: GuardProps) {
  const initialized = useEnsureInitialized()
  const { accessToken, user } = useAuthStore()

  if (!initialized) {
    return <GuardLoading />
  }

  if (accessToken && user) {
    const destination = user.role === 'ADMIN' ? '/admin' : '/app'
    return <Navigate to={destination} replace />
  }

  return children ? <>{children}</> : <Outlet />
}
