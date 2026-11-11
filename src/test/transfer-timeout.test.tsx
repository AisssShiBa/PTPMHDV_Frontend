import { describe, it, expect, beforeEach, vi } from 'vitest'
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

describe('TransferPage Timeout & Safe Retry - K18-5', () => {
  const senderUserId = '11111111-2222-4333-8444-555555555555'
  const receiverUserId = '66666666-7777-4888-8999-000000000000'

  beforeEach(() => {
    server.resetHandlers()
    useAuthStore.setState({
      user: {
        id: senderUserId,
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
  })

  it('checkout bị timeout: hiển thị "Đang xử lý, vui lòng không thực hiện lại" và bấm Thử lại giữ CÙNG Idempotency-Key', async () => {
    let checkoutAttempt = 0
    let firstKey: string | null = null
    let secondKey: string | null = null

    server.use(
      http.get('*/api/wallets/me', () => {
        return HttpResponse.json({
          success: true,
          data: {
            id: 'wallet-timeout-1',
            userId: senderUserId,
            balance: '1250000',
            availableBalance: '1250000',
            heldBalance: '0',
            kycTier: 1
          }
        })
      }),
      http.get('*/api/users/lookup', () => {
        return HttpResponse.json({
          success: true,
          data: {
            authUserId: receiverUserId,
            maskedName: 'Bình Nguyễn'
          }
        })
      }),
      http.post('*/api/payments/p2p/quote', () => {
        return HttpResponse.json({
          success: true,
          data: {
            amount: '50000',
            fee: '0',
            expiresAt: new Date(Date.now() + 60000).toISOString()
          }
        })
      }),
      http.post('*/api/payments/p2p/checkout', async ({ request }) => {
        checkoutAttempt++
        if (checkoutAttempt === 1) {
          firstKey = request.headers.get('Idempotency-Key')
          // Giả lập 504 Gateway Timeout
          return HttpResponse.json(
            {
              success: false,
              error: { code: 'GATEWAY_TIMEOUT', message: 'Gateway Timeout' }
            },
            { status: 504 }
          )
        }

        secondKey = request.headers.get('Idempotency-Key')
        return HttpResponse.json(
          {
            success: true,
            data: {
              paymentId: 'pay_retry_success_888',
              id: 'pay_retry_success_888',
              status: 'PENDING',
              holdExpiresAt: new Date(Date.now() + 300000).toISOString(),
              replayed: true
            }
          },
          { status: 201 }
        )
      })
    )

    renderWithProviders(<TransferPage />)

    // Lookup
    fireEvent.change(screen.getByPlaceholderText(/Ví dụ: 0912345678/), { target: { value: '0988888888' } })
    fireEvent.click(screen.getByRole('button', { name: /Kiểm tra/ }))
    await waitFor(() => expect(screen.getAllByText('Bình Nguyễn').length).toBeGreaterThan(0))

    // Sang Bước 2
    fireEvent.click(screen.getByRole('button', { name: /Tiếp tục kiểm tra/ }))
    await waitFor(() => expect(screen.getByText('Xác nhận báo giá chuyển tiền')).toBeDefined())

    // Bấm Checkout lần 1 -> timeout
    fireEvent.click(screen.getByRole('button', { name: /Xác nhận chuyển tiền/ }))

    // Kiểm tra hiển thị banner "Đang xử lý, vui lòng không thực hiện lại"
    await waitFor(() => {
      expect(screen.getByText('Đang xử lý, vui lòng không thực hiện lại')).toBeDefined()
      expect(screen.getByRole('button', { name: /Thử lại/ })).toBeDefined()
    })

    // Bấm "Thử lại"
    fireEvent.click(screen.getByRole('button', { name: /Thử lại/ }))

    // Kiểm tra cả 2 lần đều gửi CÙNG một Idempotency-Key
    await waitFor(() => {
      expect(firstKey).toBeTruthy()
      expect(secondKey).toBeTruthy()
      expect(firstKey).toBe(secondKey)
      // Mở modal nhập PIN sau khi retry thành công
      expect(screen.getByText('Xác thực mã PIN giao dịch')).toBeDefined()
    })
  })

  it('confirm bị timeout: KHÔNG gọi confirm lại, poll GET /payments/:id ra SUCCESS -> hiển thị thành công', async () => {
    let confirmAttempts = 0
    let pollCount = 0

    server.use(
      http.get('*/api/wallets/me', () => {
        return HttpResponse.json({
          success: true,
          data: {
            id: 'wallet-timeout-2',
            userId: senderUserId,
            balance: '1250000',
            availableBalance: '1250000',
            heldBalance: '0',
            kycTier: 1
          }
        })
      }),
      http.get('*/api/users/lookup', () => {
        return HttpResponse.json({
          success: true,
          data: {
            authUserId: receiverUserId,
            maskedName: 'Bình Nguyễn'
          }
        })
      }),
      http.post('*/api/payments/p2p/quote', () => {
        return HttpResponse.json({
          success: true,
          data: {
            amount: '50000',
            fee: '0',
            expiresAt: new Date(Date.now() + 60000).toISOString()
          }
        })
      }),
      http.post('*/api/payments/p2p/checkout', () => {
        return HttpResponse.json(
          {
            success: true,
            data: {
              paymentId: 'pay_confirm_timeout_123',
              id: 'pay_confirm_timeout_123',
              status: 'PENDING',
              holdExpiresAt: new Date(Date.now() + 300000).toISOString()
            }
          },
          { status: 201 }
        )
      }),
      http.post('*/api/auth/pin/verify', () => {
        return HttpResponse.json({
          success: true,
          data: {
            transactionToken: 'token_single_use_456',
            expiresIn: 60
          }
        })
      }),
      http.post('*/api/payments/:id/confirm', () => {
        confirmAttempts++
        // Giả lập 504 Gateway Timeout ở bước confirm
        return HttpResponse.json(
          {
            success: false,
            error: { code: 'PAYMENT_PROCESSING', message: 'Payment is being processed by background worker' }
          },
          { status: 504 }
        )
      }),
      http.get('*/api/payments/:id', () => {
        pollCount++
        if (pollCount === 1) {
          return HttpResponse.json({
            success: true,
            data: {
              id: 'pay_confirm_timeout_123',
              status: 'PENDING'
            }
          })
        }
        return HttpResponse.json({
          success: true,
          data: {
            id: 'pay_confirm_timeout_123',
            status: 'SUCCESS'
          }
        })
      })
    )

    renderWithProviders(<TransferPage />)

    // Lookup & Quote
    fireEvent.change(screen.getByPlaceholderText(/Ví dụ: 0912345678/), { target: { value: '0988888888' } })
    fireEvent.click(screen.getByRole('button', { name: /Kiểm tra/ }))
    await waitFor(() => expect(screen.getAllByText('Bình Nguyễn').length).toBeGreaterThan(0))
    fireEvent.click(screen.getByRole('button', { name: /Tiếp tục kiểm tra/ }))
    await waitFor(() => expect(screen.getByText('Xác nhận báo giá chuyển tiền')).toBeDefined())

    // Checkout
    fireEvent.click(screen.getByRole('button', { name: /Xác nhận chuyển tiền/ }))
    await waitFor(() => expect(screen.getByText('Xác thực mã PIN giao dịch')).toBeDefined())

    // Nhập PIN 111111
    const keypadButtons = screen.getAllByRole('button')
    const key1 = keypadButtons.find((b) => b.textContent?.trim() === '1')!
    for (let i = 0; i < 6; i++) {
      fireEvent.click(key1)
    }

    // Xác nhận đã timeout confirm nhưng KHÔNG gọi lại confirm
    await waitFor(
      () => {
        expect(confirmAttempts).toBe(1)
        expect(pollCount).toBeGreaterThanOrEqual(1)
        // Kết quả poll thành công chuyển sang Bước 3
        expect(screen.getByText('Chuyển tiền thành công!')).toBeDefined()
        expect(screen.getByText('pay_confirm_timeout_123')).toBeDefined()
      },
      { timeout: 8000 }
    )
  })

  it('confirm bị timeout: poll ra FAILED -> hiển thị màn thất bại và lý do', async () => {
    server.use(
      http.get('*/api/wallets/me', () => {
        return HttpResponse.json({
          success: true,
          data: {
            id: 'wallet-timeout-3',
            userId: senderUserId,
            balance: '1250000',
            availableBalance: '1250000',
            heldBalance: '0',
            kycTier: 1
          }
        })
      }),
      http.get('*/api/users/lookup', () => {
        return HttpResponse.json({
          success: true,
          data: {
            authUserId: receiverUserId,
            maskedName: 'Bình Nguyễn'
          }
        })
      }),
      http.post('*/api/payments/p2p/quote', () => {
        return HttpResponse.json({
          success: true,
          data: {
            amount: '50000',
            fee: '0',
            expiresAt: new Date(Date.now() + 60000).toISOString()
          }
        })
      }),
      http.post('*/api/payments/p2p/checkout', () => {
        return HttpResponse.json(
          {
            success: true,
            data: {
              paymentId: 'pay_poll_failed_001',
              id: 'pay_poll_failed_001',
              status: 'PENDING',
              holdExpiresAt: new Date(Date.now() + 300000).toISOString()
            }
          },
          { status: 201 }
        )
      }),
      http.post('*/api/auth/pin/verify', () => {
        return HttpResponse.json({
          success: true,
          data: {
            transactionToken: 'token_failed_poll_999',
            expiresIn: 60
          }
        })
      }),
      http.post('*/api/payments/:id/confirm', () => {
        return HttpResponse.json(
          {
            success: false,
            error: { code: 'GATEWAY_TIMEOUT', message: 'Timeout' }
          },
          { status: 504 }
        )
      }),
      http.get('*/api/payments/:id', () => {
        return HttpResponse.json({
          success: true,
          data: {
            id: 'pay_poll_failed_001',
            status: 'FAILED'
          }
        })
      })
    )

    renderWithProviders(<TransferPage />)

    // Lookup & Quote
    fireEvent.change(screen.getByPlaceholderText(/Ví dụ: 0912345678/), { target: { value: '0988888888' } })
    fireEvent.click(screen.getByRole('button', { name: /Kiểm tra/ }))
    await waitFor(() => expect(screen.getAllByText('Bình Nguyễn').length).toBeGreaterThan(0))
    fireEvent.click(screen.getByRole('button', { name: /Tiếp tục kiểm tra/ }))
    await waitFor(() => expect(screen.getByText('Xác nhận báo giá chuyển tiền')).toBeDefined())

    // Checkout
    fireEvent.click(screen.getByRole('button', { name: /Xác nhận chuyển tiền/ }))
    await waitFor(() => expect(screen.getByText('Xác thực mã PIN giao dịch')).toBeDefined())

    // Nhập PIN 111111
    const keypadButtons = screen.getAllByRole('button')
    const key1 = keypadButtons.find((b) => b.textContent?.trim() === '1')!
    for (let i = 0; i < 6; i++) {
      fireEvent.click(key1)
    }

    // Hiển thị màn thất bại
    await waitFor(
      () => {
        expect(screen.getByText('Thanh toán thất bại')).toBeDefined()
        expect(screen.getByText('pay_poll_failed_001')).toBeDefined()
        expect(screen.getByText('FAILED')).toBeDefined()
      },
      { timeout: 8000 }
    )
  })

  it('confirm bị timeout và poll vượt quá trần thời gian: giữ trạng thái "Giao dịch đang xử lý", hiển thị nút "Kiểm tra lại" và link Lịch sử', async () => {
    let nowOffset = 0
    const realDateNow = Date.now
    vi.spyOn(Date, 'now').mockImplementation(() => realDateNow() + nowOffset)

    server.use(
      http.get('*/api/wallets/me', () => {
        return HttpResponse.json({
          success: true,
          data: {
            id: 'wallet-timeout-4',
            userId: senderUserId,
            balance: '1250000',
            availableBalance: '1250000',
            heldBalance: '0',
            kycTier: 1
          }
        })
      }),
      http.get('*/api/users/lookup', () => {
        return HttpResponse.json({
          success: true,
          data: {
            authUserId: receiverUserId,
            maskedName: 'Bình Nguyễn'
          }
        })
      }),
      http.post('*/api/payments/p2p/quote', () => {
        return HttpResponse.json({
          success: true,
          data: {
            amount: '50000',
            fee: '0',
            expiresAt: new Date(Date.now() + 60000).toISOString()
          }
        })
      }),
      http.post('*/api/payments/p2p/checkout', () => {
        return HttpResponse.json(
          {
            success: true,
            data: {
              paymentId: 'pay_ceiling_timeout_999',
              id: 'pay_ceiling_timeout_999',
              status: 'PENDING',
              holdExpiresAt: new Date(Date.now() + 300000).toISOString()
            }
          },
          { status: 201 }
        )
      }),
      http.post('*/api/auth/pin/verify', () => {
        return HttpResponse.json({
          success: true,
          data: {
            transactionToken: 'token_ceiling_test',
            expiresIn: 60
          }
        })
      }),
      http.post('*/api/payments/:id/confirm', () => {
        return HttpResponse.json(
          {
            success: false,
            error: { code: 'GATEWAY_TIMEOUT', message: 'Timeout' }
          },
          { status: 504 }
        )
      }),
      http.get('*/api/payments/:id', () => {
        // Tăng thời gian lên vượt trần 30s sau lần poll đầu tiên
        nowOffset += 31000
        return HttpResponse.json({
          success: true,
          data: {
            id: 'pay_ceiling_timeout_999',
            status: 'PENDING'
          }
        })
      })
    )

    renderWithProviders(<TransferPage />)

    // Lookup & Quote
    fireEvent.change(screen.getByPlaceholderText(/Ví dụ: 0912345678/), { target: { value: '0988888888' } })
    fireEvent.click(screen.getByRole('button', { name: /Kiểm tra/ }))
    await waitFor(() => expect(screen.getAllByText('Bình Nguyễn').length).toBeGreaterThan(0))
    fireEvent.click(screen.getByRole('button', { name: /Tiếp tục kiểm tra/ }))
    await waitFor(() => expect(screen.getByText('Xác nhận báo giá chuyển tiền')).toBeDefined())

    // Checkout
    fireEvent.click(screen.getByRole('button', { name: /Xác nhận chuyển tiền/ }))
    await waitFor(() => expect(screen.getByText('Xác thực mã PIN giao dịch')).toBeDefined())

    // Nhập PIN 111111
    const keypadButtons = screen.getAllByRole('button')
    const key1 = keypadButtons.find((b) => b.textContent?.trim() === '1')!
    for (let i = 0; i < 6; i++) {
      fireEvent.click(key1)
    }

    // Sau khi vượt trần 30s: giữ giao diện "Giao dịch đang xử lý", có nút "Kiểm tra lại" và link sang trang Lịch sử
    await waitFor(
      () => {
        expect(screen.getByText('Giao dịch đang xử lý')).toBeDefined()
        expect(screen.getByRole('button', { name: /Kiểm tra lại/ })).toBeDefined()
        expect(screen.getByText('Xem Lịch sử giao dịch')).toBeDefined()
      },
      { timeout: 8000 }
    )

    vi.restoreAllMocks()
  })
})
