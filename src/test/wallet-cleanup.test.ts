import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import React from 'react'
import { walletService } from '../features/wallet/services/walletService'
import { RealBalanceCard } from '../features/wallet/components/RealBalanceCard'
import { walletApi } from '../features/wallet/api/wallet.api'
import { useAuthStore } from '../features/auth/stores/useAuthStore'

vi.mock('../features/wallet/api/wallet.api', () => ({
  walletApi: {
    getWalletMe: vi.fn(),
    getMyWallet: vi.fn(),
  }
}))

describe('Dọn dẹp walletService, TopupModal và RealBalanceCard [K18-3]', () => {
  it('walletService đã xóa hoàn toàn 5 hàm cũ credit, debit, transfer, balance, history', () => {
    const service = walletService as any
    expect(service.credit).toBeUndefined()
    expect(service.debit).toBeUndefined()
    expect(service.transfer).toBeUndefined()
    expect(service.balance).toBeUndefined()
    expect(service.getBalance).toBeUndefined()
    expect(service.topup).toBeUndefined()
    expect(service.history).toBeUndefined()
    expect(service.getHistory).toBeUndefined()
  })

  it('RealBalanceCard render thành công và lấy dữ liệu từ GET /wallets/me', async () => {
    useAuthStore.setState({
      user: {
        id: 'user-uuid-1',
        username: 'an_test',
        firstName: 'An',
        lastName: 'Nguyen',
        role: 'USER',
        kycTier: 1
      } as any
    })

    vi.mocked(walletApi.getWalletMe).mockResolvedValueOnce({
      userId: 'user-uuid-1',
      balance: '1250000',
      availableBalance: '1250000',
      heldBalance: '0',
      status: 'ACTIVE'
    })

    render(React.createElement(RealBalanceCard))

    await waitFor(() => {
      expect(walletApi.getWalletMe).toHaveBeenCalled()
      expect(screen.getByText('1.250.000 ₫')).toBeDefined()
    })
  })
})
