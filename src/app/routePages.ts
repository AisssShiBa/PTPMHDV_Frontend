import { lazy } from 'react'

// Lazy load các trang
export const HomePage = lazy(() => import('@/pages/HomePage'))
export const SignInPage = lazy(() => import('@/pages/SignInPage'))
export const SignUpPage = lazy(() => import('@/pages/SignUpPage'))
export const QrLoginPage = lazy(() => import('@/pages/QrLoginPage'))

export const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
export const TransferPage = lazy(() => import('@/pages/TransferPage'))
export const TopupPage = lazy(() => import('@/pages/TopupPage'))
export const WithdrawPage = lazy(() => import('@/pages/WithdrawPage'))
export const TransactionsPage = lazy(() => import('@/pages/TransactionsPage'))
export const ProfilePage = lazy(() => import('@/pages/ProfilePage'))
export const UtilitiesPage = lazy(() => import('@/pages/UtilitiesPage'))
export const NotificationsPage = lazy(() => import('@/pages/NotificationsPage'))

export const MerchantPortalPage = lazy(() => import('@/pages/MerchantPortalPage'))
export const MerchantRegisterPage = lazy(() => import('@/pages/MerchantRegisterPage'))

export const AdminDashboardPage = lazy(() => import('@/pages/AdminDashboardPage'))
export const AdminKycPage = lazy(() => import('@/pages/AdminKycPage'))
export const AdminReconciliationPage = lazy(() => import('@/pages/AdminReconciliationPage'))
export const AdminTopupPage = lazy(() => import('@/pages/AdminTopupPage'))

export const ForbiddenPage = lazy(() => import('@/pages/ForbiddenPage'))
export const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'))


export const TopupResult = lazy(() => import('@/pages/TopupResult'))
