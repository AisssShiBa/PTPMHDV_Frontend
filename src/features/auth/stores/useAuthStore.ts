import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { toast } from 'sonner'
import { authService } from '@/features/auth/services/authService'
import type { authState } from '@/types/store'

export const useAuthStore = create<authState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      user: null,
      loading: false,

      clearState: () => {
        set({
          accessToken: null,
          user: null,
          loading: false
        })
      },

      signUp: async (username, password, email, firstName, lastName) => {
        set({ loading: true })
        try {
          await authService.signUp(username, password, email, firstName, lastName)
          // Tự động đăng nhập sau khi đăng ký thành công
          const loginData = await authService.signIn(username, password)
          const accessToken = loginData.accessToken
          const user =
            loginData.user ?? {
              id: loginData.userId ?? '',
              username,
              email,
              firstName,
              lastName
            }
          set({ accessToken, user })
          toast.success('Đăng ký thành công')
          return true
        } catch (error: any) {
          console.error(error)
          const message =
            error.response?.data?.error?.message ||
            error.response?.data?.message ||
            'Đăng ký không thành công'
          toast.error(message)
          return false
        } finally {
          set({ loading: false })
        }
      },

      signIn: async (username, password) => {
        set({ loading: true })
        try {
          const data = await authService.signIn(username, password)
          const accessToken = data.accessToken
          const user = data.user
          set({ accessToken, user })
          toast.success('Đăng nhập thành công')
          return true
        } catch (error: any) {
          console.error(error)
          const message =
            error.response?.data?.error?.message ||
            error.response?.data?.message ||
            'Đăng nhập không thành công'
          toast.error(message)
          return false
        } finally {
          set({ loading: false })
        }
      },

      signOut: async () => {
        try {
          get().clearState()
          await authService.signOut()
          toast.success('Đăng xuất thành công')
        } catch (error) {
          console.error(error)
          toast.error('Đăng xuất không thành công')
        }
      },

      refresh: async () => {
        try {
          set({ loading: true })
          const res = await authService.refresh()
          const accessToken = res.accessToken
          const user = res.user ?? get().user
          set({ accessToken, user })
        } catch (error) {
          console.error(error)
          get().clearState()
        } finally {
          set({ loading: false })
        }
      },

      setAccessToken: (accessToken) => {
        set({ accessToken })
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        accessToken: state.accessToken,
        user: state.user
      })
    }
  )
)
