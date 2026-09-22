// d:\PTPMHDV\Frontend\src\features\merchant\services\merchantService.ts
import api from '@/lib/axios'
import type { MerchantRecord, RegisterMerchantDto } from '../types/merchant.types'

export const merchantService = {
  /**
   * Đăng ký đối tác Merchant
   */
  register: async (data: RegisterMerchantDto): Promise<MerchantRecord> => {
    const res = await api.post('/merchants/register', data)
    return res.data?.data ?? res.data
  },

  /**
   * Lấy chi tiết Merchant theo ID
   */
  getById: async (id: string): Promise<MerchantRecord> => {
    const res = await api.get(`/merchants/${id}`)
    return res.data?.data ?? res.data
  },

  /**
   * Kiểm tra Merchant có đang active không
   */
  checkActive: async (id: string): Promise<{ active: boolean }> => {
    const res = await api.get(`/merchants/${id}/active`)
    return res.data?.data ?? res.data
  },

  /**
   * Danh sách Merchant
   */
  getMerchants: async (): Promise<MerchantRecord[]> => {
    const res = await api.get('/merchants')
    return res.data?.data ?? res.data
  }
}
