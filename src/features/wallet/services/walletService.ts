// src/features/wallet/services/walletService.ts
import api from '@/lib/axios'
import type { WalletMe, LedgerItem } from '../types/wallet.types'

/**
 * @deprecated Legacy wallet service. Sử dụng walletApi và paymentApi thay thế.
 * Các route ví cũ /wallets/:userId/transfer và các route bị gateway chặn đã được gỡ bỏ theo K18.
 */
export const walletService = {
  /**
   * Lấy số dư ví (đã chuyển sang /wallets/me)
   */
  getBalance: async (_userId?: string): Promise<WalletMe> => {
    const res = await api.get('/wallets/me')
    return res.data?.data ?? res.data
  },

  /**
   * Lịch sử biến động số dư (đã chuyển sang /wallets/me/ledger)
   */
  getHistory: async (_userId?: string, _page = 1, limit = 10): Promise<LedgerItem[]> => {
    const res = await api.get('/wallets/me/ledger', {
      params: { limit }
    })
    return res.data?.data?.items ?? res.data
  }
}
