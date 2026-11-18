import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor
} from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { useAuthStore, MOCK_USER } from '@/features/auth/stores/useAuthStore'
import {
  UtilitiesWorkspace,
  orderPollInterval,
  useUtilityOrder,
  utilitiesApi
} from '@/features/utilities'
import { OrderStatusPanel } from '@/features/utilities/components/OrderStatusPanel'
import type { UtilityOrderView } from '@/features/utilities'

const WALLET = '*/api/wallets/me'
const TOPUP = '*/api/utilities/topup'
const BILLS_PAY = '*/api/utilities/bills/pay'
const BILLS_LOOKUP = '*/api/utilities/bills/lookup'
const ORDER = '*/api/utilities/orders/:id'
const VERIFY_PIN = '*/api/auth/pin/verify'
const CONFIRM = '*/api/payments/:id/confirm'

const PAYMENT_ID = 'pay-utilities-1'
const ORDER_ID = 'order-utilities-1'

const orderView = (overrides: Partial<UtilityOrderView> = {}): UtilityOrderView => ({
  orderId: ORDER_ID,
  type: 'TELCO_TOPUP',
  status: 'PENDING_PAYMENT',
  amount: '200000',
  discountAmount: '6000',
  target: '0987654321',
  providerCode: null,
  providerRef: null,
  paymentId: PAYMENT_ID,
  failureReason: null,
  createdAt: '2026-11-17T08:00:00.000Z',
  updatedAt: '2026-11-17T08:00:00.000Z',
  ...overrides
})

const ok = (data: unknown, status = 200) =>
  HttpResponse.json({ success: true, data }, { status })

const failure = (status: number, code: string) =>
  HttpResponse.json(
    { success: false, error: { code, message: 'raw backend english' } },
    { status }
  )

const wallet = (availableBalance: string) =>
  ok({ id: 'wallet-1', userId: MOCK_USER.id, availableBalance, balance: availableBalance })

let client: QueryClient

beforeEach(() => {
  client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  })
  useAuthStore.setState({
    user: { ...MOCK_USER, id: MOCK_USER.id },
    accessToken: 'synthetic-access-token',
    initialized: true
  })
})

afterEach(() => {
  cleanup()
  client.clear()
  vi.useRealTimers()
  vi.restoreAllMocks()
  useAuthStore.getState().clearState()
})

async function view() {
  const rendered = render(
    <QueryClientProvider client={client}>
      <UtilitiesWorkspace />
    </QueryClientProvider>
  )
  // Wait for the wallet query, otherwise the workspace is still a skeleton.
  await screen.findByRole('button', { name: /Thanh toán ngay/ })
  return rendered
}

function pin(token = 'txn-token-1', expiresIn = 60) {
  server.use(http.post(VERIFY_PIN, () => ok({ transactionToken: token, expiresIn })))
}

async function startTopup() {
  fireEvent.change(screen.getByLabelText('Số điện thoại người nhận'), {
    target: { value: '0987654321' }
  })
  fireEvent.click(screen.getByRole('button', { name: /Thanh toán ngay/ }))
  await screen.findByText('Xác thực mã PIN thanh toán')
}

function typePin() {
  for (const digit of ['1', '2', '3', '4', '5', '6']) {
    fireEvent.click(screen.getByRole('button', { name: digit }))
  }
}

describe('utilities checkout -> PIN -> confirm', () => {
  it('binds PIN to the server order and leaks the token only in the confirm header', async () => {
    const checkoutKeys: string[] = []
    let verifyBody: Record<string, unknown> | undefined
    let confirm: { id?: string; token: string | null } | undefined

    server.use(
      http.post(TOPUP, ({ request }) => {
        checkoutKeys.push(request.headers.get('Idempotency-Key') ?? '')
        return ok(orderView(), 201)
      }),
      http.post(VERIFY_PIN, async ({ request }) => {
        verifyBody = (await request.json()) as Record<string, unknown>
        return ok({ transactionToken: 'txn-token-1', expiresIn: 60 })
      }),
      http.post(CONFIRM, ({ request, params }) => {
        confirm = { id: String(params.id), token: request.headers.get('X-Transaction-Token') }
        return ok({ id: params.id, status: 'SUCCESS' })
      }),
      http.get(ORDER, () => ok(orderView({ status: 'SUCCESS' })))
    )

    await view()
    await startTopup()

    // Amount comes from the order (200.000), not from the 100.000 form default.
    expect(
      screen.getByText(/Xác nhận thanh toán 200\.000 ₫ cho số 0987654321/)
    ).toBeInTheDocument()
    expect(checkoutKeys).toHaveLength(1)

    typePin()

    await waitFor(() => expect(confirm).toBeDefined())
    expect(verifyBody).toMatchObject({
      pin: '123456',
      paymentId: PAYMENT_ID,
      amount: '200000'
    })
    expect(confirm).toEqual({ id: PAYMENT_ID, token: 'txn-token-1' })
    expect(await screen.findByRole('heading', { name: 'Giao dịch thành công' })).toBeInTheDocument()

    const token = 'txn-token-1'
    expect(JSON.stringify({ ...localStorage })).not.toContain(token)
    expect(JSON.stringify({ ...sessionStorage })).not.toContain(token)
    expect(JSON.stringify(client.getQueryCache().getAll().map((q) => q.state.data))).not.toContain(
      token
    )
    expect(JSON.stringify(useAuthStore.getState())).not.toContain(token)
  })

  it('creates only one order when the pay button is double-clicked', async () => {
    let posts = 0
    server.use(
      http.post(TOPUP, async () => {
        posts++
        await new Promise((resolve) => setTimeout(resolve, 30))
        return ok(orderView(), 201)
      })
    )

    await view()
    fireEvent.change(screen.getByLabelText('Số điện thoại người nhận'), {
      target: { value: '0987654321' }
    })
    const pay = screen.getByRole('button', { name: /Thanh toán ngay/ })
    fireEvent.click(pay)
    fireEvent.click(pay)

    await waitFor(() => expect(posts).toBe(1))
    await screen.findByText('Xác thực mã PIN thanh toán')
    expect(posts).toBe(1)
  })

  it('retries an unknown checkout outcome with the same Idempotency-Key', async () => {
    const keys: string[] = []
    server.use(
      http.post(TOPUP, ({ request }) => {
        keys.push(request.headers.get('Idempotency-Key') ?? '')
        if (keys.length === 1) return failure(502, 'UPSTREAM_UNAVAILABLE')
        return ok(orderView(), 201)
      })
    )

    await view()
    fireEvent.change(screen.getByLabelText('Số điện thoại người nhận'), {
      target: { value: '0987654321' }
    })
    fireEvent.click(screen.getByRole('button', { name: /Thanh toán ngay/ }))

    await screen.findByText(/Yêu cầu đang được xử lý/)
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))

    await screen.findByText('Xác thực mã PIN thanh toán')
    expect(keys).toHaveLength(2)
    expect(keys[1]).toBe(keys[0])
    expect(keys[0]).toMatch(/[0-9a-f-]{32,}/)
  })
})

describe('order tracking', () => {
  it('shows PENDING_PAYMENT -> PAID -> PROVIDER_PENDING -> SUCCESS and refreshes the wallet', async () => {
    const statuses: UtilityOrderView['status'][] = [
      'PENDING_PAYMENT',
      'PAID',
      'PROVIDER_PENDING',
      'SUCCESS'
    ]
    let reads = 0
    let walletReads = 0

    pin()
    server.use(
      http.post(TOPUP, () => ok(orderView(), 201)),
      http.post(CONFIRM, ({ params }) => ok({ id: params.id, status: 'SUCCESS' })),
      http.get(ORDER, () => {
        const status = statuses[Math.min(reads, statuses.length - 1)]
        reads++
        return ok(orderView({ status }))
      }),
      http.get(WALLET, () => {
        walletReads++
        return wallet('1250000')
      })
    )

    await view()
    await startTopup()
    typePin()

    await screen.findByText('Chờ thanh toán')
    await screen.findByText('Đã thanh toán, chờ xử lý', undefined, { timeout: 6000 })
    await screen.findByText('Đang xử lý với nhà cung cấp', undefined, { timeout: 6000 })
    await screen.findByRole('heading', { name: 'Giao dịch thành công' }, { timeout: 6000 })

    // Wallet refreshed after confirm and on each server-side status change.
    expect(walletReads).toBeGreaterThanOrEqual(3)
  }, 20000)

  it('shows REFUNDED with the wallet balance returned by the server', async () => {
    const statuses: UtilityOrderView['status'][] = ['REFUND_REQUESTED', 'REFUNDED']
    let reads = 0
    let walletReads = 0

    pin()
    server.use(
      http.post(TOPUP, () => ok(orderView(), 201)),
      http.post(CONFIRM, ({ params }) => ok({ id: params.id, status: 'SUCCESS' })),
      http.get(ORDER, () => {
        const status = statuses[Math.min(reads, statuses.length - 1)]
        reads++
        return ok(orderView({ status }))
      }),
      http.get(WALLET, () => {
        walletReads++
        return wallet(walletReads === 1 ? '1000000' : '1100000')
      })
    )

    await view()
    await startTopup()
    typePin()

    await screen.findByRole('heading', { name: 'Đang hoàn tiền' })
    await screen.findByRole('heading', { name: 'Đã hoàn tiền' }, { timeout: 6000 })
    expect(await screen.findByText('1.100.000 ₫')).toBeInTheDocument()
  }, 20000)

  it('slows polling after 60s in PROVIDER_PENDING and resumes when the status leaves it', async () => {
    vi.useFakeTimers()
    const read = vi
      .spyOn(utilitiesApi, 'getOrder')
      .mockResolvedValue(orderView({ status: 'PROVIDER_PENDING' }))
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    )

    const { result } = renderHook(() => useUtilityOrder(ORDER_ID), { wrapper })

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(result.current.data?.status).toBe('PROVIDER_PENDING')
    expect(result.current.slowPolling).toBe(false)

    await act(async () => {
      for (let elapsed = 0; elapsed < 60_000; elapsed += 2000) {
        await vi.advanceTimersByTimeAsync(2000)
      }
    })

    expect(result.current.slowPolling).toBe(true)
    expect(orderPollInterval('PROVIDER_PENDING', Date.now() - 60_000, Date.now())).toBe(10_000)

    read.mockResolvedValue(orderView({ status: 'SUCCESS' }))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000)
    })

    expect(result.current.data?.status).toBe('SUCCESS')
    expect(result.current.slowPolling).toBe(false)
    expect(orderPollInterval('PROVIDER_PENDING', Date.now(), Date.now())).toBe(2000)
  })

  it('explains a stuck provider without promising a refund', () => {
    const { rerender } = render(
      <OrderStatusPanel order={orderView({ status: 'PROVIDER_PENDING' })} onReset={() => {}} slowPolling />
    )
    expect(screen.getByRole('status')).toHaveTextContent('Nhà cung cấp chưa phản hồi')
    expect(screen.getByRole('status')).toHaveTextContent(ORDER_ID)
    expect(screen.getByRole('status')).not.toHaveTextContent('hoàn tiền')

    rerender(
      <OrderStatusPanel order={orderView({ status: 'PROVIDER_PENDING' })} onReset={() => {}} />
    )
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})

describe('confirm failures never reopen PIN by default', () => {
  async function confirmFails(status: number, code: string) {
    pin()
    server.use(
      http.post(TOPUP, () => ok(orderView(), 201)),
      http.post(CONFIRM, () => failure(status, code)),
      http.get(ORDER, () => ok(orderView({ status: 'PENDING_PAYMENT' })))
    )
    await view()
    await startTopup()
    typePin()
    await waitFor(() =>
      expect(screen.queryByText('Xác thực mã PIN thanh toán')).not.toBeInTheDocument()
    )
  }

  it('treats 410 PAYMENT_EXPIRED as finished and only watches the order', async () => {
    await confirmFails(410, 'PAYMENT_EXPIRED')
    expect(screen.queryByRole('button', { name: 'Xác thực lại' })).not.toBeInTheDocument()
    expect(await screen.findByText(/Đơn đã hết hạn thanh toán/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Thực hiện giao dịch khác' })).toBeInTheDocument()
  })

  it('treats 409 PAYMENT_ALREADY_CONFIRMED as processing, not as a PIN problem', async () => {
    await confirmFails(409, 'PAYMENT_ALREADY_CONFIRMED')
    expect(screen.queryByRole('button', { name: 'Xác thực lại' })).not.toBeInTheDocument()
    expect(await screen.findByText(/đang được xử lý/)).toBeInTheDocument()
  })

  it.each([
    { status: 403, code: 'FORBIDDEN' },
    { status: 409, code: 'CONFLICT' }
  ])('shows a Vietnamese message for $status $code without a reauth button', async ({ status, code }) => {
    await confirmFails(status, code)
    expect(screen.queryByRole('button', { name: 'Xác thực lại' })).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).not.toHaveTextContent('raw backend english')
  })

  it('offers reauth only when the transaction token itself is unusable', async () => {
    // Keep the axios 401 interceptor from trying to refresh a synthetic session.
    useAuthStore.setState({ accessToken: null })
    await confirmFails(401, 'TXN_TOKEN_EXPIRED')
    const reauth = screen.getByRole('button', { name: 'Xác thực lại' })
    fireEvent.click(reauth)
    expect(await screen.findByText('Xác thực mã PIN thanh toán')).toBeInTheDocument()
    expect(
      screen.getByText(/Xác nhận thanh toán 200\.000 ₫ cho số 0987654321/)
    ).toBeInTheDocument()
  })
})

describe('bill payment', () => {
  it('sends the amount returned by the lookup, never a typed amount', async () => {
    let payBody: Record<string, unknown> | undefined
    server.use(
      http.get(BILLS_LOOKUP, () =>
        ok({
          provider: 'EVN',
          customerCode: 'PE0100028491',
          customerName: 'Khách hàng 8491',
          amount: '101000',
          period: '2026-10'
        })
      ),
      http.post(BILLS_PAY, async ({ request }) => {
        payBody = (await request.json()) as Record<string, unknown>
        return ok(orderView({ type: 'BILL_PAY', amount: '101000', target: 'PE0100028491' }), 201)
      })
    )

    await view()
    fireEvent.click(screen.getByRole('button', { name: 'Thanh toán hóa đơn sinh hoạt' }))
    fireEvent.change(screen.getByLabelText('Mã khách hàng / Mã danh bộ'), {
      target: { value: 'PE0100028491' }
    })
    fireEvent.click(screen.getByRole('button', { name: 'Tra cứu' }))
    await screen.findByText('Đã tìm thấy hóa đơn')

    fireEvent.click(screen.getByRole('button', { name: /Thanh toán ngay/ }))
    await waitFor(() => expect(payBody).toEqual({
      provider: 'EVN',
      customerCode: 'PE0100028491',
      amount: '101000'
    }))
    expect(await screen.findByText('Xác thực mã PIN thanh toán')).toBeInTheDocument()
  })

  it.each([
    { status: 422, code: 'BILL_NOT_FOUND', text: /Không tìm thấy hóa đơn/ },
    { status: 504, code: 'GATEWAY_TIMEOUT', text: /Cổng thanh toán không phản hồi/ }
  ])('shows a Vietnamese lookup error for $status $code', async ({ status, code, text }) => {
    server.use(http.get(BILLS_LOOKUP, () => failure(status, code)))

    await view()
    fireEvent.click(screen.getByRole('button', { name: 'Thanh toán hóa đơn sinh hoạt' }))
    fireEvent.change(screen.getByLabelText('Mã khách hàng / Mã danh bộ'), {
      target: { value: 'PE0100028491' }
    })
    fireEvent.click(screen.getByRole('button', { name: 'Tra cứu' }))

    expect(await screen.findByText(text)).toBeInTheDocument()
    expect(screen.getByText(text)).not.toHaveTextContent('raw backend english')
  })
})
