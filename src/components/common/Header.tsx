import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Settings,
  Menu,
  X,
  LogOut,
  User as UserIcon,
  LogIn,
  UserPlus
} from 'lucide-react'
import { useAuthStore } from '@/features/auth/stores/useAuthStore'
import { NotificationBell } from '@/features/notification/components/NotificationBell'

interface NavItem {
  label: string
  href: string
}

const navItems: NavItem[] = [
  { label: 'Trang chủ', href: '/' },
  { label: 'Bảng điều khiển', href: '/dashboard' },
  { label: 'Giao dịch', href: '/transactions' },
  { label: 'Ví của tôi', href: '/wallet' },
  { label: 'Hồ sơ & KYC', href: '/profile' }
]

export function Header() {
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const user = useAuthStore((state) => state.user)
  const signOut = useAuthStore((state) => state.signOut)

  const userInitials = (() => {
    if (!user) return 'U'
    if (user.firstName) {
      return `${user.firstName[0]}${user.lastName ? user.lastName[0] : ''}`.toUpperCase()
    }
    if (user.username) {
      return user.username[0]?.toUpperCase() || 'U'
    }
    if (user.email) {
      return user.email[0]?.toUpperCase() || 'U'
    }
    return 'U'
  })()

  const displayName = (() => {
    if (!user) return ''
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim()
    return fullName || user.username || user.email || 'Người dùng'
  })()

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-card/90 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Brand / Logo */}
        <div className="flex items-center gap-6">
          <Link
            to="/"
            className="text-xl font-bold tracking-tight text-primary transition-opacity hover:opacity-90"
          >
            FinVault
          </Link>
        </div>

        {/* Center: Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`relative py-4 transition-colors ${
                  isActive
                    ? 'text-primary font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {item.label}
                {isActive && (
                  <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary rounded-full" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Right: Actions (State depends on logged in vs guest) */}
        <div className="flex items-center gap-2 sm:gap-3">
          {user ? (
            /* ── Case 1: USER IS LOGGED IN ── */
            <>
              {/* Notifications component */}
              <NotificationBell />

              {/* Settings button */}
              <button
                type="button"
                className="rounded-lg p-2 text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
                aria-label="Cài đặt"
              >
                <Settings className="size-4" />
              </button>

              {/* User Avatar with Dropdown */}
              <div className="relative ml-1">
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 rounded-full ring-1 ring-border/80 hover:ring-primary transition-all focus:outline-none"
                  aria-label="Tài khoản người dùng"
                >
                  <div className="relative flex size-8 shrink-0 overflow-hidden rounded-full bg-primary/20 text-primary items-center justify-center font-bold text-xs">
                    {userInitials}
                  </div>
                </button>

                {/* Dropdown Menu */}
                {dropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setDropdownOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 origin-top-right rounded-xl border border-border bg-card p-1.5 shadow-xl z-50 text-foreground animate-in fade-in zoom-in-95 duration-100">
                      <div className="px-3 py-2 border-b border-border/50">
                        <p className="text-xs font-semibold text-foreground truncate">
                          {displayName}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {user.email || ''}
                        </p>
                      </div>

                      <div className="py-1 space-y-0.5">
                        <Link
                          to="/dashboard"
                          onClick={() => setDropdownOpen(false)}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        >
                          <UserIcon className="size-3.5" />
                          Bảng điều khiển cá nhân
                        </Link>
                      </div>

                      <div className="pt-1 border-t border-border/50">
                        <button
                          type="button"
                          onClick={() => {
                            setDropdownOpen(false)
                            signOut()
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <LogOut className="size-3.5" />
                          Đăng xuất
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            /* ── Case 2: GUEST (NOT LOGGED IN) ── */
            <div className="flex items-center gap-2">
              <Link
                to="/signin"
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs sm:text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                <LogIn className="size-3.5" />
                <span>Đăng nhập</span>
              </Link>
              <Link
                to="/signup"
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-primary-foreground shadow-sm shadow-primary/25 hover:bg-primary/90 transition-all active:scale-95"
              >
                <UserPlus className="size-3.5" />
                <span>Đăng ký</span>
              </Link>
            </div>
          )}

          {/* Mobile hamburger menu toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden rounded-lg p-2 text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors ml-1"
            aria-label="Menu"
          >
            {mobileMenuOpen ? (
              <X className="size-5" />
            ) : (
              <Menu className="size-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile navigation collapse */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border/50 bg-card px-4 pt-2 pb-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.href
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-muted-foreground hover:bg-muted/40 hover:text-foreground'
                }`}
              >
                {item.label}
              </Link>
            )
          })}

          {!user && (
            <div className="pt-2 mt-2 border-t border-border/40 grid grid-cols-2 gap-2">
              <Link
                to="/signin"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-1.5 rounded-lg border border-border/70 py-2 text-xs font-semibold text-foreground hover:bg-muted"
              >
                <LogIn className="size-3.5" />
                Đăng nhập
              </Link>
              <Link
                to="/signup"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-1.5 rounded-lg bg-primary py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
              >
                <UserPlus className="size-3.5" />
                Đăng ký
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  )
}
