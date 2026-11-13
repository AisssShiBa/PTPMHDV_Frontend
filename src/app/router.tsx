import { createBrowserRouter, Navigate } from 'react-router-dom'
import { MainLayout } from '@/layouts/MainLayout'
import { AuthLayout } from '@/layouts/AuthLayout'
import { AdminLayout } from '@/layouts/AdminLayout'
import { RequireAuth, RequireRole, RedirectIfAuthed } from './guards'
import { RoutePage } from './RoutePage'
import { TopupResult, HomePage, SignInPage, SignUpPage, QrLoginPage, DashboardPage, TransferPage, TopupPage, WithdrawPage, TransactionsPage, ProfilePage, UtilitiesPage, NotificationsPage, MerchantPortalPage, MerchantRegisterPage, AdminDashboardPage, AdminKycPage, AdminReconciliationPage, AdminTopupPage, ForbiddenPage, NotFoundPage } from './routePages'

export const router = createBrowserRouter([
  // 1. Công khai (Landing Page)
  {
    path: '/',
    element: (
      <RedirectIfAuthed>
        <RoutePage page={HomePage} />
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
      { path: 'sign-in', element: <RoutePage page={SignInPage} /> },
      { path: 'sign-up', element: <RoutePage page={SignUpPage} /> },
      { path: 'qr-login', element: <RoutePage page={QrLoginPage} /> }
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
      { index: true, element: <RoutePage page={DashboardPage} /> },
      { path: 'transfer', element: <RoutePage page={TransferPage} /> },
      { path: 'topup', element: <RoutePage page={TopupPage} /> },
      { path: 'topup/result', element: <RoutePage page={TopupResult} /> },
      { path: 'withdraw', element: <RoutePage page={WithdrawPage} /> },
      { path: 'transactions', element: <RoutePage page={TransactionsPage} /> },
      { path: 'profile', element: <RoutePage page={ProfilePage} /> },
      { path: 'utilities', element: <RoutePage page={UtilitiesPage} /> },
      { path: 'notifications', element: <RoutePage page={NotificationsPage} /> }
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
      { index: true, element: <RoutePage page={MerchantPortalPage} /> },
      { path: 'register', element: <RoutePage page={MerchantRegisterPage} /> }
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
      { index: true, element: <RoutePage page={AdminDashboardPage} /> },
      { path: 'kyc', element: <RoutePage page={AdminKycPage} /> },
      { path: 'reconciliation', element: <RoutePage page={AdminReconciliationPage} /> },
      { path: 'topups', element: <RoutePage page={AdminTopupPage} /> }
    ]
  },

  // 6. Lỗi quyền và không tìm thấy trang
  {
    path: '403',
    element: <RoutePage page={ForbiddenPage} />
  },
  {
    path: '404',
    element: <RoutePage page={NotFoundPage} />
  },
  {
    path: '*',
    element: <Navigate to="/404" replace />
  }
])
