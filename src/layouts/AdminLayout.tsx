import { useState } from 'react'
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom'
import {
  LayoutDashboard,
  UserCheck,
  Scale,
  CreditCard,
  Shield,
  ArrowLeft,
  LogOut,
  Menu,
  Activity,
  CheckCircle2
} from 'lucide-react'
import { useAuthStore } from '@/features/auth/stores/useAuthStore'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'

interface AdminNavItem {
  label: string
  to: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
}

const adminNavItems: AdminNavItem[] = [
  { label: 'Tổng quan hệ thống', to: '/admin', icon: LayoutDashboard },
  { label: 'Duyệt hồ sơ KYC', to: '/admin/kyc', icon: UserCheck, badge: '12' },
  { label: 'Đối soát tài chính', to: '/admin/reconciliation', icon: Scale, badge: 'T+1' },
  { label: 'Quản lý nạp tiền (QR)', to: '/admin/topups', icon: CreditCard, badge: '3' }
]

export function AdminLayout() {
  const { user, signOut } = useAuthStore()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/sign-in')
  }

  const renderNavLinks = (onItemClick?: () => void) => (
    <div className="space-y-1">
      {adminNavItems.map((item) => {
        const Icon = item.icon
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/admin'}
            onClick={onItemClick}
            className={({ isActive }) =>
              `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`
            }
          >
            <div className="flex items-center gap-3">
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </div>
            {item.badge && (
              <Badge
                variant="outline"
                className="text-[10px] font-mono font-bold px-1.5 py-0 border-current bg-background/20"
              >
                {item.badge}
              </Badge>
            )}
          </NavLink>
        )
      })}
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <div className="flex flex-1">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex w-64 border-r border-border bg-card/80 p-5 flex-col justify-between shrink-0 fixed top-0 bottom-0 left-0 z-30">
          <div className="space-y-6">
            {/* Admin Brand */}
            <div className="flex items-center gap-3 px-2 py-2">
              <div className="h-10 w-10 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive shadow-xs">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-base tracking-tight text-foreground">FinVault</span>
                  <Badge variant="destructive" className="text-[10px] font-mono font-bold px-1.5 py-0">
                    ADMIN
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">Trung tâm quản trị</p>
              </div>
            </div>

            {/* Navigation */}
            <nav>{renderNavLinks()}</nav>
          </div>

          {/* Bottom Actions */}
          <div className="space-y-2 border-t border-border/60 pt-4">
            <Link
              to="/app"
              className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Về ví người dùng</span>
            </Link>

            <button
              type="button"
              onClick={handleSignOut}
              className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              <span>Đăng xuất Quản trị</span>
            </button>
          </div>
        </aside>

        {/* Content Area */}
        <div className="flex-1 flex flex-col lg:pl-64">
          {/* Top Admin Header */}
          <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-background/80 px-4 sm:px-6 backdrop-blur">
            <div className="flex items-center gap-3">
              {/* Mobile Drawer Trigger */}
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Mở menu quản trị">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 p-5 flex flex-col justify-between">
                  <div>
                    <SheetHeader className="text-left mb-6">
                      <SheetTitle className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center">
                          <Shield className="h-4 w-4" />
                        </div>
                        <span className="font-bold text-base">FinVault Admin</span>
                      </SheetTitle>
                    </SheetHeader>
                    {renderNavLinks(() => setMobileOpen(false))}
                  </div>

                  <div className="space-y-2 border-t border-border/60 pt-4">
                    <Link
                      to="/app"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      <span>Về ví người dùng</span>
                    </Link>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                </SheetContent>
              </Sheet>

              <div className="flex items-center gap-2.5">
                <span className="text-sm font-bold text-foreground">Bảng điều khiển Quản trị viên</span>
                <Badge className="hidden sm:inline-flex bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-none text-[11px] font-semibold gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Hệ thống ổn định
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Cổng thanh toán status */}
              <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground font-medium">
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  VNPAY Gateway
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <Activity className="h-3.5 w-3.5" />
                  Napas Settlement
                </span>
              </div>

              {/* User Avatar Chip */}
              <div className="flex items-center gap-2.5 pl-2 border-l border-border">
                <div className="text-right text-xs hidden sm:block">
                  <p className="font-bold text-foreground leading-tight">{user?.username || 'admin_super'}</p>
                  <p className="text-[11px] text-muted-foreground font-mono">{user?.email || 'admin@finvault.vn'}</p>
                </div>
                <Avatar className="h-8 w-8 border border-border">
                  <AvatarFallback className="bg-destructive/10 text-destructive font-bold text-xs">
                    {user?.username ? user.username[0].toUpperCase() : 'A'}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <Outlet />
          </main>

          {/* Commercial Footer */}
          <footer className="border-t border-border py-4 px-6 text-center text-xs text-muted-foreground bg-card/40">
            <p>© 2026 FinVault Management Portal. Hệ thống Giám sát & Quản trị Rủi ro Tài chính số. Phiên bản v2.4.0-enterprise.</p>
          </footer>
        </div>
      </div>
    </div>
  )
}

export default AdminLayout
