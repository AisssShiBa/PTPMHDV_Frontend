import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'
import { useAuthStore } from './features/auth/stores/useAuthStore'
import ProtectRoute from './features/auth/components/ProtectRoute'
import SignInPage from './pages/SignInPage'
import SignUpPage from './pages/SignUpPage'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import Wallet from './pages/Wallet'
import Transactions from './pages/Transactions'
import Profile from './pages/Profile'
import MerchantRegister from './pages/MerchantRegister'
import MainLayout from './layouts/MainLayout'
import AdminLayout from './layouts/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminKyc from './pages/admin/AdminKyc'
import AdminMerchants from './pages/admin/AdminMerchants'

function App() {
  const initialize = useAuthStore((state) => state.initialize)
  useEffect(() => { void initialize() }, [initialize])
  return (
    <>
      <Toaster />
      <BrowserRouter>
        <Routes>
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route element={<MainLayout />}>
            <Route path="/" element={<Home />} />
            <Route element={<ProtectRoute />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/wallet" element={<Wallet />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/merchant-register" element={<MerchantRegister />} />
              <Route path="/merchant/register" element={<Navigate to="/merchant-register" replace />} />
            </Route>
          </Route>
          <Route element={<ProtectRoute />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="kyc" element={<AdminKyc />} />
              <Route path="merchants" element={<AdminMerchants />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </>
  )
}

export default App
