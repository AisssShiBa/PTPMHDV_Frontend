import { useAuthStore } from '@/features/auth/stores/useAuthStore'
import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'

const ProtectRoute = () => {
  const { accessToken, user, loading, refresh, fetchMe } = useAuthStore()
  const [starting, setStarting] = useState(true)
  const init = async () => {
    if (!accessToken) await refresh()
    if (accessToken && !user) await fetchMe()
    setStarting(false)
  }
  useEffect(() => {
    init()
  }, [])
  if (starting || loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        Đang tải trang....
      </div>
    )
  }
  if (!accessToken) {
    return <Navigate to="/signin" replace />
  }
  return <Outlet />
}

export default ProtectRoute
