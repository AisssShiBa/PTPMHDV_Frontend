import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { CashOutWorkspace, fundingApi, FundingError } from '@/features/funding'
import { useAuthStore, MOCK_USER } from '@/features/auth/stores/useAuthStore'
const owner = '10000000-0000-4000-8000-000000000001'
const id = '20000000-0000-4000-8000-000000000001'
const row = {
  id,
  userId: owner,
  amount: '100000',
  destination: 'SYNTHETIC',
  status: 'REQUESTED' as const,
  failureReason: null,
  createdAt: '2026-11-12T00:00:00Z',
  updatedAt: '2026-11-12T00:00:00Z',
}
let client: QueryClient
let posts: string[]
let status: string
let balance: string
let readError: boolean
beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  posts = []
  status = 'REQUESTED'
  balance = '500000'
  readError = false
  useAuthStore.setState({
    user: { ...MOCK_USER, id: owner },
    accessToken: 'synthetic',
    initialized: true,
  })
  server.use(
    http.get('*/wallets/me', () =>
      HttpResponse.json({ success: true, data: { availableBalance: balance } }),
    ),
    http.post('*/funding/cash-out', async ({ request }) => {
      posts.push(request.headers.get('Idempotency-Key')!)
      expect(await request.json()).toMatchObject({ amount: '100000' })
      return HttpResponse.json({ success: true, data: row }, { status: 201 })
    }),
    http.get('*/funding/cash-out/:id', () =>
      readError
        ? HttpResponse.json({ error: { code: 'HTTP_503' } }, { status: 503 })
        : HttpResponse.json({ success: true, data: { ...row, status } }),
    ),
    http.post('*/auth/pin/verify', async ({ request }) => {
      expect(await request.json()).toEqual({
        pin: '111111',
        paymentId: id,
        amount: '100000',
      })
      return HttpResponse.json({
        success: true,
        data: { transactionToken: 'synthetic-once', expiresIn: 60 },
      })
    }),
    http.post('*/funding/cash-out/:id/confirm', ({ request }) => {
      expect(request.headers.get('X-Transaction-Token')).toBe('synthetic-once')
      status = 'SUCCEEDED'
      balance = '400000'
      return HttpResponse.json({ success: true, data: { ...row, status } })
    }),
  )
})
afterEach(() => {
  cleanup()
  client.clear()
  vi.restoreAllMocks()
  useAuthStore.getState().clearState()
})
const view = (path = '/app/withdraw') =>
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <CashOutWorkspace />
      </MemoryRouter>
    </QueryClientProvider>,
  )
async function create() {
  fireEvent.click(screen.getByRole('button', { name: 'Tạo lệnh rút mô phỏng' }))
  await screen.findByRole('button', { name: 'Xác nhận bằng PIN' })
}
async function pin() {
  fireEvent.click(screen.getByRole('button', { name: 'Xác nhận bằng PIN' }))
  for (let i = 0; i < 6; i++)
    fireEvent.click(screen.getByRole('button', { name: /^1$/ }))
}
describe('Cashout UI contract (MSW, no live bank)', () => {
  it('rejects decimal/zero inputs without creating an order', async () => {
    const api = vi.spyOn(fundingApi, 'createCashOut')
    view()
    fireEvent.change(screen.getByLabelText('Số tiền rút (VND)'), {
      target: { value: '0' },
    })
    fireEvent.click(
      screen.getByRole('button', { name: 'Tạo lệnh rút mô phỏng' }),
    )
    await screen.findByText('Số tiền rút phải lớn hơn 0.')
    expect(api).not.toHaveBeenCalled()
  })
  it('creates only once for two submits and never treats REQUESTED as paid', async () => {
    const confirm = vi.spyOn(fundingApi, 'confirmCashOut')
    view()
    const form = screen.getByLabelText('Số tiền rút (VND)').closest('form')!
    fireEvent.submit(form)
    fireEvent.submit(form)
    await screen.findByText('Lệnh đã tạo, chưa xác nhận rút tiền')
    expect(posts).toHaveLength(1)
    expect(
      screen.queryByText('Rút tiền mô phỏng thành công'),
    ).not.toBeInTheDocument()
    expect(confirm).not.toHaveBeenCalled()
  })
  it('binds PIN to server order and amount, confirms once and only prints after server SUCCEEDED', async () => {
    const confirm = vi.spyOn(fundingApi, 'confirmCashOut')
    const storage = vi.spyOn(Storage.prototype, 'setItem')
    view()
    await create()
    expect(
      screen.queryByRole('button', { name: 'In biên lai mô phỏng' }),
    ).not.toBeInTheDocument()
    await pin()
    await screen.findByText('Rút tiền mô phỏng thành công')
    await screen.findByRole('button', { name: 'In biên lai mô phỏng' })
    expect(confirm).toHaveBeenCalledTimes(1)
    expect(storage).not.toHaveBeenCalled()
    expect(client.getMutationCache().getAll()).toHaveLength(0)
    expect(
      JSON.stringify(
        client
          .getQueryCache()
          .getAll()
          .map((q) => q.state.data),
      ),
    ).not.toContain('synthetic-once')
    expect(useAuthStore.getState().user?.balance).toBe(MOCK_USER.balance)
  })
  it('keeps payout UNKNOWN pending and reads status instead of replaying token', async () => {
    server.use(
      http.post('*/funding/cash-out/:id/confirm', () => {
        status = 'PAYOUT_PENDING'
        return HttpResponse.json(
          {
            error: {
              code: 'CASHOUT_PAYOUT_PENDING',
              message: 'private detail',
            },
          },
          { status: 503 },
        )
      }),
    )
    const confirm = vi.spyOn(fundingApi, 'confirmCashOut')
    view()
    await create()
    await pin()
    await screen.findByText('Ngân hàng đang đối soát, chưa rõ kết quả')
    expect(
      screen.queryByRole('button', { name: 'Xác nhận bằng PIN' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'In biên lai mô phỏng' }),
    ).not.toBeInTheDocument()
    status = 'SUCCEEDED'
    balance = '400000'
    fireEvent.click(
      screen.getByRole('button', { name: 'Kiểm tra lại trạng thái' }),
    )
    await screen.findByText('Rút tiền mô phỏng thành công')
    expect(confirm).toHaveBeenCalledTimes(1)
  })
  it('allows fresh PIN only after explicit token expiry and REQUESTED GET', async () => {
    let verifies = 0
    server.use(
      http.post('*/auth/pin/verify', async ({ request }) => {
        expect(await request.json()).toEqual({ pin: '111111', paymentId: id, amount: row.amount })
        verifies++
        return HttpResponse.json({ success: true, data: { transactionToken: 'fresh-pin-' + verifies, expiresIn: 60 } })
      }),
      http.post('*/funding/cash-out/:id/confirm', ({ request }) => {
        expect(request.headers.get('X-Transaction-Token')).toBe('fresh-pin-2')
        status = 'SUCCEEDED'
        return HttpResponse.json({ success: true, data: { ...row, status } })
      })
    )
    const confirm = vi
      .spyOn(fundingApi, 'confirmCashOut')
      .mockRejectedValueOnce(new FundingError('TRANSACTION_TOKEN_EXPIRED'))
    view()
    await create()
    await pin()
    await screen.findByRole('alert')
    await screen.findByRole('button', { name: 'Xác nhận bằng PIN' })
    await pin()
    await screen.findByText('Rút tiền mô phỏng thành công')
    expect(confirm).toHaveBeenCalledTimes(2)
    expect(confirm.mock.calls).toEqual([[id, 'fresh-pin-1'], [id, 'fresh-pin-2']])
    expect(verifies).toBe(2)
    expect(posts).toHaveLength(1)
  })
  it.each(['TXN_TOKEN_REUSED', 'TXN_TOKEN_MISMATCH'])(
    'does not unlock a second confirm for %s',
    async (code) => {
      vi.spyOn(fundingApi, 'confirmCashOut').mockRejectedValue(
        new FundingError(code),
      )
      view()
      await create()
      await pin()
      await screen.findByRole('alert')
      await waitFor(() =>
        expect(
          screen.queryByRole('button', { name: 'Xác nhận bằng PIN' }),
        ).not.toBeInTheDocument(),
      )
      expect(posts).toHaveLength(1)
    },
  )
  it('retries unknown create with the same key and immutable payload', async () => {
    const keys: string[] = []
    server.use(
      http.post('*/funding/cash-out', ({ request }) => {
        keys.push(request.headers.get('Idempotency-Key')!)
        return keys.length === 1
          ? HttpResponse.error()
          : HttpResponse.json({ success: true, data: row })
      }),
    )
    view()
    fireEvent.click(
      screen.getByRole('button', { name: 'Tạo lệnh rút mô phỏng' }),
    )
    await screen.findByRole('button', { name: 'Thử lại cùng yêu cầu' })
    expect(screen.getByLabelText('Số tiền rút (VND)')).toBeDisabled()
    fireEvent.click(
      screen.getByRole('button', { name: 'Thử lại cùng yêu cầu' }),
    )
    await screen.findByRole('button', { name: 'Xác nhận bằng PIN' })
    expect(keys).toHaveLength(2)
    expect(keys[0]).toBe(keys[1])
  })
  it('closing PIN only closes the UI and does not cancel the server order', async () => {
    const confirm = vi.spyOn(fundingApi, 'confirmCashOut')
    view()
    await create()
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận bằng PIN' }))
    fireEvent.click(screen.getByRole('button', { name: 'Đóng xác thực' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Xác nhận bằng PIN' }),
    ).toBeEnabled()
    expect(
      screen.getByText('Lệnh đã tạo, chưa xác nhận rút tiền'),
    ).toBeInTheDocument()
    expect(confirm).not.toHaveBeenCalled()
    expect(posts).toHaveLength(1)
  })
  it('invalid PIN never reaches confirm and clears entered digits', async () => {
    const confirm = vi.spyOn(fundingApi, 'confirmCashOut')
    server.use(
      http.post('*/auth/pin/verify', () =>
        HttpResponse.json(
          { error: { code: 'INVALID_PIN', message: 'private detail' } },
          { status: 400 },
        ),
      ),
      http.get('*/auth/pin/status', () =>
        HttpResponse.json({
          success: true,
          data: { hasPin: true, isLocked: false, lockedUntil: null },
        }),
      ),
    )
    view()
    await create()
    await pin()
    await screen.findByText('Mã PIN không đúng. Vui lòng nhập lại.')
    expect(screen.getByLabelText('Chữ số PIN 1')).toHaveValue('')
    expect(confirm).not.toHaveBeenCalled()
  })
  it('honors the server PIN lock deadline and never sends a confirmation', async () => {
    const confirm = vi.spyOn(fundingApi, 'confirmCashOut')
    server.use(
      http.post('*/auth/pin/verify', () =>
        HttpResponse.json({ error: { code: 'PIN_LOCKED' } }, { status: 423 }),
      ),
      http.get('*/auth/pin/status', () =>
        HttpResponse.json({
          success: true,
          data: {
            hasPin: true,
            isLocked: true,
            lockedUntil: new Date(Date.now() + 1800000).toISOString(),
          },
        }),
      ),
    )
    view()
    await create()
    await pin()
    await screen.findByText('Tài khoản tạm khóa giao dịch')
    expect(confirm).not.toHaveBeenCalled()
    expect(screen.getByText(/Vui lòng thử lại sau:/)).toHaveTextContent(
      /29:5[0-9]|30:00/,
    )
  })
  it('displays deterministic failure safely and does not claim money was refunded locally', async () => {
    server.use(
      http.post('*/funding/cash-out/:id/confirm', () => {
        status = 'FAILED'
        return HttpResponse.json(
          { error: { code: 'CASHOUT_FAILED' } },
          { status: 409 },
        )
      }),
    )
    view()
    await create()
    await pin()
    await screen.findByText('Lệnh rút không thành công')
    expect(
      screen.queryByRole('button', { name: 'In biên lai mô phỏng' }),
    ).not.toBeInTheDocument()
    expect(useAuthStore.getState().user?.balance).toBe(MOCK_USER.balance)
  })
  it('recovers an ID after reload read-only; no create, PIN or auto-confirm', async () => {
    const create = vi.spyOn(fundingApi, 'createCashOut')
    const confirm = vi.spyOn(fundingApi, 'confirmCashOut')
    view('/app/withdraw?cashOutId=' + id)
    await screen.findByText('Lệnh đã tạo, chưa xác nhận rút tiền')
    expect(
      screen.queryByRole('button', { name: 'Xác nhận bằng PIN' }),
    ).not.toBeInTheDocument()
    expect(create).not.toHaveBeenCalled()
    expect(confirm).not.toHaveBeenCalled()
  })
  it('rejects foreign owner data even when an API incorrectly returns 200', async () => {
    server.use(
      http.get('*/funding/cash-out/:id', () =>
        HttpResponse.json({
          success: true,
          data: { ...row, userId: id, status: 'SUCCEEDED' },
        }),
      ),
    )
    view('/app/withdraw?cashOutId=' + id)
    await screen.findAllByRole('alert')
    expect(
      screen.queryByText('Rút tiền mô phỏng thành công'),
    ).not.toBeInTheDocument()
  })
  it('clears the PIN modal and old order when the account changes', async () => {
    view()
    await create()
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận bằng PIN' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    act(() => {
      useAuthStore.setState({ user: { ...MOCK_USER, id } })
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Xác nhận bằng PIN' }),
    ).not.toBeInTheDocument()
  })
})
