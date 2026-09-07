import { Link } from 'react-router-dom'

interface FooterLink {
  label: string
  href: string
}

const footerLinks: FooterLink[] = [
  { label: 'Chính sách bảo mật', href: '/privacy' },
  { label: 'Điều khoản dịch vụ', href: '/terms' },
  { label: 'Bảo mật', href: '/security' },
  { label: 'Trung tâm trợ giúp', href: '/help' },
]

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="mt-auto w-full border-t border-border/50 bg-card/60 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-5 sm:flex-row sm:px-6 lg:px-8">
        
        {/* Left: Brand Name */}
        <div className="flex items-center">
          <span className="text-sm font-bold tracking-tight text-foreground">
            FinVault Digital.
          </span>
        </div>

        {/* Center: Footer Links */}
        <nav
          className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground"
          aria-label="Footer Navigation"
        >
          {footerLinks.map((link) => (
            <Link
              key={link.label}
              to={link.href}
              className="hover:text-foreground transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right: Copyright */}
        <div className="text-xs text-muted-foreground text-center sm:text-right">
          © {currentYear} FinVault Digital. All rights reserved.
        </div>

      </div>
    </footer>
  )
}
