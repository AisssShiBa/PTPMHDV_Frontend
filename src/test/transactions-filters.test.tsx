import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { TransactionsPage } from '@/pages/TransactionsPage'
import { server } from '@/mocks/server'
import { http, HttpResponse } from 'msw'

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

describe('TransactionsPage - Bộ lọc ngày & loại và cờ BLOCKED-BACKEND [K22-2]', () => {
  beforeEach(() => {
    server.resetHandlers()
    server.use(
      http.get('*/api/wallets/me/ledger', () => {
        return HttpResponse.json({
          success: true,
          data: {
            items: [
              {
                id: 'ledger_01',
                walletId: 'w_01',
                direction: 'CREDIT',
                amount: '200000',
                balanceAfter: '200000',
                transferType: 'TOPUP',
                note: 'Nạp tiền vào ví',
                createdAt: '2026-11-01T10:00:00Z'
              },
              {
                id: 'ledger_02',
                walletId: 'w_01',
                direction: 'DEBIT',
                amount: '50000',
                balanceAfter: '150000',
                transferType: 'TRANSFER',
                note: 'Chuyển tiền ăn trưa',
                createdAt: '2026-11-05T12:00:00Z'
              }
            ],
            nextCursor: null
          }
        })
      })
    )
  })

  it('hiển thị đầy đủ ô nhập ngày (Từ ngày, Đến ngày) và chọn loại giao dịch', async () => {
    renderWithProviders(<TransactionsPage />)

    await waitFor(() => {
      expect(screen.getByLabelText('Từ ngày')).toBeDefined()
      expect(screen.getByLabelText('Đến ngày')).toBeDefined()
      expect(screen.getByLabelText('Lọc loại giao dịch')).toBeDefined()
      expect(screen.getByLabelText('Lọc dòng tiền')).toBeDefined()
    })

    // Ban đầu chưa có bộ lọc nào được áp dụng -> không có cờ BLOCKED-BACKEND
    expect(screen.queryByText('BLOCKED-BACKEND')).toBeNull()
  })

  it('khi chọn khoảng ngày (Từ ngày / Đến ngày): hiển thị cờ BLOCKED-BACKEND giải thích rõ API chưa hỗ trợ', async () => {
    renderWithProviders(<TransactionsPage />)

    await waitFor(() => {
      expect(screen.getByLabelText('Từ ngày')).toBeDefined()
    })

    const startDateInput = screen.getByLabelText('Từ ngày')
    fireEvent.change(startDateInput, { target: { value: '2026-11-01' } })

    // Cờ cảnh báo BLOCKED-BACKEND xuất hiện
    await waitFor(() => {
      const banner = screen.getByRole('region', { name: /Thông báo giới hạn hệ thống/ })
      expect(banner).toBeDefined()
      expect(screen.getAllByText('BLOCKED-BACKEND').length).toBeGreaterThan(0)
      expect(
        screen.getByText(/Bộ lọc theo ngày và loại giao dịch chưa được API máy chủ hỗ trợ/)
      ).toBeDefined()
      expect(
        screen.getByText(/chưa hỗ trợ tham số truy vấn/)
      ).toBeDefined()
    })
  })

  it('khi chọn loại giao dịch: hiển thị cờ BLOCKED-BACKEND và huy hiệu áp dụng', async () => {
    renderWithProviders(<TransactionsPage />)

    await waitFor(() => {
      expect(screen.getByLabelText('Lọc loại giao dịch')).toBeDefined()
    })

    const typeSelect = screen.getByLabelText('Lọc loại giao dịch')
    fireEvent.change(typeSelect, { target: { value: 'TRANSFER' } })

    await waitFor(() => {
      expect(screen.getAllByText('BLOCKED-BACKEND').length).toBeGreaterThan(0)
      expect(screen.getByText(/Loại: TRANSFER \(BLOCKED-BACKEND\)/)).toBeDefined()
    })
  })

  it('bấm Đặt lại bộ lọc: xóa toàn bộ giá trị ngày, loại và ẩn cờ BLOCKED-BACKEND', async () => {
    renderWithProviders(<TransactionsPage />)

    await waitFor(() => {
      expect(screen.getByLabelText('Từ ngày')).toBeDefined()
    })

    // Nhập ngày và chọn loại
    fireEvent.change(screen.getByLabelText('Từ ngày'), { target: { value: '2026-11-01' } })
    fireEvent.change(screen.getByLabelText('Lọc loại giao dịch'), { target: { value: 'TRANSFER' } })

    await waitFor(() => {
      expect(screen.getAllByText('BLOCKED-BACKEND').length).toBeGreaterThan(0)
    })

    // Bấm Đặt lại bộ lọc
    const resetBtn = screen.getByRole('button', { name: /Đặt lại bộ lọc/ })
    fireEvent.click(resetBtn)

    await waitFor(() => {
      expect(screen.queryByRole('region', { name: /Thông báo giới hạn hệ thống/ })).toBeNull()
      expect((screen.getByLabelText('Từ ngày') as HTMLInputElement).value).toBe('')
      expect((screen.getByLabelText('Lọc loại giao dịch') as HTMLSelectElement).value).toBe('ALL')
    })
  })
})
