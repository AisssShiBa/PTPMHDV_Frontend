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
import { MerchantOverview } from '@/features/merchant'
import { merchantApi } from '@/features/merchant/api/merchant.api'
import { useAuthStore, MOCK_USER } from '@/features/auth/stores/useAuthStore'
const owner = '10000000-0000-4000-8000-000000000001'
const mid = '20000000-0000-4000-8000-000000000001'
const oid = '30000000-0000-4000-8000-000000000001'
const kid = '40000000-0000-4000-8000-000000000001'
const merchant = {
  id: mid,
  ownerId: owner,
  businessName: 'Cửa hàng tổng hợp',
  taxId: null,
  bankAccount: null,
  status: 'APPROVED',
  createdAt: '2026-11-13T00:00:00Z',
  updatedAt: '2026-11-13T00:00:00Z',
}
const outlet = {
  id: oid,
  merchantId: mid,
  code: 'SYNTHETIC-01',
  name: 'Quầy tổng hợp',
  createdAt: merchant.createdAt,
  updatedAt: merchant.updatedAt,
}
const metadata = {
  id: kid,
  keyId: kid,
  prefix: 'syntheti',
  revokedAt: null,
  lastUsedAt: null,
  createdAt: merchant.createdAt,
}
const raw = kid + '.synthetic-secret-never-log'
let client: QueryClient
beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  useAuthStore.setState({
    user: { ...MOCK_USER, id: owner },
    accessToken: 'synthetic',
    initialized: true,
  })
  server.use(
    http.get('*/merchants/me', () =>
      HttpResponse.json({ success: true, data: merchant }),
    ),
    http.get('*/merchants/:id/outlets', () =>
      HttpResponse.json({
        success: true,
        data: {
          content: [outlet],
          page: 1,
          limit: 10,
          totalElements: 1,
          totalPages: 1,
        },
      }),
    ),
    http.get('*/merchants/:id/outlets/:outlet/qr', () =>
      HttpResponse.json({
        success: true,
        data: {
          version: 1,
          merchantId: mid,
          outletId: oid,
          outletCode: outlet.code,
          issuedAt: 1,
          token: 'synthetic.signed',
          signature: 'signed',
          algorithm: 'HMAC-SHA256',
        },
      }),
    ),
    http.post('*/merchants/:id/api-keys', () =>
      HttpResponse.json(
        { success: true, data: { ...metadata, key: raw } },
        { status: 201 },
      ),
    ),
    http.delete('*/merchants/:id/api-keys/:key', () =>
      HttpResponse.json({
        success: true,
        data: { ...metadata, revokedAt: '2026-11-13T00:01:00Z' },
      }),
    ),
  )
})
afterEach(() => {
  cleanup()
  client.clear()
  vi.restoreAllMocks()
  useAuthStore.getState().clearState()
})
function view() {
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <MerchantOverview />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}
async function openKey() {
  fireEvent.click(
    await screen.findByRole('button', { name: 'Tạo API key mới' }),
  )
  fireEvent.click(screen.getByRole('button', { name: 'Xác nhận tạo khóa' }))
  await screen.findByLabelText('API key chỉ hiển thị lần này')
}
describe('Merchant tools sensitive workflows', () => {
  it.each(['PENDING', 'REJECTED'])(
    'does not offer outlet/QR/key create for %s',
    async (status) => {
      server.use(
        http.get('*/merchants/me', () =>
          HttpResponse.json({ success: true, data: { ...merchant, status } }),
        ),
      )
      const list = vi.spyOn(merchantApi, 'listOutlets')
      view()
      await screen.findByText(
        status === 'PENDING' ? 'Đang chờ duyệt' : 'Đăng ký bị từ chối',
      )
      expect(
        screen.queryByRole('button', { name: 'Tạo API key mới' }),
      ).not.toBeInTheDocument()
      expect(screen.queryByLabelText('Tên điểm bán')).not.toBeInTheDocument()
      expect(list).not.toHaveBeenCalled()
    },
  )
  it('validates outlet code before HTTP and shows server-backed list pagination', async () => {
    const create = vi.spyOn(merchantApi, 'createOutlet')
    view()
    await screen.findByText(outlet.name)
    fireEvent.change(screen.getByLabelText('Tên điểm bán'), {
      target: { value: 'Quầy' },
    })
    fireEvent.change(screen.getByLabelText('Mã điểm bán'), {
      target: { value: 'BAD|CODE' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Tạo điểm bán' }))
    await screen.findByRole('alert')
    expect(create).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Trang sau' })).toBeDisabled()
  })
  it('creates one outlet for double submit and invalidates its list', async () => {
    let count = 0
    server.use(
      http.post('*/merchants/:id/outlets', async ({ request }) => {
        count++
        expect(await request.json()).toEqual({
          name: 'Quầy mới',
          code: 'NEW-01',
        })
        return HttpResponse.json(
          { success: true, data: { ...outlet, code: 'NEW-01' } },
          { status: 201 },
        )
      }),
    )
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    view()
    await screen.findByLabelText('Tên điểm bán')
    fireEvent.change(screen.getByLabelText('Tên điểm bán'), {
      target: { value: 'Quầy mới' },
    })
    fireEvent.change(screen.getByLabelText('Mã điểm bán'), {
      target: { value: 'NEW-01' },
    })
    const form = screen.getByLabelText('Tên điểm bán').closest('form')!
    fireEvent.submit(form)
    fireEvent.submit(form)
    await screen.findByText('Máy chủ đã tiếp nhận điểm bán.')
    expect(count).toBe(1)
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ['merchant', owner, mid, 'outlets'],
    })
  })
  it('shows duplicate-code 409 without silently retrying', async () => {
    server.use(
      http.post('*/merchants/:id/outlets', () =>
        HttpResponse.json(
          { error: { code: 'DUPLICATE_RESOURCE' } },
          { status: 409 },
        ),
      ),
    )
    const create = vi.spyOn(merchantApi, 'createOutlet')
    view()
    await screen.findByLabelText('Tên điểm bán')
    fireEvent.change(screen.getByLabelText('Tên điểm bán'), {
      target: { value: 'Quầy' },
    })
    fireEvent.change(screen.getByLabelText('Mã điểm bán'), {
      target: { value: 'NEW-01' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Tạo điểm bán' }))
    await screen.findByText('Thông tin đã tồn tại. Vui lòng kiểm tra lại.')
    expect(create).toHaveBeenCalledTimes(1)
  })
  it('renders server QR, supports print, then removes it without caching the token', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {})
    view()
    fireEvent.click(
      await screen.findByRole('button', { name: 'Xem QR ' + outlet.code }),
    )
    await screen.findByTitle('QR điểm bán do máy chủ cấp')
    fireEvent.click(screen.getByRole('button', { name: 'In QR điểm bán' }))
    expect(print).toHaveBeenCalledTimes(1)
    expect(
      JSON.stringify(
        client
          .getQueryCache()
          .getAll()
          .map((q) => q.state.data),
      ),
    ).not.toContain('synthetic.signed')
    fireEvent.click(screen.getByRole('button', { name: 'Đóng' }))
    expect(
      screen.queryByTitle('QR điểm bán do máy chủ cấp'),
    ).not.toBeInTheDocument()
  })
  it('rejects a QR bound to another merchant instead of showing it', async () => {
    server.use(
      http.get('*/merchants/:id/outlets/:outlet/qr', () =>
        HttpResponse.json({
          success: true,
          data: {
            version: 1,
            merchantId: kid,
            outletId: oid,
            outletCode: outlet.code,
            issuedAt: 1,
            token: 'synthetic.signed',
            signature: 'signed',
            algorithm: 'HMAC-SHA256',
          },
        }),
      ),
    )
    view()
    fireEvent.click(
      await screen.findByRole('button', { name: 'Xem QR ' + outlet.code }),
    )
    await screen.findByRole('alert')
    expect(
      screen.queryByTitle('QR điểm bán do máy chủ cấp'),
    ).not.toBeInTheDocument()
  })
  it('keeps the raw key only in the open modal, never storage/cache, with no view-again feature', async () => {
    const storage = vi.spyOn(Storage.prototype, 'setItem')
    const issue = vi.spyOn(merchantApi, 'createKey')
    view()
    await openKey()
    expect(screen.getByLabelText('API key chỉ hiển thị lần này')).toHaveValue(
      raw,
    )
    expect(storage).not.toHaveBeenCalled()
    expect(client.getMutationCache().getAll()).toHaveLength(0)
    expect(
      JSON.stringify(
        client
          .getQueryCache()
          .getAll()
          .map((q) => q.state.data),
      ),
    ).not.toContain(raw)
    fireEvent.click(screen.getByRole('button', { name: 'Đóng' }))
    expect(
      screen.queryByLabelText('API key chỉ hiển thị lần này'),
    ).not.toBeInTheDocument()
    expect(screen.getByLabelText('keyId cần thu hồi')).toHaveValue(kid)
    fireEvent.click(screen.getByRole('button', { name: 'Tạo API key mới' }))
    expect(
      screen.queryByLabelText('API key chỉ hiển thị lần này'),
    ).not.toBeInTheDocument()
    expect(issue).toHaveBeenCalledTimes(1)
  })
  it('removes an already displayed key immediately on account switch', async () => {
    view()
    await openKey()
    expect(screen.getByLabelText('API key chỉ hiển thị lần này')).toHaveValue(
      raw,
    )
    act(() => {
      useAuthStore.setState({ user: { ...MOCK_USER, id: oid } })
    })
    expect(
      screen.queryByLabelText('API key chỉ hiển thị lần này'),
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
  it('ignores an API-key response after the modal is closed', async () => {
    let release!: (value: { key: string } & typeof metadata) => void
    vi.spyOn(merchantApi, 'createKey').mockReturnValue(
      new Promise((resolve) => {
        release = resolve
      }),
    )
    view()
    fireEvent.click(
      await screen.findByRole('button', { name: 'Tạo API key mới' }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận tạo khóa' }))
    fireEvent.click(screen.getByRole('button', { name: 'Đóng' }))
    await act(async () => {
      release({ ...metadata, key: raw })
    })
    expect(
      screen.queryByLabelText('API key chỉ hiển thị lần này'),
    ).not.toBeInTheDocument()
    expect(screen.getByLabelText('keyId cần thu hồi')).toHaveValue('')
  })
  it('does not retry key creation on error and does not retain a signed-in account key after switch', async () => {
    server.use(
      http.post('*/merchants/:id/api-keys', () =>
        HttpResponse.json(
          { error: { code: 'INTERNAL_ERROR' } },
          { status: 503 },
        ),
      ),
    )
    const issue = vi.spyOn(merchantApi, 'createKey')
    view()
    fireEvent.click(
      await screen.findByRole('button', { name: 'Tạo API key mới' }),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận tạo khóa' }))
    await screen.findByText(/Không tự tạo lại khóa/)
    expect(
      screen.getByRole('button', { name: 'Xác nhận tạo khóa' }),
    ).toBeDisabled()
    expect(issue).toHaveBeenCalledTimes(1)
    act(() => {
      useAuthStore.setState({ user: { ...MOCK_USER, id: kid } })
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
  it('revokes by metadata keyId only, with explicit confirmation and idempotent user retry', async () => {
    const revoke = vi.spyOn(merchantApi, 'revokeKey')
    view()
    await openKey()
    fireEvent.click(screen.getByRole('button', { name: 'Đóng' }))
    fireEvent.click(screen.getByRole('button', { name: 'Thu hồi khóa' }))
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận thu hồi' }))
    await screen.findByText('Máy chủ đã xác nhận thu hồi khóa.')
    expect(revoke).toHaveBeenCalledWith(mid, kid)
    fireEvent.click(screen.getByRole('button', { name: 'Thu hồi khóa' }))
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận thu hồi' }))
    await waitFor(() => expect(revoke).toHaveBeenCalledTimes(2))
    expect(
      screen.queryByLabelText('API key chỉ hiển thị lần này'),
    ).not.toBeInTheDocument()
  })
})
