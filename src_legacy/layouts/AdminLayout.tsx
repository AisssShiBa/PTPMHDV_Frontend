// d:\PTPMHDV\Frontend\src\layouts\AdminLayout.tsx
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'
import { LayoutDashboard, Users, Store, ArrowLeft, Shield, Banknote } from 'lucide-react'
import { useAuthStore } from '@/features/auth/stores/useAuthStore'

const adminNav = [
  { label: 'Thống kê tổng quan', href: '/admin', icon: LayoutDashboard },
  { label: 'Duyệt hồ sơ KYC', href: '/admin/kyc', icon: Users },
  { label: 'Duyệt đối tác Merchant', href: '/admin/merchants', icon: Store },
  { label: 'Duyệt nạp tiền (QR)', href: '/admin/topups', icon: Banknote }
]

export default function AdminLayout() {
  const location = useLocation()
  const user = useAuthStore((state) => state.user)
  // ProtectRoute restores the session before this layout mounts.
  if (user?.role !== 'ADMIN') return <Navigate to="/" replace />

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Sidebar Admin */}
      <aside className="w-64 border-r border-border/60 bg-card/60 p-6 flex flex-col justify-between shrink-0">
        <div className="space-y-6">
          <div className="flex items-center gap-2.5 text-primary font-black text-xl tracking-tight">
            <Shield className="size-6 text-primary" />
            <span>FinVault Admin</span>
          </div>

          <nav className="space-y-1.5">
            {adminNav.map((item) => {
              const isActive = location.pathname === item.href
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-primary text-white shadow-md shadow-primary/20'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <Icon className="size-4" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>

        <div>
          <Link
            to="/"
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-4" />
            <span>Về trang chủ ví</span>
          </Link>
        </div>
      </aside>

      {/* Nội dung chính Admin */}
      <main className="flex-1 p-8 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
