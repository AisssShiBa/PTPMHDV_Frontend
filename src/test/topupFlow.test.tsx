import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  act,
} from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import {
  TopupForm,
  TopupStatusPanel,
  fundingApi,
  FundingError,
} from '@/features/funding'
import {
  validateTopupRedirect,
  topupNavigation,
} from '@/features/funding/api/topupRedirect'
import { useAuthStore, MOCK_USER } from '@/features/auth/stores/useAuthStore'
const owner = '10000000-0000-4000-8000-000000000001'
const id = '20000000-0000-4000-8000-000000000001'
const endpoint = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html'
const row = {
  id,
  code: 'NAPABC123',
  amount: '100000.00',
  status: 'PENDING',
  expiresAt: '2020-01-01T00:00:00Z',
}
let client: QueryClient
beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  vi.stubEnv('VITE_USE_MOCK', 'true')
  vi.stubEnv('VITE_VNPAY_PAYMENT_URL', endpoint)
  useAuthStore.setState({
    user: { ...MOCK_USER, id: owner },
    accessToken: 'synthetic',
    initialized: true,
  })
  server.use(
    http.get('*/wallets/:owner/balance', () =>
      HttpResponse.json({
        success: true,
        data: { availableBalance: '200000.00' },
      }),
    ),
  )
})
afterEach(() => {
  cleanup()
  client.clear()
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  useAuthStore.getState().clearState()
})
function view(component: React.ReactNode, path = '/') {
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>{component}</MemoryRouter>
    </QueryClientProvider>,
  )
}
describe('VNPAY exact redirect allowlist', () => {
  it('requires explicit configuration and rejects unsafe origins, credentials, paths and protocols', () => {
    expect(
      validateTopupRedirect(endpoint + '?vnp_SecureHash=synthetic').href,
    ).toBe(endpoint + '?vnp_SecureHash=synthetic')
    for (const url of [
      'javascript:alert(1)',
      'http://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
      endpoint + '#fragment',
      endpoint.replace('sandbox.', 'sandbox.evil.'),
      'https://sandbox.vnpayment.vn.evil.test/paymentv2/vpcpay.html',
      'https://user:pass@sandbox.vnpayment.vn/paymentv2/vpcpay.html',
      'https://sandbox.vnpayment.vn/other',
      '//sandbox.vnpayment.vn/paymentv2/vpcpay.html',
    ])
      expect(() => validateTopupRedirect(url)).toThrow()
    vi.stubEnv('VITE_VNPAY_PAYMENT_URL', '')
    expect(() => validateTopupRedirect(endpoint)).toThrow()
  })
})
describe('Topup create UI (MSW contract only)', () => {
  it('validates custom amount without float coercion and makes no request for invalid input', async () => {
    const create = vi.spyOn(fundingApi, 'createTopup')
    view(<TopupForm />)
    fireEvent.change(screen.getByLabelText('Nhập số tiền nạp (VND)'), {
      target: { value: '1e5' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục tới VNPAY' }))
    await screen.findByText('Nhập số tiền nguyên, tối đa 18 chữ số.')
    expect(create).not.toHaveBeenCalled()
  })
  it('sends string money once for double submit and redirects without storing signed URLs', async () => {
    let release!: () => void
    const pending = new Promise<void>((resolve) => {
      release = resolve
    })
    let posts = 0
    server.use(
      http.post('*/payments/topups', async ({ request }) => {
        posts++
        expect(await request.json()).toEqual({ amount: '100000' })
        expect(request.headers.get('Idempotency-Key')).toMatch(
          /^[0-9a-f-]{36}$/,
        )
        await pending
        return HttpResponse.json(
          {
            success: true,
            data: {
              topupId: id,
              paymentUrl: endpoint + '?vnp_SecureHash=synthetic-signature',
            },
          },
          { status: 201 },
        )
      }),
    )
    const navigate = vi
      .spyOn(topupNavigation, 'redirect')
      .mockImplementation(() => {})
    const local = vi.spyOn(Storage.prototype, 'setItem')
    view(<TopupForm />)
    const form = screen
      .getByLabelText('Nhập số tiền nạp (VND)')
      .closest('form')!
    fireEvent.submit(form)
    fireEvent.submit(form)
    await waitFor(() => expect(posts).toBe(1))
    await act(async () => {
      release()
      await pending
    })
    await waitFor(() => expect(navigate).toHaveBeenCalledTimes(1))
    expect(navigate.mock.calls[0][0].href).toBe(
      endpoint + '?vnp_SecureHash=synthetic-signature',
    )
    expect(local).not.toHaveBeenCalled()
    expect(
      JSON.stringify(
        client
          .getQueryCache()
          .getAll()
          .map((q) => q.state.data),
      ),
    ).not.toContain('synthetic-signature')
  })
  it('keeps the order link and blocks another create when the redirect URL is unsafe', async () => {
    vi.spyOn(fundingApi, 'createTopup').mockResolvedValue({
      topupId: id,
      paymentUrl: 'https://evil.test/pay',
    })
    const navigate = vi.spyOn(topupNavigation, 'redirect')
    view(<TopupForm />)
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục tới VNPAY' }))
    expect(
      await screen.findByRole('link', { name: 'Kiểm tra lệnh vừa tạo' }),
    ).toHaveAttribute('href', '/app/topup/result?topupId=' + id)
    expect(navigate).not.toHaveBeenCalled()
    expect(
      screen.getByRole('button', { name: 'Đã tạo yêu cầu' }),
    ).toBeDisabled()
  })
  it('does not auto-retry an unknown create outcome', async () => {
    const create = vi
      .spyOn(fundingApi, 'createTopup')
      .mockRejectedValue(new FundingError('FUNDING_TIMEOUT', true))
    view(<TopupForm />)
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục tới VNPAY' }))
    await screen.findByText(
      'Chưa rõ yêu cầu đã được tạo hay chưa. Kiểm tra lịch sử trước khi thực hiện giao dịch khác.',
    )
    expect(
      screen.getByRole('button', { name: 'Tiếp tục tới VNPAY' }),
    ).toBeDisabled()
    expect(create).toHaveBeenCalledTimes(1)
  })
  it('clears an old account unknown intent when the account changes', async () => {
    vi.spyOn(fundingApi, 'createTopup').mockRejectedValue(new FundingError('FUNDING_TIMEOUT', true))
    view(<TopupForm />)
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục tới VNPAY' }))
    await screen.findByText('Chưa rõ yêu cầu đã được tạo hay chưa. Kiểm tra lịch sử trước khi thực hiện giao dịch khác.')
    act(() => { useAuthStore.setState({ user: { ...MOCK_USER, id } }) })
    expect(screen.getByRole('button', { name: 'Tiếp tục tới VNPAY' })).toBeEnabled()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
  it('maps unauthorized errors without leaking the backend message', async () => {
    server.use(
      http.post('*/payments/topups', () =>
        HttpResponse.json(
          {
            error: {
              code: 'UNAUTHORIZED',
              message: 'private backend detail',
              traceId: 'trace-401',
            },
          },
          { status: 401 },
        ),
      ),
    )
    view(<TopupForm />)
    fireEvent.click(screen.getByRole('button', { name: 'Tiếp tục tới VNPAY' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Mã yêu cầu: trace-401',
    )
    expect(screen.getByRole('alert')).not.toHaveTextContent(
      'private backend detail',
    )
  })
})
describe('Return correlation and receipts', () => {
  it('resolves NAP through exact account history and waits for APPROVED despite a fake success callback', async () => {
    const reads: string[] = []
    server.use(
      http.get('*/payments/topups', () =>
        HttpResponse.json({
          success: true,
          data: [
            {
              ...row,
              id: '30000000-0000-4000-8000-000000000001',
              code: 'NAPNEWEST',
              status: 'APPROVED',
            },
            row,
          ],
        }),
      ),
      http.get('*/payments/topups/:id', ({ params }) => {
        reads.push(String(params.id))
        return HttpResponse.json({ success: true, data: row })
      }),
    )
    view(<TopupStatusPanel />, '/?vnp_TxnRef=NAPABC123&vnp_ResponseCode=00')
    await screen.findByText('Đang chờ thanh toán')
    expect(reads).toEqual([id])
    expect(
      screen.queryByRole('heading', { name: 'Nạp tiền thành công' }),
    ).not.toBeInTheDocument()
    server.use(
      http.get('*/payments/topups/:id', () =>
        HttpResponse.json({
          success: true,
          data: { ...row, status: 'APPROVED' },
        }),
      ),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra lại' }))
    await screen.findByRole('heading', { name: 'Nạp tiền thành công' })
    await screen.findByText('200.000 ₫')
    expect(screen.getByRole('link', { name: 'Về ví' })).toHaveAttribute(
      'href',
      '/app',
    )
  })
  it.each([{ rows: [] }, { rows: [row, row] }])(
    'does not guess an order for missing or ambiguous history matches',
    async ({ rows }) => {
      vi.spyOn(fundingApi, 'getTopups').mockResolvedValue(
        rows.map((item) => ({ ...item, status: 'PENDING' as const })),
      )
      const read = vi.spyOn(fundingApi, 'getTopup')
      view(<TopupStatusPanel />, '/?vnp_TxnRef=NAPABC123&vnp_ResponseCode=00')
      await screen.findByText(
        'Chưa xác định được lệnh nạp. Vui lòng kiểm tra lịch sử giao dịch.',
      )
      expect(read).not.toHaveBeenCalled()
    },
  )
  it('rejects mismatched UUID/code correlation even if the UUID status says APPROVED', async () => {
    vi.spyOn(fundingApi, 'getTopup').mockResolvedValue({
      ...row,
      status: 'APPROVED',
    })
    view(
      <TopupStatusPanel />,
      '/?topupId=' + id + '&vnp_TxnRef=NAPOTHER&vnp_ResponseCode=00',
    )
    await screen.findByText(
      'Mã trả về không khớp lệnh nạp. Vui lòng kiểm tra lịch sử.',
    )
    expect(
      screen.queryByRole('heading', { name: 'Nạp tiền thành công' }),
    ).not.toBeInTheDocument()
  })
  it.each(['FAILED', 'REJECTED', 'EXPIRED'] as const)(
    'only shows terminal %s when read from the server',
    async (status) => {
      vi.spyOn(fundingApi, 'getTopup').mockResolvedValue({ ...row, status })
      view(<TopupStatusPanel />, '/?topupId=' + id)
      await screen.findByRole('heading', { name: 'Giao dịch không thành công' })
    },
  )
})
