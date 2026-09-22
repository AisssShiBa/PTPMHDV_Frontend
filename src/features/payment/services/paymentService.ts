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
  }
}
