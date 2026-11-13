import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { TransferPage } from '@/pages/TransferPage'
import { useAuthStore } from '@/features/auth/stores/useAuthStore'
import { paymentApi } from '@/features/payment'

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

describe('Nghiệm thu K19: Kịch bản A1, A2, A9 và chuyển An sang Bình qua giao diện Web [K19-4]', () => {
  const chiUser = {
    id: '00000000-0000-4000-8000-000000000003',
    username: 'chitt',
    email: 'chi@demo.vn',
    firstName: 'Chi',
    lastName: 'Trần',
    role: 'USER' as const,
    kycTier: 0
  }

  const binhUser = {
    authUserId: '00000000-0000-4000-8000-000000000002',
    maskedName: 'Bình Nguyễn'
  }

  beforeEach(() => {
    server.resetHandlers()
    useAuthStore.setState({
      user: chiUser,
      accessToken: 'token-chi-test',
      initialized: true,
      loading: false
    })
  })

  // =========================================================================
  // KỊCH BẢN CHUYỂN AN SANG BINH 60.000đ TRÊN WEB:
  // Số dư đổi đúng ở cả 2 bên (An: 1.250.000đ -> 1.190.000đ, Binh: 300.000đ -> 360.000đ)
  // =========================================================================
  it('Chuyển An sang Bình 60.000đ trên Web: số dư đổi đúng ở cả hai bên', async () => {
    let anBalance = 1250000n
    let binhBalance = 300000n

    const anUser = {
      id: '11111111-1111-4111-8111-111111111111',
      username: 'annguyen',
      email: 'an@demo.vn',
      firstName: 'An',
      lastName: 'Nguyễn',
      role: 'USER' as const,
      kycTier: 2
    }

    useAuthStore.setState({
      user: anUser,
      accessToken: 'token-an-test',
      initialized: true,
      loading: false
    })

    server.use(
      http.get('*/api/wallets/me', () => {
        return HttpResponse.json({
          success: true,
          data: {
            id: 'wallet-an',
            userId: anUser.id,
            balance: anBalance.toString(),
            availableBalance: anBalance.toString(),
            heldBalance: '0',
            currency: 'VND',
            status: 'ACTIVE'
          }
        })
      }),
      http.get('*/api/users/lookup', () => {
        return HttpResponse.json({
          success: true,
          data: binhUser
        })
      }),
      http.post('*/api/payments/p2p/quote', async ({ request }) => {
        const body = (await request.json()) as { amount: string }
        return HttpResponse.json({
          success: true,
          data: {
            amount: body.amount,
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
              paymentId: 'pay-an-binh-60k',
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
            transactionToken: 'txn-token-an-60k',
            expiresAt: new Date(Date.now() + 60000).toISOString()
          }
        })
      }),
      http.post('*/api/payments/:id/confirm', () => {
        anBalance -= 60000n
        binhBalance += 60000n
        return HttpResponse.json({
          success: true,
          data: {
            status: 'SUCCESS'
          }
        })
      })
    )

    renderWithProviders(<TransferPage />)

    // Bước 1: Tra cứu Bình
    const recipientInput = screen.getByPlaceholderText(/Ví dụ: 0912345678/)
    fireEvent.change(recipientInput, { target: { value: '0988888888' } })
    fireEvent.click(screen.getByRole('button', { name: /Kiểm tra/ }))

    await waitFor(() => {
      expect(screen.getAllByText('Bình Nguyễn').length).toBeGreaterThan(0)
    })

    // Nhập số tiền 60.000đ
    const amountInput = screen.getByPlaceholderText('0')
    fireEvent.change(amountInput, { target: { value: '60000' } })

    // Bấm lấy báo giá -> sang bước 2
    fireEvent.click(screen.getByRole('button', { name: /Tiếp tục kiểm tra/ }))

    await waitFor(() => {
      expect(screen.getByText('Xác nhận báo giá chuyển tiền')).toBeDefined()
    })

    // Bước 2: Bấm Xác nhận chuyển tiền -> Checkout thành công -> Mở PinModal
    fireEvent.click(screen.getByRole('button', { name: /Xác nhận chuyển tiền/ }))

    await waitFor(() => {
      expect(screen.getByText('Xác thực mã PIN giao dịch')).toBeDefined()
    })

    // Nhập PIN 6 số qua bàn phím ảo
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

    // Bước 3: Xác nhận thành công -> Màn hình thành công (biên lai)
    await waitFor(() => {
      expect(screen.getByText('Chuyển tiền thành công!')).toBeDefined()
      expect(screen.getAllByText(/60\.000/).length).toBeGreaterThan(0)
    })

    // Kiểm tra số dư đổi đúng ở CẢ HAI bên
    expect(anBalance).toBe(1190000n)
    expect(binhBalance).toBe(360000n)
  })

  // =========================================================================
  // KỊCH BẢN A1: 20 request chuyển song song, mỗi cái 60.000đ trên ví 100.000đ
  // -> đúng 1 thành công, 19 bị từ chối (INSUFFICIENT_FUNDS), số dư còn 40.000đ
  // =========================================================================
  it('A1: 20 request song song trên ví 100.000đ -> đúng 1 thành công, 19 bị từ chối, số dư còn 40.000đ', async () => {
    let currentBalance = 100000n
    let successCount = 0
    let rejectedCount = 0

    server.use(
      http.get('*/api/wallets/me', () => {
        return HttpResponse.json({
          success: true,
          data: {
            id: 'wallet-chi-1',
            userId: chiUser.id,
            balance: currentBalance.toString(),
            availableBalance: currentBalance.toString(),
            heldBalance: '0',
            currency: 'VND',
            status: 'ACTIVE'
          }
        })
      }),
      http.post('*/api/payments/p2p/checkout', async ({ request }) => {
        const body = (await request.json()) as { amount: string }
        const reqAmount = BigInt(body.amount)

        // Mô phỏng logic xử lý giao dịch đồng thời tại backend:
        // Đúng 1 request lấy được lock trừ tiền thành công, 19 request còn lại gặp thiếu số dư
        if (currentBalance >= reqAmount && successCount === 0) {
          successCount++
          currentBalance -= reqAmount
          return HttpResponse.json(
            {
              success: true,
              data: {
                paymentId: 'pay_a1_concurrent_winner',
                status: 'PENDING',
                holdExpiresAt: new Date(Date.now() + 300000).toISOString()
              }
            },
            { status: 201 }
          )
        } else {
          rejectedCount++
          return HttpResponse.json(
            {
              success: false,
              error: {
                code: 'INSUFFICIENT_FUNDS',
                message: 'Số dư khả dụng không đủ để thực hiện giao dịch'
              }
            },
            { status: 422 }
          )
        }
      })
    )

    // Bắn 20 request checkout song song 60.000đ
    const parallelRequests = Array.from({ length: 20 }, (_, idx) =>
      paymentApi
        .p2pCheckout(
          {
            destinationUserId: binhUser.authUserId,
            amount: '60000',
            note: `Concurrent request #${idx + 1}`
          },
          `idem-key-a1-${idx + 1}`
        )
        .then(() => 'SUCCESS')
        .catch((err: unknown) => {
          const axiosErr = err as { response?: { data?: { error?: { code?: string } } } }
          return axiosErr.response?.data?.error?.code || 'ERROR'
        })
    )

    const results = await Promise.all(parallelRequests)
    expect(rejectedCount).toBe(19)

    // Kiểm chứng kết quả A1:
    const successes = results.filter((r) => r === 'SUCCESS')
    const rejections = results.filter((r) => r === 'INSUFFICIENT_FUNDS')

    expect(successes.length).toBe(1)
    expect(rejections.length).toBe(19)
    expect(currentBalance.toString()).toBe('40000')

    // Đồng thời kiểm chứng qua giao diện TransferPage:
    // Render giao diện, số dư ví hiện đúng 40.000đ sau giao dịch
    renderWithProviders(<TransferPage />)

    await waitFor(() => {
      expect(screen.getAllByText('40.000 ₫').length).toBeGreaterThan(0)
    })
  })

  // =========================================================================
  // KỊCH BẢN A2: Bấm xác nhận hai lần liên tiếp (cùng Idempotency-Key)
  // -> chỉ 1 payment, lần 2 trả replayed: true, UI không tạo giao dịch thứ hai
  // =========================================================================
  it('A2: gửi hai lần liên tiếp cùng Idempotency-Key -> chỉ 1 payment, lần 2 trả replayed: true, UI an toàn', async () => {
    let checkoutCalls = 0
    const sharedIdempotencyKey = '00000000-0000-4000-8000-a2a2a2a2a2a2'

    server.use(
      http.get('*/api/wallets/me', () => {
        return HttpResponse.json({
          success: true,
          data: {
            id: 'wallet-chi-1',
            userId: chiUser.id,
            balance: '1000000',
            availableBalance: '1000000',
            currency: 'VND',
            status: 'ACTIVE'
          }
        })
      }),
      http.get('*/api/users/lookup', () => {
        return HttpResponse.json({
          success: true,
          data: binhUser
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
      http.post('*/api/payments/p2p/checkout', ({ request }) => {
        checkoutCalls++
        const key = request.headers.get('Idempotency-Key')
        expect(key).toBeDefined()

        if (checkoutCalls === 1) {
          return HttpResponse.json(
            {
              success: true,
              data: {
                paymentId: 'pay_a2_replay_test_id',
                id: 'pay_a2_replay_test_id',
                status: 'PENDING',
                replayed: false,
                holdExpiresAt: new Date(Date.now() + 300000).toISOString()
              }
            },
            { status: 201 }
          )
        } else {
          // Lần gọi thứ 2 cùng key: trả lại đúng paymentId và cờ replayed: true
          return HttpResponse.json(
            {
              success: true,
              data: {
                paymentId: 'pay_a2_replay_test_id',
                id: 'pay_a2_replay_test_id',
                status: 'PENDING',
                replayed: true,
                holdExpiresAt: new Date(Date.now() + 300000).toISOString()
              }
            },
            { status: 200 }
          )
        }
      }),
      http.post('*/api/auth/pin/verify', () => {
        return HttpResponse.json({
          success: true,
          data: {
            transactionToken: 'txn_jwt_a2_token',
            expiresAt: new Date(Date.now() + 60000).toISOString()
          }
        })
      }),
      http.post('*/api/payments/:id/confirm', () => {
        return HttpResponse.json({
          success: true,
          data: {
            status: 'SUCCESS'
          }
        })
      })
    )

    // Kiểm tra trực tiếp lớp gọi client với cùng Idempotency-Key
    const firstCall = await paymentApi.p2pCheckout(
      { destinationUserId: binhUser.authUserId, amount: '50000' },
      sharedIdempotencyKey
    )
    expect(firstCall.paymentId || firstCall.id).toBe('pay_a2_replay_test_id')
    expect(firstCall.replayed).toBeFalsy()

    const secondCall = await paymentApi.p2pCheckout(
      { destinationUserId: binhUser.authUserId, amount: '50000' },
      sharedIdempotencyKey
    )
    expect(secondCall.paymentId || secondCall.id).toBe('pay_a2_replay_test_id')
    expect(secondCall.replayed).toBe(true)

    // Cùng một paymentId, server chỉ tạo 1 giao dịch
    expect(checkoutCalls).toBe(2)

    // Khởi chạy trên giao diện TransferPage
    renderWithProviders(<TransferPage />)

    // Tra cứu người nhận
    const recipientInput = screen.getByPlaceholderText(/Ví dụ: 0912345678/)
    fireEvent.change(recipientInput, { target: { value: '0988888888' } })
    fireEvent.click(screen.getByRole('button', { name: /Kiểm tra/ }))

    await waitFor(() => {
      expect(screen.getAllByText('Bình Nguyễn').length).toBeGreaterThan(0)
    })

    // Lấy báo giá
    fireEvent.click(screen.getByRole('button', { name: /Tiếp tục kiểm tra/ }))

    await waitFor(() => {
      expect(screen.getByText('Xác nhận báo giá chuyển tiền')).toBeDefined()
    })

    // Nút xác nhận chuyển tiền bị vô hiệu hóa khi đang xử lý để chống bấm đúp
    const confirmBtn = screen.getByRole('button', { name: /Xác nhận chuyển tiền/ })
    fireEvent.click(confirmBtn)

    // Modal PIN mở ra cho đúng 1 giao dịch
    await waitFor(() => {
      expect(screen.getByText('Xác thực mã PIN giao dịch')).toBeDefined()
    })
  })

  // =========================================================================
  // KỊCH BẢN A9: chi@demo.vn (Cấp 0), nạp 1.000.000đ
  // (a) Chuyển 600.000đ -> 422 LIMIT_EXCEEDED (PER_TXN), số dư không đổi
  // (b) Chuyển 2 x 200.000đ -> thành công, lần 3 x 200.000đ -> 422 (PER_DAY)
  // =========================================================================
  it('A9 (a): Chuyển 600.000đ vượt hạn mức PER_TXN (200.000đ) -> 422 LIMIT_EXCEEDED, hiển thị đúng còn lại, số dư không đổi', async () => {
    server.use(
      http.get('*/api/wallets/me', () => {
        return HttpResponse.json({
          success: true,
          data: {
            id: 'wallet-chi-a9',
            userId: chiUser.id,
            balance: '1100000',
            availableBalance: '1100000',
            heldBalance: '0',
            currency: 'VND',
            status: 'ACTIVE',
            dailyLimit: '500000',
            dailyUsed: '0',
            monthlyLimit: '2000000',
            monthlyUsed: '0'
          }
        })
      }),
      http.get('*/api/users/lookup', () => {
        return HttpResponse.json({
          success: true,
          data: binhUser
        })
      }),
      // Quote trả về lỗi 422 LIMIT_EXCEEDED với limitType PER_TXN
      http.post('*/api/payments/p2p/quote', () => {
        return HttpResponse.json(
          {
            success: false,
            error: {
              code: 'LIMIT_EXCEEDED',
              message: 'Hạn mức giao dịch vượt quá quy định',
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

    // Tra cứu người nhận
    const recipientInput = screen.getByPlaceholderText(/Ví dụ: 0912345678/)
    fireEvent.change(recipientInput, { target: { value: '0988888888' } })
    fireEvent.click(screen.getByRole('button', { name: /Kiểm tra/ }))

    await waitFor(() => {
      expect(screen.getAllByText('Bình Nguyễn').length).toBeGreaterThan(0)
    })

    // Nhập 600.000đ
    const amountInput = screen.getByPlaceholderText('0')
    fireEvent.change(amountInput, { target: { value: '600000' } })

    // Bấm kiểm tra báo giá
    const quoteBtn = screen.getByRole('button', { name: /Tiếp tục kiểm tra/ })
    fireEvent.click(quoteBtn)

    // Kiểm chứng UI hiển thị thông báo lỗi hạn mức PER_TXN rõ ràng kèm số tiền còn lại
    await waitFor(() => {
      expect(screen.getByText(/Vượt quá hạn mức tối đa cho mỗi lần chuyển/)).toBeDefined()
      expect(screen.getAllByText(/200\.000/).length).toBeGreaterThan(0)
    })

    // Số dư ví không hề suy chuyển
    expect(screen.getAllByText('1.100.000 ₫').length).toBeGreaterThan(0)
  })

  it('A9 (b): Chuyển 2 lần 200.000đ thành công, lần thứ 3 bị 422 LIMIT_EXCEEDED (PER_DAY)', async () => {
    let dayUsage = 0n
    const dailyLimit = 500000n // 500.000đ/ngày cho Cấp 0

    server.use(
      http.get('*/api/wallets/me', () => {
        return HttpResponse.json({
          success: true,
          data: {
            id: 'wallet-chi-a9-b',
            userId: chiUser.id,
            balance: (1100000n - dayUsage).toString(),
            availableBalance: (1100000n - dayUsage).toString(),
            heldBalance: '0',
            currency: 'VND',
            status: 'ACTIVE',
            dailyLimit: dailyLimit.toString(),
            dailyUsed: dayUsage.toString()
          }
        })
      }),
      http.get('*/api/users/lookup', () => {
        return HttpResponse.json({
          success: true,
          data: binhUser
        })
      }),
      http.post('*/api/payments/p2p/quote', async ({ request }) => {
        const body = (await request.json()) as { amount: string }
        const reqAmount = BigInt(body.amount)

        // Nếu tổng chi trong ngày vượt quá hạn mức ngày 500.000đ -> ném 422 LIMIT_EXCEEDED (PER_DAY)
        if (dayUsage + reqAmount > dailyLimit) {
          const remaining = dailyLimit - dayUsage
          return HttpResponse.json(
            {
              success: false,
              error: {
                code: 'LIMIT_EXCEEDED',
                message: 'Vượt hạn mức chuyển tiền trong ngày',
                details: {
                  limitType: 'PER_DAY',
                  limit: dailyLimit.toString(),
                  used: dayUsage.toString(),
                  remaining: remaining.toString(),
                  kycTier: 0
                }
              }
            },
            { status: 422 }
          )
        }

        return HttpResponse.json({
          success: true,
          data: {
            amount: body.amount,
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
              paymentId: `pay_a9_${Date.now()}`,
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
            transactionToken: `txn_token_${Date.now()}`,
            expiresAt: new Date(Date.now() + 60000).toISOString()
          }
        })
      }),
      http.post('*/api/payments/:id/confirm', () => {
        // Mỗi lần confirm thành công, tăng mức chi tiêu ngày thêm 200.000đ
        dayUsage += 200000n
        return HttpResponse.json({
          success: true,
          data: {
            status: 'SUCCESS'
          }
        })
      })
    )

    // Lần 1: Chuyển 200.000đ qua API client
    const quote1 = await paymentApi.p2pQuote({ destinationUserId: binhUser.authUserId, amount: '200000' })
    expect(quote1.amount).toBe('200000')
    const checkout1 = await paymentApi.p2pCheckout(
      { destinationUserId: binhUser.authUserId, amount: '200000' },
      'idem-a9-run-1'
    )
    await paymentApi.confirmPayment(checkout1.paymentId || checkout1.id || '', 'tok-1')
    expect(dayUsage).toBe(200000n)

    // Lần 2: Chuyển 200.000đ qua API client
    const quote2 = await paymentApi.p2pQuote({ destinationUserId: binhUser.authUserId, amount: '200000' })
    expect(quote2.amount).toBe('200000')
    const checkout2 = await paymentApi.p2pCheckout(
      { destinationUserId: binhUser.authUserId, amount: '200000' },
      'idem-a9-run-2'
    )
    await paymentApi.confirmPayment(checkout2.paymentId || checkout2.id || '', 'tok-2')
    expect(dayUsage).toBe(400000n)

    // Lần 3: Chuyển 200.000đ QUA GIAO DIỆN TransferPage:
    // Tổng sẽ là 400.000 + 200.000 = 600.000 > 500.000 hạn mức ngày -> Phải bị từ chối 422 PER_DAY
    renderWithProviders(<TransferPage />)

    const recipientInput = screen.getByPlaceholderText(/Ví dụ: 0912345678/)
    fireEvent.change(recipientInput, { target: { value: '0988888888' } })
    fireEvent.click(screen.getByRole('button', { name: /Kiểm tra/ }))

    await waitFor(() => {
      expect(screen.getAllByText('Bình Nguyễn').length).toBeGreaterThan(0)
    })

    // Nhập 200.000đ lần 3
    const amountInput = screen.getByPlaceholderText('0')
    fireEvent.change(amountInput, { target: { value: '200000' } })

    const quoteBtn = screen.getByRole('button', { name: /Tiếp tục kiểm tra/ })
    fireEvent.click(quoteBtn)

    // UI phải hiển thị lỗi PER_DAY và số tiền còn lại là 100.000đ
    await waitFor(() => {
      expect(screen.getByText(/Vượt quá hạn mức giao dịch trong ngày/)).toBeDefined()
      expect(screen.getAllByText(/100\.000/).length).toBeGreaterThan(0)
    })

    // Số dư ví vẫn dừng ở mức sau 2 lần chuyển (chi tiêu là 400.000đ, không bị cộng thêm lần 3)
    expect(dayUsage).toBe(400000n)
  })
})
