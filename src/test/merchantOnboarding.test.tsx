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
import { merchantService } from '@/features/merchant/services/merchantService'
import { useAuthStore, MOCK_USER } from '@/features/auth/stores/useAuthStore'
const owner = '10000000-0000-4000-8000-000000000001'
const other = '10000000-0000-4000-8000-000000000002'
const record = {
  id: '20000000-0000-4000-8000-000000000001',
  ownerId: owner,
  businessName: 'Cửa hàng tổng hợp',
  taxId: null,
  bankAccount: null,
  status: 'PENDING' as const,
  createdAt: '2026-11-12T00:00:00Z',
  updatedAt: '2026-11-12T00:00:00Z',
}
let client: QueryClient
beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  useAuthStore.setState({
    user: { ...MOCK_USER, id: owner },
    accessToken: 'synthetic',
    initialized: true,
  })
  server.use(
    http.get('*/merchants/:id/outlets', () =>
      HttpResponse.json({
        success: true,
        data: {
          content: [],
          page: 1,
          limit: 10,
          totalElements: 0,
          totalPages: 1,
        },
      }),
    ),
    http.get('*/merchants/me', () =>
      HttpResponse.json({ success: true, data: null }),
    ),
  )
})
afterEach(() => {
  cleanup()
  client.clear()
  vi.restoreAllMocks()
  useAuthStore.getState().clearState()
})
const view = (registration = true) =>
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <MerchantOverview registration={registration} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
async function fill() {
  fireEvent.change(await screen.findByLabelText('Tên thương hiệu'), {
    target: { value: '  Cửa hàng tổng hợp  ' },
  })
}
describe('Merchant onboarding and status', () => {
  it('only explicit null opens an empty registration form', async () => {
    view()
    expect(await screen.findByLabelText('Tên thương hiệu')).toHaveValue('')
    expect(screen.queryByText('Highlands Coffee')).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/ảnh cửa hàng/i)).not.toBeInTheDocument()
  })
  it('portal with null links to registration instead of inventing a merchant', async () => {
    view(false)
    expect(
      await screen.findByRole('link', { name: 'Đăng ký đối tác' }),
    ).toHaveAttribute('href', '/merchant/register')
  })
  it.each([
    ['PENDING', 'Đang chờ duyệt'],
    ['REJECTED', 'Đăng ký bị từ chối'],
    ['APPROVED', 'Đã được phê duyệt'],
  ] as const)(
    'renders %s from server without a duplicate registration form',
    async (status, label) => {
      server.use(
        http.get('*/merchants/me', () =>
          HttpResponse.json({ success: true, data: { ...record, status } }),
        ),
      )
      view()
      await screen.findByText(label)
      expect(screen.queryByLabelText('Tên thương hiệu')).not.toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: /Tạo.*QR|Tạo.*khóa/i }),
      ).not.toBeInTheDocument()
    },
  )
  it.each([404, 500])(
    'does not treat HTTP %i as null; retry only reads state',
    async (status) => {
      server.use(
        http.get('*/merchants/me', () =>
          HttpResponse.json(
            { error: { code: 'NOT_FOUND', message: 'private detail' } },
            { status },
          ),
        ),
      )
      const register = vi.spyOn(merchantService, 'registerMerchant')
      view()
      await screen.findByRole('alert')
      expect(screen.queryByLabelText('Tên thương hiệu')).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Thử lại' })).toBeEnabled()
      expect(register).not.toHaveBeenCalled()
    },
  )
  it('submits exactly the strict DTO once for double submit and refetches me', async () => {
    let posts = 0,
      reads = 0
    let saved = false
    let release!: () => void
    const pending = new Promise<void>((resolve) => {
      release = resolve
    })
    server.use(
      http.get('*/merchants/me', () => {
        reads++
        return HttpResponse.json({ success: true, data: saved ? record : null })
      }),
      http.post('*/merchants/register', async ({ request }) => {
        posts++
        expect(await request.json()).toEqual({
          businessName: record.businessName,
        })
        await pending
        saved = true
        return HttpResponse.json(
          { success: true, data: record },
          { status: 201 },
        )
      }),
    )
    view()
    await fill()
    const form = screen.getByLabelText('Tên thương hiệu').closest('form')!
    fireEvent.submit(form)
    fireEvent.submit(form)
    await waitFor(() => expect(posts).toBe(1))
    await act(async () => {
      release()
      await pending
    })
    await screen.findByText('Đang chờ duyệt')
    expect(reads).toBeGreaterThanOrEqual(2)
    expect(useAuthStore.getState().user?.role).toBe('USER')
  })
  it('does not create twice after an ambiguous POST outcome; checks me explicitly', async () => {
    let posts = 0,
      registered = false
    server.use(
      http.get('*/merchants/me', () =>
        HttpResponse.json({ success: true, data: registered ? record : null }),
      ),
      http.post('*/merchants/register', () => {
        posts++
        registered = true
        return HttpResponse.json(
          { error: { code: 'INTERNAL_ERROR', message: 'private detail' } },
          { status: 503 },
        )
      }),
    )
    view()
    await fill()
    fireEvent.click(screen.getByRole('button', { name: 'Gửi đăng ký đối tác' }))
    await screen.findByRole('button', { name: 'Kiểm tra trạng thái đăng ký' })
    expect(screen.getByLabelText('Tên thương hiệu')).toBeDisabled()
    fireEvent.click(
      screen.getByRole('button', { name: 'Kiểm tra trạng thái đăng ký' }),
    )
    await screen.findByText('Đang chờ duyệt')
    expect(posts).toBe(1)
  })
  it('duplicate registration requires status lookup instead of another POST', async () => {
    server.use(
      http.post('*/merchants/register', () =>
        HttpResponse.json(
          { error: { code: 'DUPLICATE_RESOURCE' } },
          { status: 409 },
        ),
      ),
    )
    view()
    await fill()
    fireEvent.click(screen.getByRole('button', { name: 'Gửi đăng ký đối tác' }))
    await screen.findByRole('button', { name: 'Kiểm tra trạng thái đăng ký' })
    expect(
      screen.queryByRole('button', { name: 'Gửi đăng ký đối tác' }),
    ).not.toBeInTheDocument()
  })
  it('blocks unknown response status and foreign merchant ownership', async () => {
    server.use(
      http.get('*/merchants/me', () =>
        HttpResponse.json({
          success: true,
          data: { ...record, ownerId: other, businessName: 'Foreign shop' },
        }),
      ),
    )
    view(false)
    await screen.findByRole('alert')
    expect(screen.queryByText('Foreign shop')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'Đăng ký đối tác' }),
    ).not.toBeInTheDocument()
  })
  it('resets drafts on account change and ignores an old delayed read', async () => {
    let release!: (value: typeof record) => void
    let signal: AbortSignal | undefined
    vi.spyOn(merchantService, 'getMyMerchant').mockImplementation(
      (abort, expectedOwner) => {
        if (expectedOwner === owner) {
          signal = abort
          return new Promise((resolve) => {
            release = resolve
          })
        }
        return Promise.resolve({
          ...record,
          ownerId: other,
          businessName: 'Tài khoản B',
        })
      },
    )
    view(false)
    await waitFor(() => expect(signal).toBeDefined())
    act(() => {
      useAuthStore.setState({ user: { ...MOCK_USER, id: other } })
    })
    await screen.findByText('Tài khoản B')
    await act(async () => {
      release(record)
    })
    expect(signal?.aborted).toBe(true)
    expect(screen.queryByText(record.businessName)).not.toBeInTheDocument()
  })
  it('rejects malformed 200 envelopes and never displays a success toast/state', async () => {
    server.use(
      http.get('*/merchants/me', () =>
        HttpResponse.json({
          success: true,
          data: { ...record, status: 'ACTIVE' },
        }),
      ),
    )
    view()
    await screen.findByRole('alert')
    expect(screen.queryByLabelText('Tên thương hiệu')).not.toBeInTheDocument()
    expect(screen.queryByText('Đã được phê duyệt')).not.toBeInTheDocument()
  })
})
