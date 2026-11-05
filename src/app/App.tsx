import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { Providers } from './providers'
import { router } from './router'
import { useAuthStore } from '@/features/auth/stores/useAuthStore'

export default function App() {
  const initialize = useAuthStore((state) => state.initialize)

  useEffect(() => {
    void initialize()
  }, [initialize])

  return (
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  )
}
