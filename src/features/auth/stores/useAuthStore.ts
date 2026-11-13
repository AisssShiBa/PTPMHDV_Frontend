import { create } from 'zustand'
import { toast } from 'sonner'
import { authApi } from '../api/auth.api'
import { errorMessage } from '@/lib/apiResponse'
import type { AuthState, AuthSession, User } from '../types/auth.types'

let refreshInFlight: Promise<boolean> | null = null
let generation = 0

// Tài khoản mẫu phục vụ việc kiểm thử giao diện trong giai đoạn dựng móng (Prompt A)
export const MOCK_USER: User = {
  id: '00000000-0000-0000-0000-000000000001',
  username: 'annguyen',
  email: 'an.nguyen@finvault.local',
  firstName: 'An',
  lastName: 'Nguyễn',
  role: 'USER',
  kycTier: 1,
  balance: '1250000'
}

export const MOCK_ADMIN: User = {
  id: '00000000-0000-0000-0000-000000000002',
  username: 'admin',
  email: 'admin@finvault.local',
  firstName: 'Quản trị',
  lastName: 'Viên',
  role: 'ADMIN',
  kycTier: 2,
  balance: '50000000'
}

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

  signIn: async (username, password) => {
    if (get().loading) return false
    set({ loading: true })
    const current = ++generation

    try {
      if (refreshInFlight) await refreshInFlight

      const session = await authApi.signIn({ username, password })
      if (current !== generation) return false
      set({ accessToken: session.accessToken, user: session.user, initialized: true })
      toast.success('Đăng nhập thành công')
      return true
    } catch (error) {
      if (current === generation) {
        get().clearState()
        toast.error(errorMessage(error))
      }
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
    } catch (error) {
      toast.error(errorMessage(error))
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
        set({ accessToken: session.accessToken, user: session.user, initialized: true })
        return true
      } catch {
        if (current === generation) get().clearState()
        return false
      } finally {
        refreshInFlight = null
      }
    })()

    return refreshInFlight
  }
}))
