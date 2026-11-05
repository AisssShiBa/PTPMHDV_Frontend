import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom'
import {
  LayoutDashboard,
  UserCheck,
  Scale,
  CreditCard,
  Shield,
  ArrowLeft,
  LogOut
} from 'lucide-react'
import { useAuthStore } from '@/features/auth/stores/useAuthStore'
import { Badge } from '@/components/ui/badge'

interface AdminNavItem {
  label: string
  to: string
  icon: React.ComponentType<{ className?: string }>
}

const adminNavItems: AdminNavItem[] = [
  { label: 'Tổng quan hệ thống', to: '/admin', icon: LayoutDashboard },
  { label: 'Duyệt hồ sơ KYC', to: '/admin/kyc', icon: UserCheck },
  { label: 'Đối soát tài chính', to: '/admin/reconciliation', icon: Scale },
  { label: 'Duyệt nạp tiền (QR)', to: '/admin/topups', icon: CreditCard }
]

export function AdminLayout() {
  const { user, signOut } = useAuthStore()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/sign-in')
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <div className="flex flex-1">
        {/* Admin Sidebar */}
        <aside className="w-64 border-r border-border bg-card/80 p-5 flex flex-col justify-between shrink-0 fixed top-0 bottom-0 left-0 z-30">
          <div className="space-y-6">
            <div className="flex items-center gap-3 px-2 py-2">
              <div className="h-10 w-10 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-base tracking-tight">FinVault</span>
                  <Badge variant="destructive" className="text-[10px] px-1 py-0">ADMIN</Badge>
                </div>
                <p className="text-xs text-muted-foreground">Trung tâm quản trị</p>
              </div>
            </div>

            <nav className="space-y-1">
              {adminNavItems.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/admin'}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                )
              })}
            </nav>
          </div>

          <div className="space-y-2 border-t border-border/60 pt-4">
            <Link
              to="/app"
              className="flex items-center gap-2.5 px-3.5 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Về màn hình ví người dùng</span>
            </Link>

            <button
              type="button"
              onClick={handleSignOut}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-lg text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Đăng xuất</span>
            </button>
          </div>
        </aside>

        {/* Admin Content Area */}
        <div className="flex-1 flex flex-col pl-64">
          <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-foreground">Bảng điều khiển Quản trị viên</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right text-xs">
                <p className="font-semibold">{user?.username || 'admin'}</p>
                <p className="text-muted-foreground">{user?.email || 'admin@finvault.local'}</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive font-bold text-xs">
                A
              </div>
            </div>
          </header>

          <main className="flex-1 p-6 lg:p-8">
            <Outlet />
          </main>

          <footer className="border-t border-border py-4 px-6 text-center text-xs text-muted-foreground bg-card/40">
            <p>FinVault là đồ án học tập mô phỏng ví điện tử, không phải dịch vụ tài chính thật.</p>
          </footer>
        </div>
      </div>
    </div>
  )
}

export default AdminLayout
