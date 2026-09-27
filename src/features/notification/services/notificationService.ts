// d:\PTPMHDV\Frontend\src\features\notification\services\notificationService.ts
import api from '@/lib/axios'
import type { NotificationListResponse, NotificationItem } from '../types/notification.types'

export const notificationService = {
  /**
   * Lấy danh sách thông báo của user (kèm unreadCount)
   */
  getNotifications: async (userId: string, page = 1, limit = 10): Promise<NotificationListResponse> => {
    const res = await api.get(`/notifications/${userId}`, {
      params: { page, limit }
    })
    return res.data?.data ?? res.data
  },

  /**
   * Đánh dấu 1 thông báo đã đọc
   */
  markRead: async (id: string): Promise<NotificationItem> => {
    const res = await api.patch(`/notifications/${id}/read`)
    return res.data?.data ?? res.data
  },

  /**
   * Đánh dấu tất cả thông báo đã đọc
   */
  markAllRead: async (userId: string): Promise<{ updatedCount: number }> => {
    const res = await api.patch(`/notifications/${userId}/read-all`)
    return res.data?.data ?? res.data
  }
}
