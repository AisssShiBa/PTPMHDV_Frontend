import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Send,
  ArrowDownCircle,
  ArrowUpCircle,
  Receipt,
  History,
  UserCheck,
  Store,
  Shield,
  Menu,
  Bell,
  Search,
  LogOut,
  Wallet
} from 'lucide-react'
import { useAuthStore } from '@/features/auth/stores/useAuthStore'
import { formatVndExact } from '@/lib/format'
import { useWalletBalance } from '@/features/wallet'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

interface NavItem {
  label: string
  to: string
  icon: React.ComponentType<{ className?: string }>
}

const mainNavItems: NavItem[] = [
  { label: 'Tổng quan', to: '/app', icon: LayoutDashboard },
  { label: 'Chuyển tiền', to: '/app/transfer', icon: Send },
  { label: 'Nạp tiền', to: '/app/topup', icon: ArrowDownCircle },
  { label: 'Rút tiền', to: '/app/withdraw', icon: ArrowUpCircle },
  { label: 'Thanh toán & Nạp ĐT', to: '/app/utilities', icon: Receipt },
  { label: 'Lịch sử giao dịch', to: '/app/transactions', icon: History },
  { label: 'Hồ sơ & KYC', to: '/app/profile', icon: UserCheck }
]

export function MainLayout() {
  const { user, signOut } = useAuthStore()
  const wallet = useWalletBalance()
  const displayedBalance = wallet.isError ? 'Chưa tải được' : wallet.data ? `${formatVndExact(wallet.data.availableBalance)} ₫` : 'Đang tải…'
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/sign-in')
  }

  const renderNavLinks = (onItemClick?: () => void) => (
    <div className="flex flex-col gap-1">
      {mainNavItems.map((item) => {
        const Icon = item.icon
        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/app'}
            onClick={onItemClick}
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

      <div className="my-3 border-t border-border/60 pt-3">
        <p className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1">
          Dịch vụ mở rộng
        </p>

        <NavLink
          to="/merchant"
          onClick={onItemClick}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              isActive
                ? 'bg-primary text-primary-foreground font-semibold'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`
          }
        >
          <Store className="h-4 w-4 shrink-0" />
          <span>Cổng Merchant</span>
        </NavLink>

        {user?.role === 'ADMIN' && (
          <NavLink
            to="/admin"
            onClick={onItemClick}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground font-semibold'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`
            }
          >
            <Shield className="h-4 w-4 shrink-0 text-amber-500" />
            <span>Quản trị Admin</span>
          </NavLink>
        )}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <div className="flex flex-1">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex w-64 border-r border-border bg-card/70 flex-col justify-between shrink-0 fixed top-0 bottom-0 left-0 z-30">
          <div className="flex flex-col h-full overflow-y-auto p-4">
            {/* Brand Logo */}
            <Link to="/app" className="flex items-center gap-3 px-2 py-4 mb-4">
              <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-sm">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <span className="text-xl font-bold tracking-tight text-primary">FinVault</span>
                <p className="text-xs text-muted-foreground">Ví điện tử cá nhân</p>
              </div>
            </Link>

            {/* Navigation */}
            <nav className="flex-1">{renderNavLinks()}</nav>

            {/* Quick balance card in sidebar */}
            <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-3.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Số dư khả dụng</span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/30 text-primary">
                  Cấp {user?.kycTier ?? 0}
                </Badge>
              </div>
              <p className="mt-1 text-base font-bold text-primary">
                {displayedBalance}
              </p>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col lg:pl-64">
          {/* Top Navbar */}
          <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-border bg-background/80 px-4 sm:px-6 backdrop-blur">
            <div className="flex items-center gap-3">
              {/* Mobile Drawer Trigger */}
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Mở menu">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 p-4">
                  <SheetHeader className="text-left mb-4">
                    <SheetTitle className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
                        <Wallet className="h-4 w-4" />
                      </div>
                      <span className="font-bold text-primary">FinVault</span>
                    </SheetTitle>
                  </SheetHeader>
                  <div className="overflow-y-auto">
                    {renderNavLinks(() => setMobileOpen(false))}
                  </div>
                </SheetContent>
              </Sheet>

              {/* Search Bar */}
              <div className="relative hidden sm:block w-64 md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Tìm giao dịch, dịch vụ..."
                  className="h-9 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>

            {/* Topbar Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Chip Số dư */}
              <div className="hidden sm:flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs">
                <span className="text-muted-foreground">Số dư:</span>
                <span className="font-semibold text-primary">{displayedBalance}</span>
              </div>

              {/* Chip Cấp KYC */}
              <Badge variant="secondary" className="text-xs font-medium">
                Cấp {user?.kycTier ?? 0}
              </Badge>

              {/* Slot chuông thông báo */}
              <Button
                variant="ghost"
                size="icon"
                className="relative rounded-full text-muted-foreground hover:text-foreground cursor-pointer"
                aria-label="Thông báo"
                onClick={() => navigate('/app/notifications')}
              >
                <Bell className="h-5 w-5" />
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-red-600 text-white text-[10px] font-bold shadow-xs">
                  3
                </span>
              </Button>

              {/* User Avatar Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button aria-label="Tài khoản" variant="ghost" className="relative h-9 w-9 rounded-full p-0">
                    <Avatar className="h-9 w-9 border border-border">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold text-xs">
                        {user?.firstName ? user.firstName[0] : (user?.username?.[0]?.toUpperCase() ?? 'U')}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user?.firstName ? `${user.lastName || ''} ${user.firstName}` : user?.username}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/app/profile')}>
                    <UserCheck className="mr-2 h-4 w-4" />
                    <span>Hồ sơ & KYC</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/app/notifications')}>
                    <Bell className="mr-2 h-4 w-4" />
                    <span>Thông báo (3 mới)</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/app/transfer')}>
                    <Send className="mr-2 h-4 w-4" />
                    <span>Chuyển tiền nhanh</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Đăng xuất</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          {/* Page Outlet */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <Outlet />
          </main>

          {/* Educational project notice */}
          <footer className="border-t border-border py-4 px-6 text-center text-xs text-muted-foreground bg-card/40">
            <p>FinVault là đồ án học tập mô phỏng ví điện tử, không phải dịch vụ tài chính thật.</p>
          </footer>
        </div>
      </div>
    </div>
  )
}

export default MainLayout
