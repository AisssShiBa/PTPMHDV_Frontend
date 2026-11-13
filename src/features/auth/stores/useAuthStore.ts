import { create } from 'zustand'
import { toast } from 'sonner'
import { authApi } from '../api/auth.api'
import { errorMessage } from '@/lib/apiResponse'
import type { AuthState, AuthSession } from '../types/auth.types'
import { MOCK_AUTH_USER } from '../fixtures/auth.fixtures'

// Re-export tạm thời cho unit test (axios.test.ts) trước khi test chuyển sang import từ fixtures
export const MOCK_USER = MOCK_AUTH_USER

let refreshInFlight: Promise<boolean> | null = null
let generation = 0

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  user: null,
  loading: false,
  initialized: false,

  clearState: () => {
    generation += 1
    set({ accessToken: null, user: null, initialized: true })
  },

  setSession: (session: AuthSession) => {
    generation += 1
    set({
      accessToken: session.accessToken,
      user: session.user,
      initialized: true
    })
  },

  signIn: async (username: string, password: string) => {
    if (get().loading) return false
    set({ loading: true })
    const current = ++generation

    try {
      if (refreshInFlight) await refreshInFlight

      const session = await authApi.signIn({ username, password })

      if (current !== generation) return false
      set({
        accessToken: session.accessToken,
        user: session.user,
        initialized: true
      })
      toast.success('Đăng nhập thành công')
      return true
    } catch (error) {
      toast.error(errorMessage(error))
      return false
    } finally {
      set({ loading: false })
    }
  },

  signOut: async () => {
    if (get().loading) return
    get().clearState()
    set({ loading: true })
    try {
      if (refreshInFlight) await refreshInFlight
      await authApi.signOut()
      toast.success('Đã đăng xuất')
    } catch {
      // Vẫn đảm bảo xóa sạch session ở client dù backend có trả lỗi
    } finally {
      set({ loading: false })
    }
  },

  initialize: async () => {
    if (!get().initialized) {
      await get().refresh()
    }
  },

  refresh: () => {
    if (refreshInFlight) return refreshInFlight
    const current = generation

    refreshInFlight = (async () => {
      try {
        const session = await authApi.refresh()
        if (current !== generation) return false
        set({
          accessToken: session.accessToken,
          user: session.user,
          initialized: true
        })
        return true
      } catch {
        if (current === generation) {
          get().clearState()
        }
        return false
      } finally {
        refreshInFlight = null
      }
    })()

    return refreshInFlight
  }
}))
