import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { DashboardPage } from '@/pages/DashboardPage'
import { server } from '@/mocks/server'
import { http, HttpResponse } from 'msw'
import fs from 'node:fs'
import path from 'node:path'

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false
      }
    }
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  )
}

describe('DashboardPage - K18-2', () => {
  beforeEach(() => {
    server.resetHandlers()
  })

  it('render đúng số tiền định dạng từ chuỗi lớn từ GET /api/wallets/me', async () => {
    // 9.007.199.254.740.993 vượt qua 2^53
    const hugeBalance = '9007199254740993'

    server.use(
      http.get('*/api/wallets/me', () => {
        return HttpResponse.json({
          success: true,
          data: {
            id: 'wallet-huge-1',
            userId: 'user-huge-1',
            balance: hugeBalance,
            availableBalance: hugeBalance,
            heldBalance: '0',
            dailyLimit: '20000000',
            dailyUsed: '500000',
            kycTier: 1
          }
        })
      }),
      http.get('*/api/wallets/me/ledger', () => {
        return HttpResponse.json({
          success: true,
          data: {
            items: [
              {
                id: 'tx-1',
                direction: 'CREDIT',
                amount: '500000',
                balanceAfter: hugeBalance,
                transferType: 'TOPUP',
                createdAt: '2026-11-10T10:00:00Z'
              }
            ],
            nextCursor: null
          }
        })
      })
    )

    renderWithClient(<DashboardPage />)

    // Chờ số dư render
    await waitFor(() => {
      expect(screen.getByText(/9\.007\.199\.254\.740\.993/)).toBeDefined()
    })

    // Kiểm tra render giao dịch gần đây
    expect(screen.getByText('Nạp tiền vào ví')).toBeDefined()
  })

  it('xử lý trạng thái lỗi khi GET /api/wallets/me thất bại', async () => {
    server.use(
      http.get('*/api/wallets/me', () => {
        return HttpResponse.json(
          { success: false, error: { code: 'INTERNAL_ERROR', message: 'Lỗi máy chủ' } },
          { status: 500 }
        )
      }),
      http.get('*/api/wallets/me/ledger', () => {
        return HttpResponse.json({
          success: true,
          data: { items: [], nextCursor: null }
        })
      })
    )

    renderWithClient(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText('Lỗi tải số dư')).toBeDefined()
    })
  })

  it('xử lý trạng thái rỗng khi ví chưa có giao dịch nào', async () => {
    server.use(
      http.get('*/api/wallets/me', () => {
        return HttpResponse.json({
          success: true,
          data: {
            id: 'wallet-empty',
            userId: 'user-empty',
            balance: '0',
            availableBalance: '0',
            heldBalance: '0',
            kycTier: 0
          }
        })
      }),
      http.get('*/api/wallets/me/ledger', () => {
        return HttpResponse.json({
          success: true,
          data: { items: [], nextCursor: null }
        })
      })
    )

    renderWithClient(<DashboardPage />)

    await waitFor(() => {
      expect(screen.getByText('Chưa có giao dịch nào')).toBeDefined()
    })
  })

  it('kiểm tra tĩnh: DashboardPage không sử dụng Number() / parseFloat() trên các trường tiền', () => {
    const dashboardFile = path.resolve(__dirname, '../pages/DashboardPage.tsx')
    const content = fs.readFileSync(dashboardFile, 'utf8')
    const lines = content.split('\n')

    const forbiddenMoneyRegex = /(?:parseFloat|parseInt|\bNumber)\s*\(\s*(?:amount|balance|rawBalance|heldBalance|fee|limit)/i

    lines.forEach((line, index) => {
      if (line.trim().startsWith('//') || line.trim().startsWith('*')) return
      const match = forbiddenMoneyRegex.exec(line)
      if (match) {
        throw new Error(`Phát hiện dùng Number/parseFloat trên tiền tại DashboardPage.tsx:${index + 1} -> "${line.trim()}"`)
      }
    })
  })
})
