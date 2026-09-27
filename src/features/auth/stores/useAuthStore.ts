import { create } from 'zustand'
import { toast } from 'sonner'
import { authService } from '@/features/auth/services/authService'
import { errorMessage } from '@/lib/apiResponse'
import type { authState } from '@/types/store'

let refreshInFlight: Promise<boolean> | null = null
let generation = 0

export const useAuthStore = create<authState>((set, get) => ({
  accessToken: null,
  user: null,
  loading: false,
  initialized: false,
  clearState: () => {
    generation += 1
    set({ accessToken: null, user: null, initialized: true })
  },
  signUp: async (username, password, email, firstName, lastName) => {
    if (get().loading) return false
    set({ loading: true })
    try {
      await authService.signUp(username, password, email, firstName, lastName)
      toast.success('Đăng ký thành công. Bạn có thể đăng nhập.')
      return true
    } catch (error) {
      toast.error(errorMessage(error))
      return false
    } finally {
      set({ loading: false })
    }
  },
  signIn: async (username, password) => {
    if (get().loading) return false
    set({ loading: true })
    const current = ++generation
    try {
      // Finish cookie rotation before establishing a new session.
      if (refreshInFlight) await refreshInFlight
      const session = await authService.signIn(username, password)
      if (current !== generation) return false
      set({ ...session, initialized: true })
      toast.success('Đăng nhập thành công')
      return true
    } catch (error) {
      if (current === generation) toast.error(errorMessage(error))
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
      // A pending refresh must not recreate a cookie after signout.
      if (refreshInFlight) await refreshInFlight
      await authService.signOut()
      toast.success('Đã đăng xuất')
    } catch (error) {
      toast.error(errorMessage(error))
    } finally {
      set({ loading: false })
    }
  },
  initialize: async () => {
    if (!get().initialized) await get().refresh()
  },
  refresh: () => {
    if (refreshInFlight) return refreshInFlight
    const current = generation
    refreshInFlight = (async () => {
      try {
        const session = await authService.refresh()
        if (current !== generation) return false
        set({ ...session, initialized: true })
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
