import axios, { type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/features/auth/stores/useAuthStore'

interface SessionRequest extends InternalAxiosRequestConfig {
  _retried?: boolean
  _owner?: string
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:3000/api' : '/api'),
  withCredentials: true,
  timeout: 20000
})

api.interceptors.request.use((req: SessionRequest) => {
  const { accessToken, user } = useAuthStore.getState()
  if (accessToken) req.headers.set('Authorization', 'Bearer ' + accessToken)
  else req.headers.delete('Authorization')
  req._owner = user?.id
  return req
})

api.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) return Promise.reject(error)
    const original = error.config as SessionRequest | undefined
    if (!original || original.signal?.aborted || original.url?.startsWith('/auth/') ||
        error.response?.status !== 401 || original._retried) {
      return Promise.reject(error)
    }
    const before = useAuthStore.getState()
    // Never replay a previous account's request with a new account's token.
    if (!original._owner || original._owner !== before.user?.id) return Promise.reject(error)
    original._retried = true
    const sentToken = original.headers.get('Authorization')
    if (sentToken === 'Bearer ' + before.accessToken) {
      if (!await before.refresh()) return Promise.reject(error)
    }
    const after = useAuthStore.getState()
    if (!after.accessToken || original._owner !== after.user?.id || original.signal?.aborted) {
      return Promise.reject(error)
    }
    return api(original)
  }
)

export default api
