import { useAuthStore } from '@/stores/useAuthStore'
import axios from 'axios'
const api = axios.create({
  baseURL:
    import.meta.env.MODE === 'development'
      ? 'http://localhost:4001/api'
      : '/api',
  withCredentials: true
})
//gắn token với request trên header
api.interceptors.request.use((req) => {
  const { accessToken } = useAuthStore.getState()
  if (accessToken) {
    req.headers.Authorization = `Bearer ${accessToken}`
  }
  return req
})
export default api
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config

    if (
      originalRequest.url.includes('/auth/signin') ||
      originalRequest.url.includes('/auth/signup') ||
      originalRequest.url.includes('/auth/refresh')
    ) {
      return Promise.reject(error)
    }
    originalRequest._retryCount = originalRequest._retryCount || 0
    if (error.response?.status === 403 && originalRequest._retryCount < 4) {
      originalRequest._retryCount += 1
      try {
        const res = await api.post('/auth/refresh', { withCredentials: true })
        const newAccesstoken = res.data.accessToken
        useAuthStore.getState().setAccessToken(newAccesstoken)
        originalRequest.headers.Authorization = `Bearer ${newAccesstoken}`
        return api(originalRequest)
      } catch (refreshError) {
        useAuthStore.getState().clearState()
        return Promise.reject(refreshError)
      }
    }
    return Promise.reject(error)
  }
)
