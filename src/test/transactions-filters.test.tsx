import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { TransactionsPage } from '@/pages/TransactionsPage'
import { useAuthStore } from '@/features/auth/stores/useAuthStore'
import { MOCK_AUTH_USER as MOCK_USER } from '@/features/auth/fixtures/auth.fixtures'
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

describe('TransactionsPage - Lịch sử giao dịch và bộ lọc ngày/loại [K20]', () => {
  beforeEach(() => {
    server.resetHandlers()
    useAuthStore.setState({ user: MOCK_USER, accessToken: 'synthetic', initialized: true })
  })

  it('hiển thị đầy đủ thanh công cụ bộ lọc (dòng tiền, danh mục, từ ngày, đến ngày) và tuyệt đối không có nhãn BLOCKED-BACKEND', async () => {
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
      expect(screen.getByLabelText('Từ ngày')).toBeDefined()
      expect(screen.getByLabelText('Đến ngày')).toBeDefined()
      expect(screen.getByLabelText('Lọc loại giao dịch')).toBeDefined()
      expect(screen.getByLabelText('Lọc dòng tiền')).toBeDefined()
    })

    // Tuyệt đối không còn nhãn BLOCKED-BACKEND
    expect(screen.queryByText(/BLOCKED-BACKEND/)).toBeNull()
  })

  it('khi chọn khoảng ngày: gửi đúng startDate, endDate lên backend và hiển thị huy hiệu lọc sạch', async () => {
    const capturedUrls: string[] = []

    server.use(
      http.get('*/api/wallets/me/ledger', ({ request }) => {
        capturedUrls.push(request.url)
        return HttpResponse.json({
          success: true,
          data: {
            items: [
              {
                id: 'ledger_filtered_01',
                walletId: 'w_01',
                direction: 'CREDIT',
                amount: '100000',
                balanceAfter: '100000',
                transferType: 'TOPUP',
                note: 'Nạp tiền trong kỳ',
                createdAt: '2026-11-02T10:00:00Z'
              }
            ],
            nextCursor: null
          }
        })
      })
    )

    renderWithProviders(<TransactionsPage />)

    await waitFor(() => {
      expect(screen.getByLabelText('Từ ngày')).toBeDefined()
    })

    const startDateInput = screen.getByLabelText('Từ ngày')
    const endDateInput = screen.getByLabelText('Đến ngày')

    fireEvent.change(startDateInput, { target: { value: '2026-11-01' } })
    fireEvent.change(endDateInput, { target: { value: '2026-11-05' } })

    // Đợi query chạy với bộ lọc mới
    await waitFor(() => {
      const lastUrl = capturedUrls[capturedUrls.length - 1]
      expect(lastUrl).toContain('startDate=2026-11-01')
      expect(lastUrl).toContain('endDate=2026-11-05')
    })

    // Không có banner cảnh báo BLOCKED-BACKEND
    expect(screen.queryByText(/BLOCKED-BACKEND/)).toBeNull()
    expect(screen.getByText('Từ: 2026-11-01')).toBeDefined()
    expect(screen.getByText('Đến: 2026-11-05')).toBeDefined()
    expect(screen.getAllByText('Nạp tiền vào ví').length).toBeGreaterThan(0)
  })

  it('khi chọn loại giao dịch: gửi đúng type lên backend và hiển thị huy hiệu danh mục', async () => {
    const capturedUrls: string[] = []

    server.use(
      http.get('*/api/wallets/me/ledger', ({ request }) => {
        capturedUrls.push(request.url)
        return HttpResponse.json({
          success: true,
          data: {
            items: [
              {
                id: 'ledger_p2p_01',
                walletId: 'w_01',
                direction: 'DEBIT',
                amount: '50000',
                balanceAfter: '50000',
                transferType: 'P2P_TRANSFER',
                note: 'Chuyển tiền ăn trưa',
                createdAt: '2026-11-02T12:00:00Z'
              }
            ],
            nextCursor: null
          }
        })
      })
    )

    renderWithProviders(<TransactionsPage />)

    await waitFor(() => {
      expect(screen.getByLabelText('Lọc loại giao dịch')).toBeDefined()
    })

    const typeSelect = screen.getByLabelText('Lọc loại giao dịch')
    fireEvent.change(typeSelect, { target: { value: 'TRANSFER' } })

    await waitFor(() => {
      const lastUrl = capturedUrls[capturedUrls.length - 1]
      expect(lastUrl).toContain('type=P2P_TRANSFER')
    })

    expect(screen.queryByText(/BLOCKED-BACKEND/)).toBeNull()
    expect(screen.getByText('Loại: Chuyển tiền P2P')).toBeDefined()
  })

  it('khi chọn hướng dòng tiền: gửi đúng direction (CREDIT/DEBIT) lên backend', async () => {
    const capturedUrls: string[] = []

    server.use(
      http.get('*/api/wallets/me/ledger', ({ request }) => {
        capturedUrls.push(request.url)
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
      expect(screen.getByLabelText('Lọc dòng tiền')).toBeDefined()
    })

    const dirSelect = screen.getByLabelText('Lọc dòng tiền')
    fireEvent.change(dirSelect, { target: { value: 'CREDIT' } })

    await waitFor(() => {
      const lastUrl = capturedUrls[capturedUrls.length - 1]
      expect(lastUrl).toContain('direction=CREDIT')
    })

    expect(screen.getByText('Dòng tiền: Tiền vào')).toBeDefined()
  })

  it('đổi bộ lọc tự động reset cursor về trang đầu và không trộn cache với dữ liệu cũ', async () => {
    const requestedParams: { cursor: string | null; type?: string | null }[] = []

    server.use(
      http.get('*/api/wallets/me/ledger', ({ request }) => {
        const url = new URL(request.url)
        requestedParams.push({
          cursor: url.searchParams.get('cursor'),
          type: url.searchParams.get('type')
        })

        const type = url.searchParams.get('type')
        if (type === 'TOPUP') {
          return HttpResponse.json({
            success: true,
            data: {
              items: [
                {
                  id: 'topup_only_01',
                  direction: 'CREDIT',
                  amount: '200000',
                  balanceAfter: '200000',
                  transferType: 'TOPUP',
                  note: 'Bút toán Nạp tiền duy nhất',
                  createdAt: '2026-11-01T10:00:00Z'
                }
              ],
              nextCursor: null
            }
          })
        }

        return HttpResponse.json({
          success: true,
          data: {
            items: [
              {
                id: 'all_01',
                direction: 'DEBIT',
                amount: '30000',
                balanceAfter: '170000',
                transferType: 'PAYMENT',
                note: 'Thanh toán hoá đơn',
                createdAt: '2026-11-01T11:00:00Z'
              }
            ],
            nextCursor: 'cursor_page_2'
          }
        })
      })
    )

    renderWithProviders(<TransactionsPage />)

    // Ban đầu tải toàn bộ
    await waitFor(() => {
      expect(screen.getByText('Thanh toán hoá đơn')).toBeDefined()
    })

    // Đổi bộ lọc sang TOPUP
    const typeSelect = screen.getByLabelText('Lọc loại giao dịch')
    fireEvent.change(typeSelect, { target: { value: 'TOPUP' } })

    // Đợi hiển thị chỉ bút toán TOPUP
    await waitFor(() => {
      expect(screen.getByText('Bút toán Nạp tiền duy nhất')).toBeDefined()
      expect(screen.queryByText('Thanh toán hoá đơn')).toBeNull()
    })

    // Kiểm tra request đổi filter đã gửi cursor=null (reset về trang đầu)
    const topupRequests = requestedParams.filter(p => p.type === 'TOPUP')
    expect(topupRequests.length).toBeGreaterThan(0)
    expect(topupRequests[0].cursor).toBeNull()
  })

  it('khi bộ lọc không có kết quả: hiển thị trạng thái rỗng và bấm Đặt lại bộ lọc khôi phục toàn bộ danh sách', async () => {
    server.use(
      http.get('*/api/wallets/me/ledger', ({ request }) => {
        const url = new URL(request.url)
        const type = url.searchParams.get('type')
        if (type === 'TOPUP') {
          // Trả về rỗng
          return HttpResponse.json({
            success: true,
            data: { items: [], nextCursor: null }
          })
        }
        return HttpResponse.json({
          success: true,
          data: {
            items: [
              {
                id: 'default_item_1',
                direction: 'DEBIT',
                amount: '40000',
                balanceAfter: '100000',
                transferType: 'PAYMENT',
                note: 'Giao dịch ban đầu',
                createdAt: '2026-11-01T10:00:00Z'
              }
            ],
            nextCursor: null
          }
        })
      })
    )

    renderWithProviders(<TransactionsPage />)

    await waitFor(() => {
      expect(screen.getByText('Giao dịch ban đầu')).toBeDefined()
    })

    // Chọn TOPUP -> không có kết quả
    const typeSelect = screen.getByLabelText('Lọc loại giao dịch')
    fireEvent.change(typeSelect, { target: { value: 'TOPUP' } })

    await waitFor(() => {
      expect(screen.getByText('Không tìm thấy biến động phù hợp')).toBeDefined()
      expect(screen.getByText('Không có giao dịch nào khớp với điều kiện lọc hiện tại.')).toBeDefined()
    })

    // Bấm "Đặt lại bộ lọc"
    const resetButtons = screen.getAllByRole('button', { name: /Đặt lại bộ lọc/ })
    fireEvent.click(resetButtons[0])

    // Khôi phục lại dữ liệu ban đầu
    await waitFor(() => {
      expect(screen.getByText('Giao dịch ban đầu')).toBeDefined()
      expect(screen.queryByText('Không tìm thấy biến động phù hợp')).toBeNull()
    })
  })
})
