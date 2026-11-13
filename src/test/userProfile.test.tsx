import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { delay, http, HttpResponse } from 'msw'
import { AxiosError } from 'axios'
import api from '@/lib/axios'
import { server } from '@/mocks/server'
import { useAuthStore, MOCK_USER } from '@/features/auth/stores/useAuthStore'
import { UserProfilePanel } from '@/features/user'
import { KycDocumentViewer } from '@/features/user/components/KycDocumentViewer'
import { KycForm } from '@/features/user/components/KycForm'
import { userService } from '@/features/user/services/userService'
import type { UserKycStatus, UserProfile } from '@/features/user/types/user.types'

const accountA = '10000000-0000-4000-8000-000000000001'
const accountB = '10000000-0000-4000-8000-000000000002'
const initialProfile: UserProfile = {
  id: '20000000-0000-4000-8000-000000000001', authUserId: accountA,
  email: 'synthetic@example.test', fullName: 'Người dùng thử', phone: null, address: null,
  kycStatus: 'NONE', kycTier: 0, idNumber: null, hasKycDocument: false,
  createdAt: '2026-11-12T00:00:00Z', updatedAt: '2026-11-12T00:00:00Z', version: 0
}
let profile: UserProfile
let status: UserKycStatus
let client: QueryClient

function renderProfile() {
  return render(<QueryClientProvider client={client}><UserProfilePanel /></QueryClientProvider>)
}

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  profile = { ...initialProfile }
  status = { kycStatus: 'NONE', kycTier: 0, hasKycDocument: false }
  useAuthStore.setState({ user: { ...MOCK_USER, id: accountA }, accessToken: 'synthetic-token', initialized: true })
  server.use(
    http.get('*/api/users/by-auth/:id', () => HttpResponse.json({ success: true, data: profile })),
    http.get('*/api/users/me/kyc', () => HttpResponse.json({ success: true, data: status }))
  )
})

afterEach(() => {
  cleanup()
  client.clear()
  useAuthStore.getState().clearState()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('Profile and KYC integration', () => {
  it('saves changed profile fields through PUT and reads them again after remount', async () => {
    let payload: unknown
    server.use(http.put('*/api/users/by-auth/:id', async ({ request, params }) => {
      expect(params.id).toBe(accountA)
      payload = await request.json()
      profile = { ...profile, fullName: 'Tên đã lưu', version: 1 }
      return HttpResponse.json({ success: true, data: profile })
    }))
    const view = renderProfile()
    expect(await screen.findByLabelText('Họ và tên')).toHaveValue('Người dùng thử')
    fireEvent.change(screen.getByLabelText('Họ và tên'), { target: { value: 'Tên đã lưu' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thông tin' }))
    await waitFor(() => expect(payload).toEqual({ fullName: 'Tên đã lưu' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Lưu thông tin' })).toBeDisabled())
    view.unmount()
    client.clear()
    renderProfile()
    expect(await screen.findByLabelText('Họ và tên')).toHaveValue('Tên đã lưu')
  })

  it('reads rejection reason and tier from the owner status API', async () => {
    status = { kycStatus: 'REJECTED', kycTier: 0, hasKycDocument: false, kycRejectReason: 'Ảnh mặt sau bị mờ.' }
    renderProfile()
    expect(await screen.findByText('Ảnh mặt sau bị mờ.')).toBeInTheDocument()
    expect(screen.getByText('Cấp xác thực: 0')).toBeInTheDocument()
    expect(screen.getByLabelText('Ảnh mặt sau')).toBeEnabled()
    expect(screen.queryByText('FV-8899-2026')).not.toBeInTheDocument()
  })

  it.each(['PENDING', 'APPROVED'] as const)('disables submission when server returns %s', async (kycStatus) => {
    status = { kycStatus, kycTier: kycStatus === 'APPROVED' ? 1 : 0, hasKycDocument: false }
    renderProfile()
    await screen.findByText(kycStatus === 'PENDING' ? 'Đang chờ xét duyệt' : 'Đã được xác thực')
    expect(screen.queryByRole('button', { name: 'Gửi xác thực' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Ảnh mặt trước')).not.toBeInTheDocument()
  })

  it('requires both images, sends multipart once on double submit and reconciles PENDING', async () => {
    vi.stubGlobal('URL', class extends URL {
      static createObjectURL = vi.fn(() => 'blob:synthetic-preview')
      static revokeObjectURL = vi.fn()
    })
    let uploads = 0
    let received: FormData | undefined
    // jsdom File streams are not compatible with Node Request.formData();
    // capture the Axios boundary here; real HTTP multipart remains a browser/live gate.
    vi.spyOn(api, 'post').mockImplementation(async (path, data) => {
      expect(path).toBe('/users/kyc/documents')
      uploads += 1
      received = data as FormData
      await delay(30)
      profile = { ...profile, kycStatus: 'PENDING', version: 1 }
      status = { kycStatus: 'PENDING', kycTier: 0, hasKycDocument: false }
      return { data: { success: true, data: profile } }
    })
    renderProfile()
    const image = new File(['synthetic image'], 'synthetic.png', { type: 'image/png' })
    fireEvent.change(await screen.findByLabelText('Số CCCD / Passport'), { target: { value: 'SYNTHETIC123' } })
    fireEvent.change(screen.getByLabelText('Ảnh mặt trước'), { target: { files: [image] } })
    fireEvent.click(screen.getByRole('button', { name: 'Gửi xác thực' }))
    await screen.findByText('Vui lòng chọn ảnh giấy tờ.')
    expect(uploads).toBe(0)
    fireEvent.change(screen.getByLabelText('Ảnh mặt sau'), { target: { files: [image] } })
    const button = screen.getByRole('button', { name: 'Gửi xác thực' })
    fireEvent.click(button)
    fireEvent.click(button)
    await waitFor(() => expect(uploads).toBe(1))
    await screen.findByText('Đang chờ xét duyệt')
    expect(uploads).toBe(1)
    expect(received).toBeInstanceOf(FormData)
    expect(received?.get('idNumber')).toBe('SYNTHETIC123')
    expect(received?.get('front')).toMatchObject({ name: 'synthetic.png', type: 'image/png' })
    expect(received?.get('back')).toMatchObject({ name: 'synthetic.png', type: 'image/png' })
    expect(screen.queryByRole('button', { name: 'Gửi xác thực' })).not.toBeInTheDocument()
  })

  it('only unlocks an uncertain upload after successful reconciliation and never retries it automatically', async () => {
    vi.stubGlobal('URL', class extends URL {
      static createObjectURL = vi.fn(() => 'blob:synthetic-preview')
      static revokeObjectURL = vi.fn()
    })
    const upload = vi.spyOn(userService, 'submitKyc')
      .mockRejectedValueOnce(new AxiosError('Synthetic network timeout'))
      .mockResolvedValue({ ...initialProfile, kycStatus: 'PENDING', version: 1 })
    const reload = vi.fn<() => Promise<boolean>>()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true)
    const saved = vi.fn()
    render(<KycForm profile={initialProfile} onSaved={saved} onReload={reload} />)
    const image = new File(['synthetic'], 'synthetic.png', { type: 'image/png' })
    fireEvent.change(screen.getByLabelText('Số CCCD / Passport'), { target: { value: 'SYNTHETIC123' } })
    fireEvent.change(screen.getByLabelText('Ảnh mặt trước'), { target: { files: [image] } })
    fireEvent.change(screen.getByLabelText('Ảnh mặt sau'), { target: { files: [image] } })
    fireEvent.click(screen.getByRole('button', { name: 'Gửi xác thực' }))
    await screen.findByRole('button', { name: 'Tải lại trạng thái hồ sơ' })
    expect(screen.getByLabelText('Ảnh mặt trước')).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Tải lại trạng thái hồ sơ' }))
    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Tải lại trạng thái hồ sơ' })).toBeEnabled())
    expect(screen.queryByRole('button', { name: 'Gửi xác thực' })).not.toBeInTheDocument()
    expect(upload).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Tải lại trạng thái hồ sơ' }))
    await screen.findByRole('button', { name: 'Gửi xác thực' })
    expect(upload).toHaveBeenCalledTimes(1)
    expect(screen.getByLabelText('Ảnh mặt trước')).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: 'Gửi xác thực' }))
    await waitFor(() => expect(saved).toHaveBeenCalledTimes(1))
    expect(upload).toHaveBeenCalledTimes(2)
  })

  it('drops late account A data and its form draft when account B becomes active', async () => {
    let started = false
    let release: (() => void) | undefined
    const pending = new Promise<void>((resolve) => { release = resolve })
    server.use(http.get('*/api/users/by-auth/:id', async ({ params }) => {
      if (params.id === accountA) {
        started = true
        await pending
        return HttpResponse.json({ success: true, data: { ...initialProfile, fullName: 'Dữ liệu cũ A' } })
      }
      return HttpResponse.json({ success: true, data: { ...initialProfile, authUserId: accountB, fullName: 'Tài khoản B' } })
    }))
    renderProfile()
    await waitFor(() => expect(started).toBe(true))
    act(() => useAuthStore.setState({ user: { ...MOCK_USER, id: accountB }, accessToken: 'synthetic-B' }))
    expect(await screen.findByLabelText('Họ và tên')).toHaveValue('Tài khoản B')
    await act(async () => { release?.(); await pending })
    expect(screen.getByLabelText('Họ và tên')).toHaveValue('Tài khoản B')
    expect(screen.queryByDisplayValue('Dữ liệu cũ A')).not.toBeInTheDocument()
    act(() => useAuthStore.getState().clearState())
    expect(screen.queryByLabelText('Họ và tên')).not.toBeInTheDocument()
  })

  it('renders loading and explicit empty states without exposing a fake profile', async () => {
    let release: (() => void) | undefined
    const pending = new Promise<void>((resolve) => { release = resolve })
    server.use(http.get('*/api/users/by-auth/:id', async () => {
      await pending
      return HttpResponse.json({ success: true, data: null })
    }))
    renderProfile()
    expect(screen.getByRole('status', { name: 'Đang tải hồ sơ' })).toBeInTheDocument()
    expect(screen.queryByLabelText('Họ và tên')).not.toBeInTheDocument()
    await act(async () => { release?.(); await pending })
    expect(await screen.findByText('Hồ sơ chưa sẵn sàng. Vui lòng làm mới trạng thái sau.')).toBeInTheDocument()
    expect(screen.queryByLabelText('Họ và tên')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Làm mới trạng thái' })).toBeEnabled()
  })

  it('shows a safe error with retry and then loads the status', async () => {
    let failed = true
    server.use(http.get('*/api/users/me/kyc', () => failed
      ? HttpResponse.json({ success: false, error: { code: 'INTERNAL_SERVER_ERROR', message: 'private database details' } }, { status: 500 })
      : HttpResponse.json({ success: true, data: status })))
    renderProfile()
    await screen.findByRole('button', { name: 'Thử lại' })
    expect(screen.queryByText('private database details')).not.toBeInTheDocument()
    failed = false
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }))
    expect(await screen.findByText('Chưa nộp hồ sơ')).toBeInTheDocument()
  })
})

describe('Signed document lifecycle', () => {
  it('revokes preview URLs when a file changes and when the form unmounts', async () => {
    const create = vi.fn().mockReturnValueOnce('blob:synthetic-first').mockReturnValueOnce('blob:synthetic-second')
    const revoke = vi.fn()
    vi.stubGlobal('URL', class extends URL {
      static createObjectURL = create
      static revokeObjectURL = revoke
    })
    const view = render(<KycForm profile={initialProfile} onSaved={vi.fn()} onReload={async () => true} />)
    fireEvent.change(screen.getByLabelText('Ảnh mặt trước'), {
      target: { files: [new File(['first'], 'first.png', { type: 'image/png' })] }
    })
    expect(await screen.findByAltText('Xem trước mặt trước')).toHaveAttribute('src', 'blob:synthetic-first')
    fireEvent.change(screen.getByLabelText('Ảnh mặt trước'), {
      target: { files: [new File(['second'], 'second.png', { type: 'image/png' })] }
    })
    await waitFor(() => expect(screen.getByAltText('Xem trước mặt trước')).toHaveAttribute('src', 'blob:synthetic-second'))
    expect(revoke).toHaveBeenCalledWith('blob:synthetic-first')
    view.unmount()
    expect(revoke).toHaveBeenCalledWith('blob:synthetic-second')
  })

  it('hides the URL on TTL expiry and requests a new one when reopened', async () => {
    vi.useFakeTimers()
    const getDocument = vi.spyOn(userService, 'getKycDocument').mockResolvedValue({ url: 'https://example.test/synthetic-front', expiresIn: 2 })
    render(<KycDocumentViewer authUserId={accountA} />)
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Xem giấy tờ đã gửi' })) })
    expect(screen.getByRole('img')).toBeInTheDocument()
    await act(async () => { await vi.advanceTimersByTimeAsync(2001) })
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Xem giấy tờ đã gửi' })) })
    expect(getDocument).toHaveBeenCalledTimes(2)
  })

  it('removes an already opened image immediately when the owner changes', async () => {
    vi.spyOn(userService, 'getKycDocument').mockResolvedValue({ url: 'https://example.test/synthetic-front', expiresIn: 60 })
    const view = render(<KycDocumentViewer authUserId={accountA} />)
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Xem giấy tờ đã gửi' })) })
    expect(screen.getByRole('img')).toBeInTheDocument()
    view.rerender(<KycDocumentViewer authUserId={accountB} />)
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})
