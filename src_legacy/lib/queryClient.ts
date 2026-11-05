import { QueryClient } from '@tanstack/react-query'
import axios from 'axios'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30s theo frontend_rules.md
      gcTime: 5 * 60 * 1000, // 5 phút
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // Không retry khi gặp mã lỗi 4xx
        if (axios.isAxiosError(error)) {
          const status = error.response?.status
          if (status && status >= 400 && status < 500) {
            return false
          }
        }
        return failureCount < 1 // Retry tối đa 1 lần
      }
    },
    mutations: {
      retry: false
    }
  }
})
