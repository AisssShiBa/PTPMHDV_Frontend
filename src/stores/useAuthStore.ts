import { create } from 'zustand'
import { toast } from 'sonner'
import { authService } from '@/services/authService'
import type { authState } from '@/types/store'
export const useAuthStore = create<authState>((set, get) => ({
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
      toast.success('đăng ký thành công')
    } catch (error) {
      ;(console.error(error), toast.error('đăng ký không thành công'))
    } finally {
      set({ loading: false })
    }
  },
  signIn: async (username, password) => {
    set({ loading: true })
    try {
      const data = await authService.signIn(username, password)

      get().setAccessToken(data.accessToken)
      await get().fetchMe()
      toast.success('đăng nhập thành công')
    } catch (error) {
      ;(console.error(error), toast.error('đăng nhập không thành công'))
    } finally {
      set({ loading: false })
    }
  },
  signOut: async () => {
    try {
      get().clearState()
      await authService.signOut()
      toast.success('đăng xuất thành công')
    } catch (error) {
      console.error(error)
      toast.error('đăng xuất không thành công')
    }
  },
  fetchMe: async () => {
    try {
      set({ loading: true })
      const user = await authService.FetchMe()
      set({ user })
    } catch (error) {
      console.error(error)
      set({ user: null, accessToken: null })
      toast.error('Lỗi lấy dữ liệu người dùng')
    } finally {
      set({ loading: false })
    }
  },
  refresh: async () => {
    try {
      set({ loading: true })
      const { user } = get()
      const accessToken = await authService.refresh()
      set({ accessToken })
      if (accessToken && !user) await get().fetchMe()
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
}))
