// d:\PTPMHDV\Frontend\src\features\admin\services\adminService.ts
import api from '@/lib/axios'
import type { DashboardStats, AdminKycDocuments, AdminKycPage, AdminMerchantItem, AuditLogItem } from '../types/admin.types'
import type { KycStatus, UserProfile } from '@/features/user/types/user.types'
import { unwrap, type ApiResponse } from '@/lib/apiResponse'

const kycPath = (userId: string) => '/admin/kyc/' + encodeURIComponent(userId)

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
  getKycList: async (params?: { page?: number; limit?: number; status?: KycStatus; search?: string }, signal?: AbortSignal): Promise<AdminKycPage> => {
    const res = await api.get<ApiResponse<AdminKycPage>>('/admin/kyc', { params, signal })
    return unwrap(res.data)
  },

  /**
   * Phê duyệt / Từ chối KYC
   */
  reviewKyc: async (userId: string, status: 'APPROVED' | 'REJECTED', detail: string): Promise<UserProfile> => {
    const res = await api.post<ApiResponse<UserProfile>>(kycPath(userId) + '/review', { status, detail: detail.trim() })
    return unwrap(res.data)
  },

  updateKycTier: async (userId: string, tier: 1 | 2, reason: string): Promise<UserProfile> => {
    const res = await api.patch<ApiResponse<UserProfile>>(kycPath(userId) + '/tier', { tier, reason: reason.trim() })
    return unwrap(res.data)
  },

  getKycDocuments: async (userId: string, signal?: AbortSignal): Promise<AdminKycDocuments> => {
    const res = await api.get<ApiResponse<AdminKycDocuments>>(kycPath(userId) + '/documents', { signal })
    return unwrap(res.data)
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
