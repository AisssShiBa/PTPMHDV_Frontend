import api from '@/lib/axios'
import { unwrap } from '@/lib/apiResponse'
import type { ApiResponse } from '@/lib/apiResponse'
import type {
  NotificationListResponse,
  NotificationItem,
  NotificationSocketTicket
} from '../types/notification.types'

/**
 * Notification endpoints (all behind the Gateway, `/api` prefix in the axios base URL).
 * - GET    /notifications/me?page&limit
 * - PATCH  /notifications/:id/read
 * - PATCH  /notifications/me/read-all
 * - GET    /notifications/socket-ticket
 */
export const notificationApi = {
  async getNotifications(page = 1, limit = 10): Promise<NotificationListResponse> {
    const res = await api.get<ApiResponse<NotificationListResponse>>('/notifications/me', {
      params: { page, limit }
    })
    return unwrap(res.data)
  },

  async markRead(id: string): Promise<NotificationItem> {
    const res = await api.patch<ApiResponse<NotificationItem>>(
      `/notifications/${encodeURIComponent(id)}/read`
    )
    return unwrap(res.data)
  },

  async markAllRead(): Promise<{ updatedCount: number }> {
    const res = await api.patch<ApiResponse<{ updatedCount: number }>>('/notifications/me/read-all')
    return unwrap(res.data)
  },

  async getSocketTicket(): Promise<NotificationSocketTicket> {
    const res = await api.get<ApiResponse<NotificationSocketTicket>>('/notifications/socket-ticket')
    const data = unwrap(res.data)
    if (typeof data?.ticket !== 'string' || data.ticket.length === 0) {
      throw new Error('Phản hồi socket ticket không hợp lệ.')
    }
    return data
  }
}
