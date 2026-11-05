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

  // 3. Auth Verify PIN
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

  // 4. Wallet Balance
  http.get('*/api/wallets/:userId/balance', ({ params }) => {
    return HttpResponse.json({
      success: true,
      data: {
        userId: params.userId,
        balance: '1250000',
        currency: 'VND',
        dailyLimit: '20000000',
        dailyUsed: '300000'
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
  })
]
