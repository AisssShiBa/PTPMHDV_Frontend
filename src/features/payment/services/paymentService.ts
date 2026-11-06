// d:\PTPMHDV\Frontend\src\features\payment\services\paymentService.ts
import api from '@/lib/axios'
import type { PaymentRecord, CheckoutDto } from '../types/payment.types'

export const paymentService = {
  /**
   * Lấy danh sách giao dịch thanh toán
   */
  getPayments: async (params?: { userId?: string; type?: string; status?: string }): Promise<PaymentRecord[]> => {
    const res = await api.get('/payments', { params })
    return res.data?.data ?? res.data
  },

  /**
   * Lấy chi tiết đơn thanh toán theo ID
   */
  getPaymentById: async (id: string): Promise<PaymentRecord> => {
    const res = await api.get(`/payments/${id}`)
    return res.data?.data ?? res.data
  },

  /**
   * Tạo đơn thanh toán Checkout
   */
  checkout: async (data: CheckoutDto): Promise<PaymentRecord> => {
    const res = await api.post('/payments/checkout', data)
    return res.data?.data ?? res.data
  },

  /**
   * Hủy đơn thanh toán
   */
  cancel: async (id: string): Promise<any> => {
    const res = await api.post(`/payments/${id}/cancel`)
    return res.data?.data ?? res.data
  },

  /**
   * Tạo yêu cầu nạp tiền
   */
  createTopup: async (amount: number | string) => {
    const res = await api.post('/payments/topups', { amount: Number(amount) })
    return res.data?.data ?? res.data
  },

  /**
   * Kiểm tra trạng thái của 1 giao dịch
   */
  getTopupStatus: async (id: string) => {
    const res = await api.get(`/payments/topups/${id}`)
    return res.data?.data ?? res.data
  },

  // ================= ADMIN APIs =================

  /**
   * Lấy danh sách giao dịch nạp tiền (Admin)
   */
  getAdminTopups: async (params?: { status?: string }) => {
    const res = await api.get('/payments/admin/topups', { params })
    return res.data?.data ?? res.data
  },

  /**
   * Duyệt giao dịch nạp tiền (Admin)
   */
  approveTopup: async (id: string) => {
    const res = await api.post(`/payments/admin/topups/${id}/approve`)
    return res.data?.data ?? res.data
  },

  /**
   * Từ chối giao dịch nạp tiền (Admin)
   */
  rejectTopup: async (id: string, reason: string) => {
    const res = await api.post(`/payments/admin/topups/${id}/reject`, { reason })
    return res.data?.data ?? res.data
  }
}
