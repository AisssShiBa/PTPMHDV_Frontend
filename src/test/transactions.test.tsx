import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { TransactionsPage } from '@/pages/TransactionsPage'
import { server } from '@/mocks/server'
import { http, HttpResponse } from 'msw'
import fs from 'node:fs'
import path from 'node:path'

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false }
    }
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  )
}

describe('TransactionsPage - Cursor Pagination & Ledger [K18-6]', () => {
  beforeEach(() => {
    server.resetHandlers()
  })

  it('phân trang cursor: tải 2 trang, ghép đúng thứ tự, không trùng lặp, hết trang nút tải thêm biến mất', async () => {
    let callCount = 0
    let requestedCursors: (string | null)[] = []

    server.use(
      http.get('*/api/wallets/me/ledger', ({ request }) => {
        callCount++
        const url = new URL(request.url)
        const cursor = url.searchParams.get('cursor')
        requestedCursors.push(cursor)

        if (!cursor) {
          // Trang 1
          return HttpResponse.json({
            success: true,
            data: {
              items: [
                {
                  id: 'ledger_entry_001',
                  walletId: 'wallet_abc',
                  direction: 'CREDIT',
                  amount: '100000',
                  balanceAfter: '100000',
                  transferType: 'TOPUP',
                  note: 'Nạp tiền VNPAY',
                  referenceId: 'REF_TOPUP_001',
                  createdAt: '2026-11-10T10:00:00Z'
                },
                {
                  id: 'ledger_entry_002',
                  walletId: 'wallet_abc',
                  direction: 'DEBIT',
                  amount: '40000',
                  balanceAfter: '60000',
                  transferType: 'TRANSFER',
                  counterpartyMasked: 'Bình Nguyễn',
                  note: 'Chuyển tiền ăn trưa',
                  referenceId: 'REF_P2P_002',
                  createdAt: '2026-11-10T11:00:00Z'
                }
              ],
              nextCursor: 'cursor_token_page_2'
            }
          })
        }

        if (cursor === 'cursor_token_page_2') {
          // Trang 2
          return HttpResponse.json({
            success: true,
            data: {
              items: [
                {
                  id: 'ledger_entry_003',
                  walletId: 'wallet_abc',
                  direction: 'DEBIT',
                  amount: '15000',
                  balanceAfter: '45000',
                  transferType: 'PAYMENT',
                  note: 'Thanh toán cà phê',
                  referenceId: 'REF_PAY_003',
                  createdAt: '2026-11-10T12:00:00Z'
                }
              ],
              nextCursor: null
            }
          })
        }

        return HttpResponse.json({
          success: true,
          data: {
            items: [],
            nextCursor: null
          }
        })
      })
    )

    renderWithProviders(<TransactionsPage />)

    // Kiểm tra trang 1 đã render đúng 2 phần tử
    await waitFor(() => {
      expect(screen.getAllByText('Nạp tiền vào ví').length).toBeGreaterThan(0)
      expect(screen.getByText('Chuyển cho Bình Nguyễn')).toBeDefined()
      expect(screen.getByText('+ 100.000 ₫')).toBeDefined()
      expect(screen.getByText('- 40.000 ₫')).toBeDefined()
    })

    // Nút "Tải thêm giao dịch" xuất hiện vì nextCursor != null
    const loadMoreBtn = screen.getByRole('button', { name: /Tải thêm giao dịch/ })
    expect(loadMoreBtn).toBeDefined()

    // Bấm tải thêm trang 2
    fireEvent.click(loadMoreBtn)

    // Kiểm tra trang 2 được ghép vào và cả 3 phần tử đều hiển thị
    await waitFor(() => {
      expect(callCount).toBe(2)
      expect(requestedCursors).toEqual([null, 'cursor_token_page_2'])
      expect(screen.getAllByText('Thanh toán dịch vụ').length).toBeGreaterThan(0)
      expect(screen.getByText('- 15.000 ₫')).toBeDefined()
    })

    // Hết trang -> nút "Tải thêm giao dịch" biến mất, thay bằng thông báo đã hiển thị toàn bộ
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Tải thêm giao dịch/ })).toBeNull()
      expect(screen.getByText(/Đã hiển thị toàn bộ lịch sử biến động số dư/)).toBeDefined()
    })
  })

  it('render đúng số tiền lớn > 2^53 qua BigInt và định dạng thời gian GMT+7', async () => {
    const hugeAmount = '9007199254740993000' // > 2^53

    server.use(
      http.get('*/api/wallets/me/ledger', () => {
        return HttpResponse.json({
          success: true,
          data: {
            items: [
              {
                id: 'ledger_entry_huge_999',
                walletId: 'wallet_huge',
                direction: 'CREDIT',
                amount: hugeAmount,
                balanceAfter: hugeAmount,
                transferType: 'TOPUP',
                note: 'Bút toán tiền lớn an toàn',
                referenceId: 'REF_HUGE_999',
                createdAt: '2026-11-10T14:30:00Z'
              }
            ],
            nextCursor: null
          }
        })
      })
    )

    renderWithProviders(<TransactionsPage />)

    // Kiểm tra định dạng tiền lớn không bị mất độ chính xác dấu phẩy động
    await waitFor(() => {
      expect(screen.getByText('+ 9.007.199.254.740.993.000 ₫')).toBeDefined()
      expect(screen.getByText(/Số dư sau: 9\.007\.199\.254\.740\.993\.000 ₫/)).toBeDefined()
    })
  })

  it('xử lý trạng thái ví rỗng: hiển thị EmptyState', async () => {
    server.use(
      http.get('*/api/wallets/me/ledger', () => {
        return HttpResponse.json({
          success: true,
          data: {
            items: [],
            nextCursor: null
          }
        })
      })
    )

    renderWithProviders(<TransactionsPage />)

    await waitFor(() => {
      expect(screen.getByText('Chưa có biến động số dư nào')).toBeDefined()
      expect(
        screen.getByText(/Mọi giao dịch nạp tiền, chuyển tiền, thanh toán và rút tiền sẽ được ghi nhận/)
      ).toBeDefined()
    })
  })

  it('xử lý trạng thái lỗi tải sổ cái: hiển thị thông báo lỗi và nút Thử lại', async () => {
    let attempts = 0
    server.use(
      http.get('*/api/wallets/me/ledger', () => {
        attempts++
        if (attempts === 1) {
          return HttpResponse.json(
            { success: false, error: { code: 'GATEWAY_ERROR', message: 'Internal Server Error' } },
            { status: 500 }
          )
        }
        return HttpResponse.json({
          success: true,
          data: {
            items: [
              {
                id: 'ledger_retry_ok',
                walletId: 'wallet_1',
                direction: 'CREDIT',
                amount: '50000',
                balanceAfter: '50000',
                transferType: 'TOPUP',
                createdAt: '2026-11-10T10:00:00Z'
              }
            ],
            nextCursor: null
          }
        })
      })
    )

    renderWithProviders(<TransactionsPage />)

    await waitFor(() => {
      expect(screen.getByText('Không thể tải lịch sử giao dịch')).toBeDefined()
      expect(screen.getByRole('button', { name: /Thử lại/ })).toBeDefined()
    })

    // Bấm thử lại
    fireEvent.click(screen.getByRole('button', { name: /Thử lại/ }))

    await waitFor(() => {
      expect(attempts).toBe(2)
      expect(screen.getAllByText('Nạp tiền vào ví').length).toBeGreaterThan(0)
      expect(screen.getByText('+ 50.000 ₫')).toBeDefined()
    })
  })

  it('kiểm tra tĩnh: TransactionsPage tuyệt đối không dùng Number, parseFloat, parseInt trên tiền', () => {
    const filePath = path.resolve(__dirname, '../pages/TransactionsPage.tsx')
    const content = fs.readFileSync(filePath, 'utf-8')

    // Chặn Number(amount), parseFloat(amount), parseInt(amount)
    expect(content).not.toMatch(/Number\s*\(\s*txn\.amount\s*\)/)
    expect(content).not.toMatch(/Number\s*\(\s*item\.amount\s*\)/)
    expect(content).not.toMatch(/parseFloat\s*\(/)
    expect(content).not.toMatch(/parseInt\s*\(\s*(?:txn|item)\.amount/)
    expect(content).not.toMatch(/\.toFixed\s*\(/)
  })
})
