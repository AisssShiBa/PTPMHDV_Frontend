import api from '@/lib/axios'
import { unwrap, type ApiResponse } from '@/lib/apiResponse'
import type { WalletMe, LedgerPage, LedgerFilterParams } from '../types/wallet.types'

export const walletApi = {
  /**
   * Lấy số dư và hạn mức ví của user hiện tại
   * Endpoint: GET /api/wallets/me
   */
  async getMyWallet(signal?: AbortSignal): Promise<WalletMe> {
    const res = await api.get<ApiResponse<WalletMe>>('/wallets/me', { signal })
    return unwrap(res.data)
  },

  /**
   * Alias tương thích ngược
   */
  async getWalletMe(signal?: AbortSignal): Promise<WalletMe> {
    return this.getMyWallet(signal)
  },

  /**
   * Lấy lịch sử giao dịch sổ cái của user hiện tại với phân trang cursor
   * Endpoint: GET /api/wallets/me/ledger
   */
  async getMyLedger(
    params?: { cursor?: string | null; limit?: number } & LedgerFilterParams,
    signal?: AbortSignal
  ): Promise<LedgerPage> {
    const res = await api.get<ApiResponse<{ items?: any[]; entries?: any[]; nextCursor: string | null }>>(
      '/wallets/me/ledger',
      {
        params: {
          cursor: params?.cursor || undefined,
          limit: params?.limit || 20,
          startDate: params?.startDate || undefined,
          endDate: params?.endDate || undefined,
          type: params?.type || undefined
        },
        signal
      }
    )
    const data = unwrap(res.data)
    const items = data.items || data.entries || []
    return {
      items,
      nextCursor: data.nextCursor ?? null
    }
  },

  /**
   * Alias tương thích ngược
   */
  async getWalletLedger(
    params?: { cursor?: string | null; limit?: number } & LedgerFilterParams,
    signal?: AbortSignal
  ): Promise<LedgerPage> {
    return this.getMyLedger(params, signal)
  }
}
