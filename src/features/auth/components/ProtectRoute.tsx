import { useAuthStore } from '@/features/auth/stores/useAuthStore'
import { Navigate, Outlet, useLocation } from 'react-router-dom'

export default function ProtectRoute() {
  const { accessToken, user, initialized } = useAuthStore()
  const location = useLocation()
  if (!initialized) {
    return <div className="p-10 text-center text-muted-foreground" role="status">Đang khôi phục phiên đăng nhập…</div>
  }
  if (!accessToken || !user) {
    return <Navigate to="/signin" replace state={{ from: location.pathname }} />
  }
  return <Outlet key={user.id} />
}
