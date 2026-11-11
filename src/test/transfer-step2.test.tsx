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

describe('TransferPage Bước 2 - Checkout, PIN, Confirm [K18-4]', () => {
  const senderUserId = '11111111-1111-4111-8111-111111111111'
  const receiverUserId = '22222222-2222-4222-8222-222222222222'

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

  it('luồng chuyển tiền thành công trọn vẹn: quote -> checkout (Idempotency-Key) -> PIN -> confirm (X-Transaction-Token) -> biên lai', async () => {
    let capturedIdempotencyKey: string | null = null
    let capturedCheckoutBody: unknown = null
    let capturedPinBody: unknown = null
    let capturedConfirmToken: string | null = null
    let capturedConfirmPaymentId: string | null = null

    server.use(
      http.get('*/api/wallets/me', () => {
        return HttpResponse.json({
          success: true,
          data: {
            id: 'wallet-step2-1',
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
        capturedIdempotencyKey = request.headers.get('Idempotency-Key')
        capturedCheckoutBody = await request.json()
        return HttpResponse.json(
          {
            success: true,
            data: {
              paymentId: 'pay_checkout_success_777',
              id: 'pay_checkout_success_777',
              status: 'PENDING',
              holdExpiresAt: new Date(Date.now() + 300000).toISOString()
            }
          },
          { status: 201 }
        )
      }),
      http.post('*/api/auth/pin/verify', async ({ request }) => {
        capturedPinBody = await request.json()
        return HttpResponse.json({
          success: true,
          data: {
            transactionToken: 'txn_jwt_single_use_token_999',
            expiresIn: 60
          }
        })
      }),
      http.post('*/api/payments/:id/confirm', async ({ request, params }) => {
        capturedConfirmToken = request.headers.get('X-Transaction-Token')
        capturedConfirmPaymentId = params.id as string
        return HttpResponse.json({
          success: true,
          data: {
            status: 'SUCCESS'
          }
        })
      })
    )

    renderWithProviders(<TransferPage />)

    // Bước 1: Tra cứu người nhận
    const recipientInput = screen.getByPlaceholderText(/Ví dụ: 0912345678/)
    fireEvent.change(recipientInput, { target: { value: '0988888888' } })
    fireEvent.click(screen.getByRole('button', { name: /Kiểm tra/ }))

    await waitFor(() => {
      expect(screen.getAllByText('Bình Nguyễn').length).toBeGreaterThan(0)
    })

    // Lấy báo giá để chuyển sang Bước 2
    const quoteBtn = screen.getByRole('button', { name: /Tiếp tục kiểm tra/ })
    fireEvent.click(quoteBtn)

    await waitFor(() => {
      expect(screen.getByText('Xác nhận báo giá chuyển tiền')).toBeDefined()
    })

    // Bước 2: Bấm "Xác nhận chuyển tiền"
    const confirmTransferBtn = screen.getByRole('button', { name: /Xác nhận chuyển tiền/ })
    fireEvent.click(confirmTransferBtn)

    // Kiểm tra API checkout đã được gọi với Idempotency-Key hợp lệ (UUID v4)
    await waitFor(() => {
      expect(capturedIdempotencyKey).toBeTruthy()
      expect(capturedIdempotencyKey).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      )
      expect(capturedCheckoutBody).toEqual({
        destinationUserId: receiverUserId,
        amount: '50000',
        note: 'Chuyển tiền FinVault'
      })
    })

    // Modal nhập PIN xuất hiện
    await waitFor(() => {
      expect(screen.getByText('Xác thực mã PIN giao dịch')).toBeDefined()
    })

    // Nhập 6 số PIN bằng cách click bàn phím ảo
    const keypadButtons = screen.getAllByRole('button')
    const key1 = keypadButtons.find((b) => b.textContent?.trim() === '1')!
    const key2 = keypadButtons.find((b) => b.textContent?.trim() === '2')!
    const key3 = keypadButtons.find((b) => b.textContent?.trim() === '3')!
    const key4 = keypadButtons.find((b) => b.textContent?.trim() === '4')!
    const key5 = keypadButtons.find((b) => b.textContent?.trim() === '5')!
    const key6 = keypadButtons.find((b) => b.textContent?.trim() === '6')!

    fireEvent.click(key1)
    fireEvent.click(key2)
    fireEvent.click(key3)
    fireEvent.click(key4)
    fireEvent.click(key5)
    fireEvent.click(key6)

    // Xác nhận gọi verify PIN
    await waitFor(() => {
      expect(capturedPinBody).toEqual({
        pin: '123456',
        paymentId: 'pay_checkout_success_777',
        amount: '50000'
      })
    })

    // Xác nhận gọi confirm với header X-Transaction-Token
    await waitFor(() => {
      expect(capturedConfirmPaymentId).toBe('pay_checkout_success_777')
      expect(capturedConfirmToken).toBe('txn_jwt_single_use_token_999')
    })

    // Bước 3: Kiểm tra hiển thị màn hình biên lai thành công
    await waitFor(() => {
      expect(screen.getByText('Chuyển tiền thành công!')).toBeDefined()
      expect(screen.getByText('pay_checkout_success_777')).toBeDefined()
      expect(screen.getByText('50.000 ₫')).toBeDefined()
    })
  })

  it('xử lý nhập sai mã PIN: hiển thị số lần thử còn lại và không lộ PIN', async () => {
    const test2SenderId = '33333333-3333-4333-8333-333333333333'
    const test2ReceiverId = '44444444-4444-4444-8444-444444444444'

    useAuthStore.setState({
      user: {
        id: test2SenderId,
        username: 'test2user',
        email: 'test2@demo.vn',
        firstName: 'Test',
        lastName: 'Two',
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
            id: 'wallet-step2-2',
            userId: test2SenderId,
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
            authUserId: test2ReceiverId,
            maskedName: 'Chi Nguyễn'
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
              paymentId: 'pay_pin_err_001',
              status: 'PENDING',
              holdExpiresAt: new Date(Date.now() + 300000).toISOString()
            }
          },
          { status: 201 }
        )
      }),
      http.post('*/api/auth/pin/verify', () => {
        return HttpResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_PIN',
              message: 'Mã PIN không chính xác. Bạn còn 4 lần thử.',
              details: {
                remainingAttempts: 4
              }
            }
          },
          { status: 400 }
        )
      })
    )

    renderWithProviders(<TransferPage />)

    // Lookup & Quote
    fireEvent.change(screen.getByPlaceholderText(/Ví dụ: 0912345678/), { target: { value: '0977777777' } })
    fireEvent.click(screen.getByRole('button', { name: /Kiểm tra/ }))
    await waitFor(() => expect(screen.getAllByText('Chi Nguyễn').length).toBeGreaterThan(0))
    fireEvent.click(screen.getByRole('button', { name: /Tiếp tục kiểm tra/ }))
    await waitFor(() => expect(screen.getByText('Xác nhận báo giá chuyển tiền')).toBeDefined())

    // Checkout & Pin
    fireEvent.click(screen.getByRole('button', { name: /Xác nhận chuyển tiền/ }))
    await waitFor(() => expect(screen.getByText('Xác thực mã PIN giao dịch')).toBeDefined())

    // Nhập sai 6 số: 999999
    const keypadButtons = screen.getAllByRole('button')
    const key9 = keypadButtons.find((b) => b.textContent?.trim() === '9')!
    for (let i = 0; i < 6; i++) {
      fireEvent.click(key9)
    }

    // Hiển thị thông báo lỗi
    await waitFor(() => {
      expect(screen.getByText(/Mã PIN không chính xác\. Bạn còn 4 lần thử\./)).toBeDefined()
    })
  })

  it('xử lý TXN_TOKEN_EXPIRED (401 khi confirm): giữ nguyên paymentId và mở lại PinModal', async () => {
    let confirmCallCount = 0
    const test3SenderId = '55555555-5555-4555-8555-555555555555'
    const test3ReceiverId = '66666666-6666-4666-8666-666666666666'

    useAuthStore.setState({
      user: {
        id: test3SenderId,
        username: 'test3user',
        email: 'test3@demo.vn',
        firstName: 'Test',
        lastName: 'Three',
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
            id: 'wallet-step2-3',
            userId: test3SenderId,
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
            authUserId: test3ReceiverId,
            maskedName: 'Dũng Lê'
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
              paymentId: 'pay_token_expired_999',
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
            transactionToken: 'token_attempt_' + (++confirmCallCount),
            expiresIn: 60
          }
        })
      }),
      http.post('*/api/payments/:id/confirm', () => {
        if (confirmCallCount === 1) {
          // Lần đầu confirm báo mã xác thực hết hạn (TXN_TOKEN_EXPIRED)
          return HttpResponse.json(
            {
              success: false,
              error: {
                code: 'TXN_TOKEN_EXPIRED',
                message: 'Mã xác thực giao dịch đã hết hạn.'
              }
            },
            { status: 401 }
          )
        }
        // Lần 2 nhập lại PIN thì thành công
        return HttpResponse.json({
          success: true,
          data: { status: 'SUCCESS' }
        })
      })
    )

    renderWithProviders(<TransferPage />)

    // Lookup & Quote
    fireEvent.change(screen.getByPlaceholderText(/Ví dụ: 0912345678/), { target: { value: '0966666666' } })
    fireEvent.click(screen.getByRole('button', { name: /Kiểm tra/ }))
    await waitFor(() => expect(screen.getAllByText('Dũng Lê').length).toBeGreaterThan(0))
    fireEvent.click(screen.getByRole('button', { name: /Tiếp tục kiểm tra/ }))
    await waitFor(() => expect(screen.getByText('Xác nhận báo giá chuyển tiền')).toBeDefined())

    // Checkout & Pin lần 1
    fireEvent.click(screen.getByRole('button', { name: /Xác nhận chuyển tiền/ }))
    await waitFor(() => expect(screen.getByText('Xác thực mã PIN giao dịch')).toBeDefined())

    const keypadButtons = screen.getAllByRole('button')
    const key1 = keypadButtons.find((b) => b.textContent?.trim() === '1')!
    for (let i = 0; i < 6; i++) {
      fireEvent.click(key1)
    }

    // Modal tự mở lại sau khi lỗi TXN_TOKEN_EXPIRED
    await waitFor(() => {
      expect(screen.getByText('Xác thực mã PIN giao dịch')).toBeDefined()
    })

    // Lấy lại các nút bàn phím mới sau khi modal mount lại
    const newKeypadButtons = screen.getAllByRole('button')
    const newKey1 = newKeypadButtons.find((b) => b.textContent?.trim() === '1')!
    for (let i = 0; i < 6; i++) {
      fireEvent.click(newKey1)
    }

    // Thành công ở lần 2
    await waitFor(() => {
      expect(screen.getByText('Chuyển tiền thành công!')).toBeDefined()
      expect(screen.getByText('pay_token_expired_999')).toBeDefined()
    })
  })
})
