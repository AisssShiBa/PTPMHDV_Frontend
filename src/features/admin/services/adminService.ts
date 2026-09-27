// d:\PTPMHDV\Frontend\src\features\admin\services\adminService.ts
import api from '@/lib/axios'
import type { DashboardStats, AdminKycItem, AdminMerchantItem, AuditLogItem } from '../types/admin.types'

export const adminService = {
  /**
   * Thống kê Dashboard
   */
  getDashboardStats: async (): Promise<DashboardStats> => {
    const res = await api.get('/admin/dashboard')
    return res.data?.data ?? res.data
  },

  /**
   * Danh sách hồ sơ KYC
   */
  getKycList: async (params?: { page?: number; limit?: number; status?: string; search?: string }): Promise<{ content: AdminKycItem[]; totalElements: number }> => {
    const res = await api.get('/admin/kyc', { params })
    return res.data?.data ?? res.data
  },

  /**
   * Phê duyệt / Từ chối KYC
   */
  reviewKyc: async (userId: string, status: 'APPROVED' | 'REJECTED', detail?: string): Promise<any> => {
    const res = await api.post(`/admin/kyc/${userId}/review`, { status, detail })
    return res.data?.data ?? res.data
  },

  /**
   * Danh sách đối tác Merchant
   */
  getMerchantList: async (params?: { page?: number; limit?: number; status?: string; search?: string }): Promise<{ content: AdminMerchantItem[]; totalElements: number }> => {
    const res = await api.get('/admin/merchants', { params })
    return res.data?.data ?? res.data
  },

  /**
   * Phê duyệt / Từ chối Merchant
   */
  reviewMerchant: async (merchantId: string, status: 'APPROVED' | 'REJECTED', detail?: string): Promise<any> => {
    const res = await api.post(`/admin/merchants/${merchantId}/review`, { status, detail })
    return res.data?.data ?? res.data
  },

  /**
   * Lấy nhật ký kiểm toán Admin
   */
  getAuditLogs: async (params?: { page?: number; limit?: number }): Promise<AuditLogItem[]> => {
    const res = await api.get('/admin/audit-logs', { params })
    return res.data?.data ?? res.data
  }
}
