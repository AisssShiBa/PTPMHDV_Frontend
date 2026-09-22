import { BrowserRouter, Route, Routes } from 'react-router-dom'
import SignInPage from './pages/SignInPage'
import SignUpPage from './pages/SignUpPage'
import { Toaster } from 'sonner'
import ProtectRoute from './features/auth/components/ProtectRoute'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import Wallet from './pages/Wallet'
import Transactions from './pages/Transactions'
import Profile from './pages/Profile'
import MerchantRegister from './pages/MerchantRegister'
import MainLayout from './layouts/MainLayout'

// Admin Portal
import AdminLayout from './layouts/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminKyc from './pages/admin/AdminKyc'
import AdminMerchants from './pages/admin/AdminMerchants'

function App() {
  return (
    <>
      <Toaster />

      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/signup" element={<SignUpPage />} />

          {/* Main User App with Header & Footer */}
          <Route element={<MainLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/wallet" element={<Wallet />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/merchant/register" element={<MerchantRegister />} />
          </Route>

          {/* Admin Portal Layout (Chỉ Admin) */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="kyc" element={<AdminKyc />} />
            <Route path="merchants" element={<AdminMerchants />} />
          </Route>

          {/* Protected routes */}
          <Route element={<ProtectRoute />}>
            {/* Các route yêu cầu đăng nhập mở rộng */}
          </Route>
        </Routes>
      </BrowserRouter>
    </>
  )
}

export default App
