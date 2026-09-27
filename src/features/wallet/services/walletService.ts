// d:\PTPMHDV\Frontend\src\features\wallet\services\walletService.ts
import api from '@/lib/axios'
import type { WalletBalance, WalletHistoryItem } from '../types/wallet.types'

export const walletService = {
  /**
   * Lấy số dư ví của người dùng
   */
  getBalance: async (userId: string): Promise<WalletBalance> => {
    const res = await api.get(`/wallets/${userId}/balance?ownerType=USER`)
    return res.data?.data ?? res.data
  },

  /**
   * Nạp tiền vào ví (Credit / Topup)
   */
  topup: async (userId: string, amount: string | number): Promise<any> => {
    const res = await api.post(`/wallets/${userId}/credit`, {
      amount: String(amount),
      referenceId: `TOPUP-${Date.now()}`,
      transferType: 'TOPUP'
    })
    return res.data?.data ?? res.data
  },

  /**
   * Trừ tiền ví (Debit)
   */
  debit: async (userId: string, amount: string | number, referenceId?: string): Promise<any> => {
    const res = await api.post(`/wallets/${userId}/debit`, {
      amount: String(amount),
      referenceId: referenceId || `DEBIT-${Date.now()}`,
      transferType: 'PAYMENT'
    })
    return res.data?.data ?? res.data
  },

  /**
   * Chuyển tiền P2P
   */
  transfer: async (userId: string, toUserId: string, amount: string | number): Promise<any> => {
    const res = await api.post(`/wallets/${userId}/transfer`, {
      toUserId,
      amount: String(amount),
      referenceId: `P2P-${Date.now()}`
    })
    return res.data?.data ?? res.data
  },

  /**
   * Lịch sử biến động số dư
   */
  getHistory: async (userId: string, page = 1, limit = 10): Promise<WalletHistoryItem[]> => {
    const res = await api.get(`/wallets/${userId}/history`, {
      params: { page, limit }
    })
    return res.data?.data ?? res.data
  }
}
