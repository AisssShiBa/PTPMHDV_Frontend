import { BrowserRouter, Route, Routes } from 'react-router-dom'
import SignInPage from './pages/SignInPage'
import SignUpPage from './pages/SignUpPage'
import { Toaster } from 'sonner'
import ProtectRoute from './features/auth/components/ProtectRoute'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import Wallet from './pages/Wallet' // <--- 1. Import trang Wallet
import MainLayout from './layouts/MainLayout'
import Transactions from './pages/Transactions'

function App() {
  return (
    <>
      <Toaster />

      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/signup" element={<SignUpPage />} />

          {/* Main pages with Header & Footer */}
          <Route element={<MainLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/wallet" element={<Wallet />} />{' '}
            {/* <--- 2. Khai báo Route /wallet */}
          </Route>

          {/* Protected routes */}
          <Route element={<ProtectRoute />}>
            {/* Các route yêu cầu đăng nhập */}
          </Route>
        </Routes>
      </BrowserRouter>
    </>
  )
}

export default App
