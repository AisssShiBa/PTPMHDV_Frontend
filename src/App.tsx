import { BrowserRouter, Route, Routes } from 'react-router-dom'

import SignInPage from './pages/SignInPage'
import SignUpPage from './pages/SignUpPage'
import Home from './pages/Home'

import { Toaster } from 'sonner'

function App() {
  return (
    <>
      <Toaster />

      <BrowserRouter>
        <Routes>
          {/* public routes */}
          <Route path="/sign-in" element={<SignInPage />} />
          <Route path="/sign-up" element={<SignUpPage />} />

          {/* protected routes */}
          <Route path="/" element={<Home />} />
        </Routes>
      </BrowserRouter>
    </>
  )
}

export default App
