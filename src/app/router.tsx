import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { MainLayout } from '@/layouts/MainLayout'
import { AuthLayout } from '@/layouts/AuthLayout'
import { AdminLayout } from '@/layouts/AdminLayout'
import { RequireAuth, RequireRole, RedirectIfAuthed } from './guards'
import { Loader2 } from 'lucide-react'

// Lazy load các trang
const HomePage = lazy(() => import('@/pages/HomePage'))
const SignInPage = lazy(() => import('@/pages/SignInPage'))
const SignUpPage = lazy(() => import('@/pages/SignUpPage'))
const QrLoginPage = lazy(() => import('@/pages/QrLoginPage'))

const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const TransferPage = lazy(() => import('@/pages/TransferPage'))
const TopupPage = lazy(() => import('@/pages/TopupPage'))
const WithdrawPage = lazy(() => import('@/pages/WithdrawPage'))
const TransactionsPage = lazy(() => import('@/pages/TransactionsPage'))
const ProfilePage = lazy(() => import('@/pages/ProfilePage'))
const UtilitiesPage = lazy(() => import('@/pages/UtilitiesPage'))

const MerchantPortalPage = lazy(() => import('@/pages/MerchantPortalPage'))
const MerchantRegisterPage = lazy(() => import('@/pages/MerchantRegisterPage'))

const AdminDashboardPage = lazy(() => import('@/pages/AdminDashboardPage'))
const AdminKycPage = lazy(() => import('@/pages/AdminKycPage'))
const AdminReconciliationPage = lazy(() => import('@/pages/AdminReconciliationPage'))
const AdminTopupPage = lazy(() => import('@/pages/AdminTopupPage'))

const ForbiddenPage = lazy(() => import('@/pages/ForbiddenPage'))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'))
const DevComponentsPage = lazy(() => import('@/pages/DevComponentsPage'))

function PageFallback() {
  return (
    <div className="flex h-64 w-full items-center justify-center" role="status">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
    </div>
  )
}

function withSuspense(Component: React.ComponentType) {
  return (
    <Suspense fallback={<PageFallback />}>
      <Component />
    </Suspense>
  )
}

export const router = createBrowserRouter([
  // 1. Công khai (Landing Page)
  {
    path: '/',
    element: (
      <RedirectIfAuthed>
        {withSuspense(HomePage)}
      </RedirectIfAuthed>
    )
  },

  // 2. Auth Routes (AuthLayout)
  {
    element: (
      <RedirectIfAuthed>
        <AuthLayout />
      </RedirectIfAuthed>
    ),
    children: [
      { path: 'sign-in', element: withSuspense(SignInPage) },
      { path: 'sign-up', element: withSuspense(SignUpPage) },
      { path: 'qr-login', element: withSuspense(QrLoginPage) }
    ]
  },

  // 3. Ứng dụng sau đăng nhập (MainLayout + RequireAuth)
  {
    path: 'app',
    element: (
      <RequireAuth>
        <MainLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: withSuspense(DashboardPage) },
      { path: 'transfer', element: withSuspense(TransferPage) },
      { path: 'topup', element: withSuspense(TopupPage) },
      { path: 'withdraw', element: withSuspense(WithdrawPage) },
      { path: 'transactions', element: withSuspense(TransactionsPage) },
      { path: 'profile', element: withSuspense(ProfilePage) },
      { path: 'utilities', element: withSuspense(UtilitiesPage) }
    ]
  },

  // 4. Cổng Merchant (MainLayout + RequireAuth)
  {
    path: 'merchant',
    element: (
      <RequireAuth>
        <MainLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: withSuspense(MerchantPortalPage) },
      { path: 'register', element: withSuspense(MerchantRegisterPage) }
    ]
  },

  // 5. Quản trị Admin (AdminLayout + RequireRole('ADMIN'))
  {
    path: 'admin',
    element: (
      <RequireAuth>
        <RequireRole role="ADMIN">
          <AdminLayout />
        </RequireRole>
      </RequireAuth>
    ),
    children: [
      { index: true, element: withSuspense(AdminDashboardPage) },
      { path: 'kyc', element: withSuspense(AdminKycPage) },
      { path: 'reconciliation', element: withSuspense(AdminReconciliationPage) },
      { path: 'topups', element: withSuspense(AdminTopupPage) }
    ]
  },

  // 6. Trang kiểm thử components UI (Chỉ dùng nội bộ / dev)
  {
    path: 'dev/components',
    element: (
      <div className="min-h-screen bg-background p-6">
        {withSuspense(DevComponentsPage)}
      </div>
    )
  },

  // 7. Lỗi quyền và không tìm thấy trang
  {
    path: '403',
    element: withSuspense(ForbiddenPage)
  },
  {
    path: '404',
    element: withSuspense(NotFoundPage)
  },
  {
    path: '*',
    element: <Navigate to="/404" replace />
  }
])
