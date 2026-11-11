import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { TransferPage } from '@/pages/TransferPage'
import { useAuthStore } from '@/features/auth/stores/useAuthStore'
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

describe('TransferPage Bước 1 - K19-1', () => {
  beforeEach(() => {
    server.resetHandlers()
  })

  it('tra cứu người nhận thành công: hiển thị maskedName', async () => {
    const userId = 'user-lookup-success-uuid'
    useAuthStore.setState({
      user: {
        id: userId,
        username: 'annguyen',
        email: 'an@demo.vn',
        firstName: 'An',
        lastName: 'Nguyễn',
        role: 'USER',
        kycTier: 1,
        balance: '1250000'
      },
      accessToken: 'token',
      initialized: true
    })

    server.use(
      http.get('*/api/wallets/me', () => {
        return HttpResponse.json({
          success: true,
          data: {
            id: 'wallet-1',
            userId,
            balance: '1250000',
            availableBalance: '1250000',
            heldBalance: '0',
            kycTier: 1
          }
        })
      }),
      http.get('*/api/users/lookup', ({ request }) => {
        const url = new URL(request.url)
        const q = url.searchParams.get('q')
        expect(q).toBe('0912345678')
        return HttpResponse.json({
          success: true,
          data: {
            authUserId: '99999999-9999-4999-8999-999999999999',
            maskedName: 'Trần V** B***'
          }
        })
      })
    )

    renderWithProviders(<TransferPage />)

    const recipientInput = screen.getByPlaceholderText(/Ví dụ: 0912345678/)
    fireEvent.change(recipientInput, { target: { value: '0912345678' } })

    const lookupBtn = screen.getByRole('button', { name: /Kiểm tra/ })
    fireEvent.click(lookupBtn)

    await waitFor(() => {
      expect(screen.getAllByText('Trần V** B***').length).toBeGreaterThan(0)
      expect(screen.getByText('Hợp lệ')).toBeDefined()
    })
  })

  it('tra cứu người nhận 404: hiển thị thông báo lỗi chung không lộ thông tin nội bộ', async () => {
    const userId = 'user-lookup-404-uuid'
    useAuthStore.setState({
      user: {
        id: userId,
        username: 'annguyen',
        email: 'an@demo.vn',
        firstName: 'An',
        lastName: 'Nguyễn',
        role: 'USER',
        kycTier: 1,
        balance: '1250000'
      },
      accessToken: 'token',
      initialized: true
    })

    server.use(
      http.get('*/api/wallets/me', () => {
        return HttpResponse.json({
          success: true,
          data: { id: 'wallet-1', userId, balance: '1250000', availableBalance: '1250000', heldBalance: '0' }
        })
      }),
      http.get('*/api/users/lookup', () => {
        return HttpResponse.json(
          { success: false, error: { code: 'NOT_FOUND', message: 'User not found' } },
          { status: 404 }
        )
      })
    )

    renderWithProviders(<TransferPage />)

    const recipientInput = screen.getByPlaceholderText(/Ví dụ: 0912345678/)
    fireEvent.change(recipientInput, { target: { value: '0999999999' } })

    const lookupBtn = screen.getByRole('button', { name: /Kiểm tra/ })
    fireEvent.click(lookupBtn)

    await waitFor(() => {
      expect(
        screen.getByText(/Không tìm thấy người nhận phù hợp\. Vui lòng kiểm tra lại email hoặc số điện thoại\./)
      ).toBeDefined()
    })
  })

  it('tra cứu người nhận 429: hiển thị thông điệp cooldown', async () => {
    const userId = 'user-lookup-429-uuid'
    useAuthStore.setState({
      user: {
        id: userId,
        username: 'annguyen',
        email: 'an@demo.vn',
        firstName: 'An',
        lastName: 'Nguyễn',
        role: 'USER',
        kycTier: 1,
        balance: '1250000'
      },
      accessToken: 'token',
      initialized: true
    })

    server.use(
      http.get('*/api/wallets/me', () => {
        return HttpResponse.json({
          success: true,
          data: { id: 'wallet-1', userId, balance: '1250000', availableBalance: '1250000', heldBalance: '0' }
        })
      }),
      http.get('*/api/users/lookup', () => {
        return HttpResponse.json(
          { success: false, error: { code: 'TOO_MANY_REQUESTS', message: 'Rate limit' } },
          { status: 429, headers: { 'Retry-After': '30' } }
        )
      })
    )

    renderWithProviders(<TransferPage />)

    const recipientInput = screen.getByPlaceholderText(/Ví dụ: 0912345678/)
    fireEvent.change(recipientInput, { target: { value: '0912345678' } })

    const lookupBtn = screen.getByRole('button', { name: /Kiểm tra/ })
    fireEvent.click(lookupBtn)

    await waitFor(() => {
      expect(screen.getByText(/Bạn đang thao tác quá nhanh/)).toBeDefined()
    })
  })

  it('input số tiền chặn ký tự không hợp lệ, chỉ nhận chữ số', () => {
    const userId = 'user-input-amount-uuid'
    useAuthStore.setState({
      user: {
        id: userId,
        username: 'annguyen',
        email: 'an@demo.vn',
        firstName: 'An',
        lastName: 'Nguyễn',
        role: 'USER',
        kycTier: 1,
        balance: '1250000'
      },
      accessToken: 'token',
      initialized: true
    })

    renderWithProviders(<TransferPage />)

    const amountInput = screen.getByPlaceholderText('0') as HTMLInputElement
    fireEvent.change(amountInput, { target: { value: '500abc' } })
    expect(amountInput.value).toBe('500')

    fireEvent.change(amountInput, { target: { value: '100.50' } })
    expect(amountInput.value).toBe('10050')

    fireEvent.change(amountInput, { target: { value: '-200000' } })
    expect(amountInput.value).toBe('200000')
  })

  it('gọi quote thành công chuyển sang Bước 2 (xác nhận, phí 0đ, đếm ngược 60s)', async () => {
    const userId = 'user-quote-success-uuid'
    useAuthStore.setState({
      user: {
        id: userId,
        username: 'annguyen',
        email: 'an@demo.vn',
        firstName: 'An',
        lastName: 'Nguyễn',
        role: 'USER',
        kycTier: 1,
        balance: '1250000'
      },
      accessToken: 'token',
      initialized: true
    })

    server.use(
      http.get('*/api/wallets/me', () => {
        return HttpResponse.json({
          success: true,
          data: { id: 'wallet-1', userId, balance: '1250000', availableBalance: '1250000', heldBalance: '0' }
        })
      }),
      http.get('*/api/users/lookup', () => {
        return HttpResponse.json({
          success: true,
          data: {
            authUserId: '99999999-9999-4999-8999-999999999999',
            maskedName: 'Lê H*** K***'
          }
        })
      }),
      http.post('*/api/payments/p2p/quote', () => {
        return HttpResponse.json({
          success: true,
          data: {
            amount: '60000',
            fee: '0',
            expiresAt: new Date(Date.now() + 60_000).toISOString()
          }
        })
      })
    )

    renderWithProviders(<TransferPage />)

    // Nhập và tìm người nhận
    const recipientInput = screen.getByPlaceholderText(/Ví dụ: 0912345678/)
    fireEvent.change(recipientInput, { target: { value: '0987654321' } })
    fireEvent.click(screen.getByRole('button', { name: /Kiểm tra/ }))

    await waitFor(() => {
      expect(screen.getAllByText('Lê H*** K***').length).toBeGreaterThan(0)
    })

    // Nhập số tiền 60.000
    const amountInput = screen.getByPlaceholderText('0')
    fireEvent.change(amountInput, { target: { value: '60000' } })

    // Bấm Tiếp tục
    const submitBtn = screen.getByRole('button', { name: /Tiếp tục kiểm tra/ })
    fireEvent.click(submitBtn)

    // Kiểm tra Bước 2 hiển thị
    await waitFor(() => {
      expect(screen.getByText('Xác nhận báo giá chuyển tiền')).toBeDefined()
      expect(screen.getByText(/Báo giá có hiệu lực trong: \d+ giây/)).toBeDefined()
      expect(screen.getByText(/Phí giao dịch: 0 ₫/)).toBeDefined()
    })
  })

  it('xử lý 422 LIMIT_EXCEEDED cho cả 3 limitType (PER_TXN, PER_DAY, PER_MONTH) với số tiền chuỗi lớn', async () => {
    const userId = 'user-limit-exceeded-uuid'
    useAuthStore.setState({
      user: {
        id: userId,
        username: 'chi',
        email: 'chi@demo.vn',
        firstName: 'Chi',
        lastName: 'Đỗ',
        role: 'USER',
        kycTier: 0,
        balance: '1100000'
      },
      accessToken: 'token',
      initialized: true
    })

    // 1. PER_TXN
    server.use(
      http.get('*/api/wallets/me', () => {
        return HttpResponse.json({
          success: true,
          data: { id: 'wallet-1', userId, balance: '1100000', availableBalance: '1100000', heldBalance: '0', kycTier: 0 }
        })
      }),
      http.get('*/api/users/lookup', () => {
        return HttpResponse.json({
          success: true,
          data: { authUserId: '99999999-9999-4999-8999-999999999999', maskedName: 'Trần B' }
        })
      }),
      http.post('*/api/payments/p2p/quote', () => {
        return HttpResponse.json(
          {
            success: false,
            error: {
              code: 'LIMIT_EXCEEDED',
              message: 'Vượt hạn mức',
              details: {
                limitType: 'PER_TXN',
                limit: '200000',
                used: '0',
                remaining: '200000',
                kycTier: 0
              }
            }
          },
          { status: 422 }
        )
      })
    )

    renderWithProviders(<TransferPage />)

    fireEvent.change(screen.getByPlaceholderText(/Ví dụ: 0912345678/), { target: { value: '0912345678' } })
    fireEvent.click(screen.getByRole('button', { name: /Kiểm tra/ }))

    await waitFor(() => expect(screen.getAllByText('Trần B').length).toBeGreaterThan(0))

    fireEvent.change(screen.getByPlaceholderText('0'), { target: { value: '600000' } })
    fireEvent.click(screen.getByRole('button', { name: /Tiếp tục kiểm tra/ }))

    await waitFor(() => {
      expect(screen.getByText(/Vượt quá hạn mức tối đa cho mỗi lần chuyển/)).toBeDefined()
      expect(screen.getByText(/Bạn còn được chuyển tối đa 200\.000 ₫ trong lần này/)).toBeDefined()
      expect(screen.getByText('Nâng cấp gói KYC ngay')).toBeDefined()
    })

    // 2. PER_DAY
    server.use(
      http.post('*/api/payments/p2p/quote', () => {
        return HttpResponse.json(
          {
            success: false,
            error: {
              code: 'LIMIT_EXCEEDED',
              message: 'Vượt hạn mức ngày',
              details: {
                limitType: 'PER_DAY',
                limit: '500000',
                used: '400000',
                remaining: '100000',
                kycTier: 0
              }
            }
          },
          { status: 422 }
        )
      })
    )

    fireEvent.click(screen.getByRole('button', { name: /Tiếp tục kiểm tra/ }))

    await waitFor(() => {
      expect(screen.getByText(/Vượt quá hạn mức giao dịch trong ngày/)).toBeDefined()
      expect(screen.getByText(/Hôm nay bạn chỉ còn được chuyển thêm 100\.000 ₫/)).toBeDefined()
    })

    // 3. PER_MONTH
    server.use(
      http.post('*/api/payments/p2p/quote', () => {
        return HttpResponse.json(
          {
            success: false,
            error: {
              code: 'LIMIT_EXCEEDED',
              message: 'Vượt hạn mức tháng',
              details: {
                limitType: 'PER_MONTH',
                limit: '2000000',
                used: '1800000',
                remaining: '200000',
                kycTier: 0
              }
            }
          },
          { status: 422 }
        )
      })
    )

    fireEvent.click(screen.getByRole('button', { name: /Tiếp tục kiểm tra/ }))

    await waitFor(() => {
      expect(screen.getByText(/Vượt quá hạn mức giao dịch trong tháng/)).toBeDefined()
      expect(screen.getByText(/Trong tháng này bạn chỉ còn lại 200\.000 ₫/)).toBeDefined()
    })
  })
})
