import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient } from '@tanstack/react-query'
import { walletApi } from '../features/wallet/api/wallet.api'
import { walletKeys, invalidateWalletQueries } from '../features/wallet/api/wallet.queries'
import api from '@/lib/axios'

vi.mock('@/lib/axios', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  }
}))

describe('features/wallet/api & queries [K18-2]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getMyWallet gọi đúng URL /wallets/me và unwrap dữ liệu tiền chuẩn chuỗi', async () => {
    const mockWallet = {
      userId: 'test-user-id',
      balance: '1250000',
      availableBalance: '1250000',
      heldBalance: '0',
      dailyLimit: '5000000',
      dailyUsed: '100000',
      monthlyLimit: '50000000',
      monthlyUsed: '2500000',
      kycTier: 2
    }
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { success: true, data: mockWallet }
    })

    const result = await walletApi.getMyWallet()
    expect(api.get).toHaveBeenCalledWith('/wallets/me', expect.any(Object))
    expect(result.balance).toBe('1250000')
    expect(typeof result.balance).toBe('string')
    expect(result.dailyLimit).toBe('5000000')
  })

  it('getMyLedger gọi đúng URL /wallets/me/ledger với tham số cursor và limit', async () => {
    const mockLedger = {
      items: [
        {
          id: '101',
          direction: 'CREDIT',
          amount: '50000',
          balanceAfter: '1250000',
          transferType: 'P2P_TRANSFER',
          createdAt: '2026-11-10T10:00:00Z'
        }
      ],
      nextCursor: 'next-cursor-token'
    }
    vi.mocked(api.get).mockResolvedValueOnce({
      data: { success: true, data: mockLedger }
    })

    const result = await walletApi.getMyLedger({ cursor: 'cursor-abc', limit: 10 })
    expect(api.get).toHaveBeenCalledWith('/wallets/me/ledger', {
      params: {
        cursor: 'cursor-abc',
        limit: 10,
        startDate: undefined,
        endDate: undefined,
        type: undefined
      },
      signal: undefined
    })
    expect(result.items.length).toBe(1)
    expect(result.items[0].amount).toBe('50000')
    expect(result.nextCursor).toBe('next-cursor-token')
  })

  it('xử lý lỗi 401/404/400 khi gọi API ví', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Unauthorized (401)'))
    await expect(walletApi.getMyWallet()).rejects.toThrow('Unauthorized (401)')

    vi.mocked(api.get).mockRejectedValueOnce(new Error('Invalid Cursor (400)'))
    await expect(walletApi.getMyLedger({ cursor: 'bad-cursor' })).rejects.toThrow('Invalid Cursor (400)')
  })

  it('invalidateWalletQueries vô hiệu hóa đúng query cache của số dư và sổ cái', async () => {
    const queryClient = new QueryClient()
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    await invalidateWalletQueries(queryClient)

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: walletKeys.me() })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['wallets', 'ledger'] })
  })
})
