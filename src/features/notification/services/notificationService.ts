// d:\PTPMHDV\Frontend\src\features\notification\services\notificationService.ts
import api from '@/lib/axios'
import type { NotificationListResponse, NotificationItem } from '../types/notification.types'

export const notificationService = {
  getNotifications: async (page = 1, limit = 10): Promise<NotificationListResponse> => {
    const res = await api.get('/notifications/me', {
      params: { page, limit }
    })
    return res.data.data
  },

  markRead: async (id: string): Promise<NotificationItem> => {
    const res = await api.patch(`/notifications/${encodeURIComponent(id)}/read`)
    return res.data.data
  },

  markAllRead: async (): Promise<{ updatedCount: number }> => {
    const res = await api.patch('/notifications/me/read-all')
    return res.data.data
  },

  getSocketTicket: async (): Promise<string> => {
    const res = await api.get<{ success: boolean; data?: { ticket?: string } }>('/notifications/socket-ticket')
    const ticket = res.data?.data?.ticket
    if (!res.data?.success || typeof ticket !== 'string' || ticket.length === 0) {
      throw new Error('Phản hồi socket ticket không hợp lệ.')
    }
    return ticket
  }
}
