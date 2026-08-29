import { BrowserRouter, Route, Routes } from 'react-router-dom'

import SignInPage from './pages/SignInPage'
import SignUpPage from './pages/SignUpPage'
import Home from './pages/Home'

import { Toaster } from 'sonner'
import ProtectRoute from './components/auth/ProtectRoute'

function App() {
  return (
    <>
      <Toaster />

      <BrowserRouter>
        <Routes>
          {/* public routes */}
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/signup" element={<SignUpPage />} />

          {/* protected routes */}
          <Route element={<ProtectRoute />}>
            <Route path="/" element={<Home />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </>
  )
}

export default App
