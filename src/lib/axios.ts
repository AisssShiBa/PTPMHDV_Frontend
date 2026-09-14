// D:\PTPMHDV\Frontend\src\lib\axios.ts
import { useAuthStore } from '@/features/auth/stores/useAuthStore'
import axios from 'axios'

const api = axios.create({
  baseURL:
    import.meta.env.MODE === 'development'
      ? 'http://localhost:3000/api' // 👈 Cổng 3000 của API Gateway
      : '/api',
  withCredentials: true // 👈 Bắt buộc để tự động gửi/nhận Cookie refreshToken
})

// 1. Gắn Bearer Token vào Header trước khi gửi request đi
api.interceptors.request.use((req) => {
  const { accessToken } = useAuthStore.getState()
  if (accessToken) {
    req.headers.Authorization = `Bearer ${accessToken}`
  }
  return req
})

// 2. Bắt lỗi 401 để tự động làm mới Token ngầm (Silent Refresh)
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config

    // Không kích hoạt refresh nếu chính request auth đang lỗi
    if (
      !originalRequest ||
      originalRequest.url?.includes('/auth/signin') ||
      originalRequest.url?.includes('/auth/signup') ||
      originalRequest.url?.includes('/auth/refresh')
    ) {
      return Promise.reject(error)
    }

    originalRequest._retryCount = originalRequest._retryCount || 0

    // Khi Token hết hạn (Mã 401) và chưa thử quá 2 lần
    if (error.response?.status === 401 && originalRequest._retryCount < 2) {
      originalRequest._retryCount += 1

      try {
        // Gọi API lấy Access Token mới bằng HttpOnly Cookie
        const res = await api.post('/auth/refresh', {}, { withCredentials: true })
        const newAccessToken = res.data?.data?.accessToken ?? res.data?.accessToken

        if (newAccessToken) {
          // Lưu token mới vào Zustand store
          useAuthStore.getState().setAccessToken(newAccessToken)

          // Gắn token mới vào request bị lỗi lúc nãy và gửi lại
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
          return api(originalRequest)
        }
      } catch (refreshError) {
        // Refresh token cũng hết hạn -> Xóa session và bắt đăng nhập lại
        useAuthStore.getState().clearState()
        return Promise.reject(refreshError)
      }
    }

    return Promise.reject(error)
  }
)

export default api
