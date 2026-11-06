import { QueryClient } from '@tanstack/react-query'
import axios from 'axios'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30s theo quy tắc
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // Không retry khi gặp mã lỗi 4xx (400, 401, 403, 404, 409...)
        if (axios.isAxiosError(error)) {
          const status = error.response?.status
          if (status && status >= 400 && status < 500) {
            return false
          }
        }
        return failureCount < 1 // Retry tối đa 1 lần cho lỗi mạng / 5xx
      }
    },
    mutations: {
      retry: false
    }
  }
})
