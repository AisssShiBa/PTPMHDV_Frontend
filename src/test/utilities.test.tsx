import { useAuthStore, MOCK_USER } from '@/features/auth/stores/useAuthStore'
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { UtilitiesWorkspace } from '@/features/utilities'
import type { UtilityOrderView } from '@/features/utilities'
import { formatVnd } from '@/lib/format'

beforeEach(() => { useAuthStore.setState({ user: MOCK_USER, accessToken: 'synthetic', initialized: true }) })

const wallet = {
  id: 'wallet-utilities-1',
  userId: '00000000-0000-4000-8000-000000000001',
  balance: '1250000',
  availableBalance: '1250000',
  heldBalance: '0',
  status: 'ACTIVE'
}

const orderView = (overrides: Partial<UtilityOrderView> = {}): UtilityOrderView => ({
  orderId: '11111111-1111-4111-8111-111111111111',
  type: 'TELCO_TOPUP',
  status: 'PENDING_PAYMENT',
  amount: '100000',
  discountAmount: '3000',
  target: '0987654321',
  providerCode: null,
  providerRef: null,
  paymentId: 'pay-utilities-1',
  failureReason: null,
  createdAt: '2026-11-12T08:00:00.000Z',
  updatedAt: '2026-11-12T08:00:00.000Z',
  ...overrides
})

const walletHandler = (data: unknown = wallet) =>
  http.get('*/api/wallets/me', () => HttpResponse.json({ success: true, data }))

const apiError = (status: number, code: string, message = 'raw english message') =>
  HttpResponse.json({ success: false, error: { code, message } }, { status })

function renderWorkspace() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  })
  const view = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <UtilitiesWorkspace />
      </MemoryRouter>
    </QueryClientProvider>
  )
  return { ...view, queryClient }
}

const enterPin = () => {
  const buttons = screen.getAllByRole('button')
  for (const digit of ['1', '2', '3', '4', '5', '6']) {
    const button = buttons.find((item) => item.textContent?.trim() === digit)
    if (!button) throw new Error(`Không tìm thấy phím ${digit}`)
    fireEvent.click(button)
  }
}

const selectTopup = (phone: string, denomination = '100000') => {
  fireEvent.change(screen.getByLabelText(/Số điện thoại người nhận/), {
    target: { value: phone }
  })
  const amountLabel = formatVnd(denomination)
  const amountButton = screen
    .getAllByRole('button')
    .find(
      (button) =>
        button.textContent?.includes('Ưu đãi') &&
        button.textContent?.includes(amountLabel)
    )
  if (!amountButton) throw new Error(`Không tìm thấy mệnh giá ${denomination}`)
  fireEvent.click(amountButton)
}

describe('Utilities page states [N16]', () => {
  it('hiển thị đủ loading, lỗi, rỗng và thành công', async () => {
    server.use(
      http.get('*/api/wallets/me', async () => {
        await new Promise((resolve) => setTimeout(resolve, 80))
        return HttpResponse.json({ success: true, data: wallet })
      })
    )
    const loadingView = renderWorkspace()
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByText(/Đang tải thông tin ví/)).toBeInTheDocument()
    loadingView.unmount()

    server.use(http.get('*/api/wallets/me', () => apiError(500, 'INTERNAL')))
    const errorView = renderWorkspace()
    expect(await screen.findByText('Không thể tải dữ liệu')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Thử lại/ })).toBeInTheDocument()
    errorView.unmount()

    server.use(walletHandler(null))
    const emptyView = renderWorkspace()
    expect(await screen.findByText('Chưa có thông tin ví')).toBeInTheDocument()
    emptyView.unmount()

    server.use(walletHandler())
    renderWorkspace()
    expect(await screen.findByText('Nạp điện thoại di động')).toBeInTheDocument()
    expect(screen.getAllByText(/Mô phỏng/).length).toBeGreaterThan(0)
  })
})

describe('Utilities top-up checkout [N16]', () => {
  it('gửi đúng body/header, xác thực PIN rồi theo dõi đơn đến SUCCESS', async () => {
    const keys: string[] = []
    const bodies: unknown[] = []
    let confirmToken: string | null = null
    let confirmPaymentId: string | null = null
    let orderCalls = 0

    server.use(
      walletHandler(),
      http.post('*/api/utilities/topup', async ({ request }) => {
        keys.push(request.headers.get('Idempotency-Key') ?? '')
        bodies.push(await request.json())
        return HttpResponse.json(
          { success: true, data: orderView({ status: 'PENDING_PAYMENT' }) },
          { status: 201 }
        )
      }),
      http.post('*/api/payments/:id/confirm', ({ request, params }) => {
        confirmToken = request.headers.get('X-Transaction-Token')
        confirmPaymentId = String(params.id)
        return HttpResponse.json({ success: true, data: { status: 'SUCCESS' } })
      }),
      http.get('*/api/utilities/orders/:id', () => {
        orderCalls += 1
        return HttpResponse.json({
          success: true,
          data: orderView({ status: 'SUCCESS', providerRef: 'MOCK-1' })
        })
      })
    )

    renderWorkspace()
    expect(await screen.findByText('Nạp điện thoại di động')).toBeInTheDocument()

    selectTopup('0987654321', '100000')
    fireEvent.click(screen.getByRole('button', { name: /Thanh toán ngay/ }))

    await waitFor(() => expect(keys).toHaveLength(1))
    expect(keys[0]).toBeTruthy()
    expect(bodies[0]).toEqual({ phone: '0987654321', amount: '100000' })

    expect(await screen.findByText('Xác thực mã PIN thanh toán')).toBeInTheDocument()
    enterPin()

    await waitFor(() => expect(confirmToken).toBe('txn_token_verified_valid_60s'))
    expect(confirmPaymentId).toBe('pay-utilities-1')
    await waitFor(() => expect(orderCalls).toBeGreaterThanOrEqual(1))
    expect(await screen.findByText('Giao dịch thành công')).toBeInTheDocument()
    expect(screen.getByText('MOCK-1')).toBeInTheDocument()
  })

  it('timeout khi tạo đơn: bấm Thử lại giữ CÙNG Idempotency-Key', async () => {
    const keys: string[] = []
    let attempts = 0

    server.use(
      walletHandler(),
      http.post('*/api/utilities/topup', ({ request }) => {
        attempts += 1
        keys.push(request.headers.get('Idempotency-Key') ?? '')
        if (attempts === 1) return apiError(502, 'UPSTREAM_UNAVAILABLE')
        return HttpResponse.json(
          { success: true, data: orderView() },
          { status: 201 }
        )
      })
    )

    renderWorkspace()
    expect(await screen.findByText('Nạp điện thoại di động')).toBeInTheDocument()
    selectTopup('0987654321', '100000')
    fireEvent.click(screen.getByRole('button', { name: /Thanh toán ngay/ }))

    expect(
      await screen.findByText(/Yêu cầu đang được xử lý, vui lòng không thực hiện lại/)
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))

    await waitFor(() => expect(keys).toHaveLength(2))
    expect(keys[0]).toBeTruthy()
    expect(keys[0]).toBe(keys[1])
    expect(await screen.findByText('Xác thực mã PIN thanh toán')).toBeInTheDocument()
  })

  it('đổi nội dung form thì sinh Idempotency-Key mới', async () => {
    const keys: string[] = []
    let attempts = 0

    server.use(
      walletHandler(),
      http.post('*/api/utilities/topup', ({ request }) => {
        attempts += 1
        keys.push(request.headers.get('Idempotency-Key') ?? '')
        if (attempts === 1) return apiError(502, 'UPSTREAM_UNAVAILABLE')
        return HttpResponse.json({ success: true, data: orderView() }, { status: 201 })
      })
    )

    renderWorkspace()
    expect(await screen.findByText('Nạp điện thoại di động')).toBeInTheDocument()
    selectTopup('0987654321', '100000')
    fireEvent.click(screen.getByRole('button', { name: /Thanh toán ngay/ }))
    await waitFor(() => expect(keys).toHaveLength(1))

    fireEvent.change(screen.getByLabelText(/Số điện thoại người nhận/), {
      target: { value: '0912345678' }
    })
    fireEvent.click(screen.getByRole('button', { name: /Thanh toán ngay/ }))

    await waitFor(() => expect(keys).toHaveLength(2))
    expect(keys[1]).not.toBe(keys[0])
  })

  it('double-click chỉ gửi một request tạo đơn', async () => {
    let calls = 0
    let release: (() => void) | undefined
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })

    server.use(
      walletHandler(),
      http.post('*/api/utilities/topup', async () => {
        calls += 1
        await gate
        return HttpResponse.json({ success: true, data: orderView() }, { status: 201 })
      })
    )

    renderWorkspace()
    expect(await screen.findByText('Nạp điện thoại di động')).toBeInTheDocument()
    selectTopup('0987654321', '100000')

    const pay = screen.getByRole('button', { name: /Thanh toán ngay/ })
    fireEvent.click(pay)
    fireEvent.click(pay)
    fireEvent.click(pay)

    await new Promise((resolve) => setTimeout(resolve, 40))
    expect(calls).toBe(1)
    release?.()
  })

  it('hiển thị rõ trạng thái REFUNDED và dừng theo dõi ở trạng thái cuối', async () => {
    let orderCalls = 0

    server.use(
      walletHandler(),
      http.post('*/api/utilities/topup', () =>
        HttpResponse.json({ success: true, data: orderView() }, { status: 201 })
      ),
      http.post('*/api/payments/:id/confirm', () =>
        HttpResponse.json({ success: true, data: { status: 'SUCCESS' } })
      ),
      http.get('*/api/utilities/orders/:id', () => {
        orderCalls += 1
        return HttpResponse.json({
          success: true,
          data: orderView({ status: 'REFUNDED', failureReason: 'PROVIDER_FAILED:PROVIDER_REJECTED' })
        })
      })
    )

    renderWorkspace()
    expect(await screen.findByText('Nạp điện thoại di động')).toBeInTheDocument()
    selectTopup('0987654321', '100000')
    fireEvent.click(screen.getByRole('button', { name: /Thanh toán ngay/ }))
    expect(await screen.findByText('Xác thực mã PIN thanh toán')).toBeInTheDocument()
    enterPin()

    expect(await screen.findByText(/FinVault đã hoàn tiền vào ví/)).toBeInTheDocument()
    expect(screen.getAllByText('Đã hoàn tiền').length).toBeGreaterThan(0)
    await waitFor(() => expect(orderCalls).toBe(1))
    await new Promise((resolve) => setTimeout(resolve, 2200))
    expect(orderCalls).toBe(1)
  }, 10_000)
})

describe('Utilities bill payment [N16]', () => {
  it('tra cứu hóa đơn rồi thanh toán đúng amount từ lookup', async () => {
    let lookupParams: { provider: string | null; customerCode: string | null } | undefined
    let billBody: unknown
    let billKey: string | null = null

    server.use(
      walletHandler(),
      http.get('*/api/utilities/bills/lookup', ({ request }) => {
        const url = new URL(request.url)
        lookupParams = {
          provider: url.searchParams.get('provider'),
          customerCode: url.searchParams.get('customerCode')
        }
        return HttpResponse.json({
          success: true,
          data: {
            provider: 'EVN',
            customerCode: 'PE0100028491',
            customerName: 'Khách hàng 8491',
            amount: '101000',
            period: '2026-10',
            amountFormatted: '101.000đ'
          }
        })
      }),
      http.post('*/api/utilities/bills/pay', async ({ request }) => {
        billKey = request.headers.get('Idempotency-Key')
        billBody = await request.json()
        return HttpResponse.json(
          {
            success: true,
            data: orderView({
              type: 'BILL_PAY',
              target: 'PE0100028491',
              providerCode: 'EVN',
              amount: '101000',
              discountAmount: '3030'
            })
          },
          { status: 201 }
        )
      })
    )

    renderWorkspace()
    expect(await screen.findByText('Nạp điện thoại di động')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Thanh toán hóa đơn sinh hoạt/ }))
    expect(screen.getAllByText(/Mô phỏng/).length).toBeGreaterThan(0)

    fireEvent.change(screen.getByLabelText(/Mã khách hàng/), {
      target: { value: 'PE0100028491' }
    })
    fireEvent.click(screen.getByRole('button', { name: /Tra cứu/ }))

    expect(await screen.findByText('Khách hàng 8491')).toBeInTheDocument()
    expect(lookupParams).toEqual({ provider: 'EVN', customerCode: 'PE0100028491' })

    fireEvent.click(screen.getByRole('button', { name: /Thanh toán ngay/ }))
    await waitFor(() => expect(billBody).toBeDefined())
    expect(billKey).toBeTruthy()
    expect(billBody).toEqual({
      provider: 'EVN',
      customerCode: 'PE0100028491',
      amount: '101000'
    })
    expect(await screen.findByText('Xác thực mã PIN thanh toán')).toBeInTheDocument()
  })

  it('lỗi tra cứu BILL_NOT_FOUND hiển thị thông báo tiếng Việt và nút thử lại', async () => {
    server.use(
      walletHandler(),
      http.get('*/api/utilities/bills/lookup', () => apiError(422, 'BILL_NOT_FOUND'))
    )

    renderWorkspace()
    expect(await screen.findByText('Nạp điện thoại di động')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Thanh toán hóa đơn sinh hoạt/ }))
    fireEvent.change(screen.getByLabelText(/Mã khách hàng/), {
      target: { value: 'PE0100028411' }
    })
    fireEvent.click(screen.getByRole('button', { name: /Tra cứu/ }))

    expect(await screen.findByText(/Không tìm thấy hóa đơn/)).toBeInTheDocument()
    expect(screen.queryByText('raw english message')).not.toBeInTheDocument()
  })
})
