import { http, HttpResponse } from 'msw'

export const handlers = [
  // 1. Auth Login
  http.post('*/api/auth/sign-in', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as { username?: string; password?: string }

    if (body.username === 'invalid') {
      return HttpResponse.json(
        {
          success: false,
          error: { code: 'INVALID_CREDENTIALS', message: 'Tên đăng nhập hoặc mật khẩu không đúng.' }
        },
        { status: 401 }
      )
    }

    const isAdmin = body.username?.includes('admin')
    return HttpResponse.json({
      success: true,
      data: {
        accessToken: isAdmin ? 'mock_token_admin_123' : 'mock_token_user_123',
        user: {
          id: isAdmin ? '00000000-0000-0000-0000-000000000002' : '00000000-0000-0000-0000-000000000001',
          username: body.username || 'annguyen',
          email: `${body.username || 'annguyen'}@finvault.local`,
          firstName: isAdmin ? 'Quản trị' : 'An',
          lastName: isAdmin ? 'Viên' : 'Nguyễn',
          role: isAdmin ? 'ADMIN' : 'USER',
          kycTier: isAdmin ? 2 : 1,
          balance: isAdmin ? '50000000' : '1250000'
        }
      }
    })
  }),

  // 2. Auth Refresh
  http.post('*/api/auth/refresh', ({ request }) => {
    const authHeader = request.headers.get('Authorization')
    if (authHeader?.includes('expired_refresh')) {
      return HttpResponse.json(
        {
          success: false,
          error: { code: 'TOKEN_EXPIRED', message: 'Phiên đăng nhập đã hết hạn.' }
        },
        { status: 401 }
      )
    }

    return HttpResponse.json({
      success: true,
      data: {
        accessToken: 'mock_token_refreshed_999',
        user: {
          id: '00000000-0000-0000-0000-000000000001',
          username: 'annguyen',
          email: 'an.nguyen@finvault.local',
          firstName: 'An',
          lastName: 'Nguyễn',
          role: 'USER',
          kycTier: 1,
          balance: '1250000'
        }
      }
    })
  }),

  // 3. Auth Verify PIN (/api/auth/pin/verify & /api/auth/verify-pin)
  http.post('*/api/auth/pin/verify', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as { pin?: string; paymentId?: string; amount?: string }

    if (body.pin === '000000') {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'PIN_LOCKED',
            message: 'Mã PIN đã bị tạm khóa do nhập sai nhiều lần.',
            details: {
              lockedUntil: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
              remainingSeconds: 300
            }
          }
        },
        { status: 423 }
      )
    }

    if (body.pin !== '123456') {
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
    }

    return HttpResponse.json({
      success: true,
      data: {
        transactionToken: 'txn_token_verified_valid_60s',
        expiresIn: 60
      }
    })
  }),

  http.post('*/api/auth/verify-pin', async ({ request }) => {
    const body = (await request.json().catch(() => ({}))) as { pin?: string }

    if (body.pin === '000000') {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'PIN_LOCKED',
            message: 'Mã PIN đã bị tạm khóa do nhập sai nhiều lần.',
            lockedUntil: new Date(Date.now() + 5 * 60 * 1000).toISOString()
          }
        },
        { status: 423 }
      )
    }

    if (body.pin !== '123456') {
      return HttpResponse.json(
        {
          success: false,
          error: { code: 'INVALID_PIN', message: 'Mã PIN không chính xác.' }
        },
        { status: 400 }
      )
    }

    return HttpResponse.json({
      success: true,
      data: {
        transactionToken: 'txn_token_verified_valid_60s'
      }
    })
  }),

  // 4. Wallet Me & Ledger (K18 chuẩn gateway)
  http.get('*/api/wallets/me', () => {
    return HttpResponse.json({
      success: true,
      data: {
        id: 'wallet-mock-me-1',
        userId: '00000000-0000-0000-0000-000000000001',
        balance: '1250000',
        availableBalance: '1250000',
        heldBalance: '0',
        currency: 'VND',
        status: 'ACTIVE',
        dailyLimit: '20000000',
        dailyUsed: '300000',
        monthlyLimit: '100000000',
        monthlyUsed: '1500000'
      }
    })
  }),

  http.get('*/api/wallets/me/ledger', () => {
    return HttpResponse.json({
      success: true,
      data: {
        items: [
          {
            id: 'ledg-mock-1',
            walletId: 'wallet-mock-me-1',
            amount: '50000',
            balanceAfter: '1250000',
            direction: 'CREDIT',
            type: 'TOPUP',
            referenceId: 'REF-TOPUP-001',
            note: 'Nạp tiền vào ví',
            createdAt: '2026-03-30T10:00:00Z',
            updatedAt: '2026-03-30T10:00:00Z'
          }
        ],
        nextCursor: null
      }
    })
  }),

  // 5. Transfer P2P với các ca lỗi quy định trong Prompt 0
  http.post('*/api/payments/transfer', async ({ request }) => {
    const idempotencyKey = request.headers.get('Idempotency-Key')
    const body = (await request.json().catch(() => ({}))) as { amount?: string; recipient?: string }

    if (!idempotencyKey) {
      return HttpResponse.json(
        {
          success: false,
          error: { code: 'IDEMPOTENCY_KEY_REQUIRED', message: 'Thiếu header Idempotency-Key.' }
        },
        { status: 400 }
      )
    }

    if (idempotencyKey === 'mock-key-reused') {
      return HttpResponse.json(
        {
          success: false,
          error: { code: 'IDEMPOTENCY_KEY_REUSED', message: 'Yêu cầu giao dịch đang xử lý hoặc đã gửi cùng mã.' }
        },
        { status: 409 }
      )
    }

    if (body.amount === '999999999') {
      return HttpResponse.json(
        {
          success: false,
          error: { code: 'INSUFFICIENT_FUNDS', message: 'Số dư khả dụng trong ví không đủ.' }
        },
        { status: 400 }
      )
    }

    if (body.amount === '50000000') {
      return HttpResponse.json(
        {
          success: false,
          error: { code: 'LIMIT_EXCEEDED', message: 'Giao dịch vượt quá hạn mức cho phép theo cấp KYC.' }
        },
        { status: 400 }
      )
    }

    return HttpResponse.json({
      success: true,
      data: {
        transactionId: 'TXN_' + Math.random().toString(36).substring(2, 9).toUpperCase(),
        amount: body.amount,
        recipient: body.recipient,
        status: 'SUCCESS',
        createdAt: new Date().toISOString()
      }
    })
  }),

  // 6. K18 P2P Checkout
  http.post('*/api/payments/p2p/checkout', async ({ request }) => {
    const idempotencyKey = request.headers.get('Idempotency-Key')
    const body = (await request.json().catch(() => ({}))) as {
      destinationUserId?: string
      amount?: string
      note?: string
    }

    if (!idempotencyKey) {
      return HttpResponse.json(
        {
          success: false,
          error: { code: 'IDEMPOTENCY_KEY_REQUIRED', message: 'Thiếu header Idempotency-Key.' }
        },
        { status: 400 }
      )
    }

    if (body.amount === '600000') {
      return HttpResponse.json(
        {
          success: false,
          error: {
            code: 'LIMIT_EXCEEDED',
            message: 'Vượt hạn mức giao dịch',
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
    }

    if (body.amount === '999999999') {
      return HttpResponse.json(
        {
          success: false,
          error: { code: 'INSUFFICIENT_FUNDS', message: 'Số dư khả dụng trong ví không đủ.' }
        },
        { status: 422 }
      )
    }

    return HttpResponse.json(
      {
        success: true,
        data: {
          paymentId: 'pay_mock_' + (idempotencyKey ? idempotencyKey.slice(0, 8) : 'test'),
          id: 'pay_mock_' + (idempotencyKey ? idempotencyKey.slice(0, 8) : 'test'),
          status: 'PENDING',
          holdExpiresAt: new Date(Date.now() + 300 * 1000).toISOString(),
          replayed: idempotencyKey === 'mock-key-replayed'
        }
      },
      { status: 201 }
    )
  }),

  // 7. K18 Payment Confirm
  http.post('*/api/payments/:id/confirm', async ({ request, params }) => {
    const token = request.headers.get('X-Transaction-Token')
    if (!token) {
      return HttpResponse.json(
        {
          success: false,
          error: { code: 'TXN_TOKEN_MISSING', message: 'Thiếu mã xác thực giao dịch.' }
        },
        { status: 401 }
      )
    }

    if (token === 'txn_token_expired') {
      return HttpResponse.json(
        {
          success: false,
          error: { code: 'TXN_TOKEN_EXPIRED', message: 'Mã xác thực giao dịch đã hết hạn.' }
        },
        { status: 401 }
      )
    }

    return HttpResponse.json({
      success: true,
      data: {
        id: params.id,
        status: 'SUCCESS'
      }
    })
  }),

  // 8. K18 Get Payment By ID
  http.get('*/api/payments/:id', ({ params }) => {
    return HttpResponse.json({
      success: true,
      data: {
        id: params.id,
        amount: '50000',
        status: 'SUCCESS',
        createdAt: new Date().toISOString()
      }
    })
  })
]
