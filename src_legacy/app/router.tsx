import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { RequireAuth, RequireRole } from './guards'
import MainLayout from '@/layouts/MainLayout'
import AdminLayout from '@/layouts/AdminLayout'

// Lazy load các trang theo quy định tại mục 9 frontend_rules.md
const SignInPage = lazy(() => import('@/pages/SignInPage'))
const SignUpPage = lazy(() => import('@/pages/SignUpPage'))
const Home = lazy(() => import('@/pages/Home'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const Wallet = lazy(() => import('@/pages/Wallet'))
const Transactions = lazy(() => import('@/pages/Transactions'))
const Profile = lazy(() => import('@/pages/Profile'))
const MerchantRegister = lazy(() => import('@/pages/MerchantRegister'))

const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'))
const AdminKyc = lazy(() => import('@/pages/admin/AdminKyc'))
const AdminMerchants = lazy(() => import('@/pages/admin/AdminMerchants'))
const AdminTopups = lazy(() => import('@/pages/admin/AdminTopups'))

function PageFallback() {
  return (
    <div className="flex h-64 w-full items-center justify-center text-muted-foreground" role="status">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  )
}

function RootErrorElement() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center bg-background">
      <h2 className="text-2xl font-bold text-destructive">Đã xảy ra sự cố không mong muốn</h2>
      <p className="mt-2 text-sm text-muted-foreground">Vui lòng tải lại trang hoặc liên hệ quản trị viên.</p>
      <button
        onClick={() => window.location.reload()}
        className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Tải lại trang
      </button>
    </div>
  )
}

function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <h1 className="text-6xl font-extrabold text-primary">404</h1>
      <h2 className="mt-4 text-xl font-semibold text-foreground">Không tìm thấy trang</h2>
      <p className="mt-2 text-sm text-muted-foreground">Trang bạn đang tìm kiếm không tồn tại hoặc đã được di chuyển.</p>
    </div>
  )
}

export const router = createBrowserRouter([
  {
    path: '/',
    errorElement: <RootErrorElement />,
    children: [
      {
        path: 'signin',
        element: (
          <Suspense fallback={<PageFallback />}>
            <SignInPage />
          </Suspense>
        )
      },
      {
        path: 'signup',
        element: (
          <Suspense fallback={<PageFallback />}>
            <SignUpPage />
          </Suspense>
        )
      },
      {
        element: <MainLayout />,
        children: [
          {
            index: true,
            element: (
              <Suspense fallback={<PageFallback />}>
                <Home />
              </Suspense>
            )
          },
          {
            element: <RequireAuth />,
            children: [
              {
                path: 'dashboard',
                element: (
                  <Suspense fallback={<PageFallback />}>
                    <Dashboard />
                  </Suspense>
                )
              },
              {
                path: 'wallet',
                element: (
                  <Suspense fallback={<PageFallback />}>
                    <Wallet />
                  </Suspense>
                )
              },
              {
                path: 'transactions',
                element: (
                  <Suspense fallback={<PageFallback />}>
                    <Transactions />
                  </Suspense>
                )
              },
              {
                path: 'profile',
                element: (
                  <Suspense fallback={<PageFallback />}>
                    <Profile />
                  </Suspense>
                )
              },
              {
                path: 'merchant-register',
                element: (
                  <Suspense fallback={<PageFallback />}>
                    <MerchantRegister />
                  </Suspense>
                )
              },
              {
                path: 'merchant/register',
                element: <Navigate to="/merchant-register" replace />
              }
            ]
          }
        ]
      },
      {
        path: 'admin',
        element: <RequireAuth />,
        children: [
          {
            element: <RequireRole role="ADMIN" />,
            children: [
              {
                element: <AdminLayout />,
                children: [
                  {
                    index: true,
                    element: (
                      <Suspense fallback={<PageFallback />}>
                        <AdminDashboard />
                      </Suspense>
                    )
                  },
                  {
                    path: 'kyc',
                    element: (
                      <Suspense fallback={<PageFallback />}>
                        <AdminKyc />
                      </Suspense>
                    )
                  },
                  {
                    path: 'merchants',
                    element: (
                      <Suspense fallback={<PageFallback />}>
                        <AdminMerchants />
                      </Suspense>
                    )
                  },
                  {
                    path: 'topups',
                    element: (
                      <Suspense fallback={<PageFallback />}>
                        <AdminTopups />
                      </Suspense>
                    )
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        path: '*',
        element: <NotFoundPage />
      }
    ]
  }
])
