import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { KycForm } from './KycForm'
import type { UserProfile } from '../types/user.types'

// Mock URL.createObjectURL for jsdom
const mockCreateObjectURL = vi.fn(() => 'mocked-url')
const mockRevokeObjectURL = vi.fn()
vi.stubGlobal('URL', {
  createObjectURL: mockCreateObjectURL,
  revokeObjectURL: mockRevokeObjectURL
})

vi.mock('@/features/auth', () => ({
  useAuthStore: Object.assign(
    vi.fn((selector) => selector({ user: { id: 'test-user-id' } })),
    { getState: () => ({ user: { id: 'test-user-id' } }) }
  )
}))

vi.mock('@/features/user/api/user.api', () => ({
  userApi: {
    submitKyc: vi.fn()
  }
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() }
}))

import { userApi } from '@/features/user/api/user.api'
import { toast } from 'sonner'

function createProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'profile-1',
    authUserId: 'test-user-id',
    email: 'test@example.com',
    fullName: 'Test User',
    phone: '0909000000',
    address: '123 Test St',
    kycStatus: 'NONE',
    kycTier: 0,
    idNumber: null,
    hasKycDocument: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    version: 1,
    ...overrides
  }
}

function createFile(name: string, type: string, size: number): File {
  const buffer = new Uint8Array(size)
  // Add some PNG/JPEG magic bytes for proper type detection
  if (type === 'image/png') {
    buffer[0] = 0x89
    buffer[1] = 0x50
    buffer[2] = 0x4e
    buffer[3] = 0x47
  } else if (type === 'image/jpeg') {
    buffer[0] = 0xff
    buffer[1] = 0xd8
  } else if (type === 'image/webp') {
    buffer[0] = 0x52
    buffer[1] = 0x49
    buffer[2] = 0x46
    buffer[3] = 0x46
  }
  return new File([buffer], name, { type })
}

function renderKycForm(
  profile: UserProfile,
  onSaved = vi.fn(),
  onReload = vi.fn(),
  rejectionReason?: string
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <KycForm profile={profile} rejectionReason={rejectionReason} onSaved={onSaved} onReload={onReload} />
    </QueryClientProvider>
  )
}

describe('KycForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders submit form when kycStatus is NONE', () => {
    renderKycForm(createProfile({ kycStatus: 'NONE' }))
    expect(screen.getByRole('button', { name: 'Gửi xác thực' })).toBeInTheDocument()
    expect(screen.getByLabelText('Số CCCD / Passport')).toBeInTheDocument()
    expect(screen.getByLabelText('Ảnh mặt trước')).toBeInTheDocument()
    expect(screen.getByLabelText('Ảnh mặt sau')).toBeInTheDocument()
  })

  it('renders submit form when kycStatus is REJECTED', () => {
    renderKycForm(createProfile({ kycStatus: 'REJECTED' }))
    expect(screen.getByRole('button', { name: 'Gửi xác thực' })).toBeInTheDocument()
  })

  it('shows PENDING message and disables form when kycStatus is PENDING', () => {
    renderKycForm(createProfile({ kycStatus: 'PENDING' }))
    expect(screen.getByText(/Hồ sơ đang được xét duyệt/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Gửi xác thực' })).not.toBeInTheDocument()
  })

  it('shows APPROVED message and disables form when kycStatus is APPROVED', () => {
    renderKycForm(createProfile({ kycStatus: 'APPROVED' }))
    expect(screen.getByText(/Danh tính của bạn đã được xác thực/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Gửi xác thực' })).not.toBeInTheDocument()
  })

  it('shows rejection reason when kycStatus is REJECTED', () => {
    renderKycForm(
      createProfile({ kycStatus: 'REJECTED' }),
      vi.fn(),
      vi.fn(),
      'Ảnh mờ, chụp lại'
    )
    expect(screen.getByText(/Hồ sơ chưa được chấp thuận/)).toBeInTheDocument()
    const reasonEl = screen.getByText((_content, element) =>
      element instanceof HTMLElement &&
      element.tagName === 'P' &&
      element.className.includes('break-words') &&
      element.textContent?.includes('Lý do từ chối:') &&
      element.textContent?.includes('Ảnh mờ, chụp lại')
    )
    expect(reasonEl).toBeInTheDocument()
  })

  it('blocks non JPEG/PNG files on submit', async () => {
    renderKycForm(createProfile({ kycStatus: 'NONE' }))
    const frontInput = screen.getByLabelText('Ảnh mặt trước') as HTMLInputElement
    const backInput = screen.getByLabelText('Ảnh mặt sau') as HTMLInputElement
    const idInput = screen.getByLabelText('Số CCCD / Passport') as HTMLInputElement

    await userEvent.type(idInput, '123456789012')
    Object.defineProperty(frontInput, 'files', { value: [createFile('test.webp', 'image/webp', 1024)], configurable: true })
    fireEvent.change(frontInput)
    Object.defineProperty(backInput, 'files', { value: [createFile('back.png', 'image/png', 1024)], configurable: true })
    fireEvent.change(backInput)

    await userEvent.click(screen.getByRole('button', { name: 'Gửi xác thực' }))
    expect(screen.getByText('Chỉ chấp nhận ảnh JPEG hoặc PNG.')).toBeInTheDocument()
  })

  it('blocks files over 5 MB on submit', async () => {
    renderKycForm(createProfile({ kycStatus: 'NONE' }))
    const frontInput = screen.getByLabelText('Ảnh mặt trước') as HTMLInputElement
    const backInput = screen.getByLabelText('Ảnh mặt sau') as HTMLInputElement
    const idInput = screen.getByLabelText('Số CCCD / Passport') as HTMLInputElement

    await userEvent.type(idInput, '123456789012')
    Object.defineProperty(frontInput, 'files', { value: [createFile('large.png', 'image/png', 6 * 1024 * 1024)], configurable: true })
    fireEvent.change(frontInput)
    Object.defineProperty(backInput, 'files', { value: [createFile('back.png', 'image/png', 1024)], configurable: true })
    fireEvent.change(backInput)

    await userEvent.click(screen.getByRole('button', { name: 'Gửi xác thực' }))
    expect(screen.getByText('Ảnh phải có dữ liệu và không vượt quá 5 MiB.')).toBeInTheDocument()
  })

  it('requires both front and back images', async () => {
    renderKycForm(createProfile({ kycStatus: 'NONE' }))
    const frontInput = screen.getByLabelText('Ảnh mặt trước') as HTMLInputElement
    const idInput = screen.getByLabelText('Số CCCD / Passport') as HTMLInputElement

    await userEvent.type(idInput, '123456789012')
    Object.defineProperty(frontInput, 'files', { value: [createFile('front.png', 'image/png', 1024)], configurable: true })
    fireEvent.change(frontInput)
    // back is empty
    await userEvent.click(screen.getByRole('button', { name: 'Gửi xác thực' }))
    expect(screen.getByText('Vui lòng chọn ảnh giấy tờ.')).toBeInTheDocument()
  })

  it('submits KYC with valid data and shows success', async () => {
    const onSaved = vi.fn()
    const onReload = vi.fn().mockResolvedValue(true)
    const savedProfile = createProfile({ kycStatus: 'PENDING', hasKycDocument: true })
    vi.mocked(userApi.submitKyc).mockResolvedValue(savedProfile)

    renderKycForm(createProfile({ kycStatus: 'NONE' }), onSaved, onReload)

    const frontInput = screen.getByLabelText('Ảnh mặt trước') as HTMLInputElement
    const backInput = screen.getByLabelText('Ảnh mặt sau') as HTMLInputElement
    const idInput = screen.getByLabelText('Số CCCD / Passport') as HTMLInputElement

    await userEvent.type(idInput, '123456789012')
    Object.defineProperty(frontInput, 'files', { value: [createFile('front.png', 'image/png', 1024)], configurable: true })
    fireEvent.change(frontInput)
    Object.defineProperty(backInput, 'files', { value: [createFile('back.png', 'image/png', 1024)], configurable: true })
    fireEvent.change(backInput)

    await userEvent.click(screen.getByRole('button', { name: 'Gửi xác thực' }))

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('Đã gửi hồ sơ xác thực, vui lòng chờ xét duyệt.')
    })
    expect(onSaved).toHaveBeenCalledWith(savedProfile)
    expect(onReload).toHaveBeenCalled()
  })

  it('prevents double submit while uploading', async () => {
    let resolveSubmit: (value: UserProfile) => void
    const submitPromise = new Promise<UserProfile>((resolve) => { resolveSubmit = resolve })
    vi.mocked(userApi.submitKyc).mockReturnValue(submitPromise)

    const onSaved = vi.fn()
    const onReload = vi.fn().mockResolvedValue(true)
    renderKycForm(createProfile({ kycStatus: 'NONE' }), onSaved, onReload)

    const frontInput = screen.getByLabelText('Ảnh mặt trước') as HTMLInputElement
    const backInput = screen.getByLabelText('Ảnh mặt sau') as HTMLInputElement
    const idInput = screen.getByLabelText('Số CCCD / Passport') as HTMLInputElement

    await userEvent.type(idInput, '123456789012')
    Object.defineProperty(frontInput, 'files', { value: [createFile('front.png', 'image/png', 1024)], configurable: true })
    fireEvent.change(frontInput)
    Object.defineProperty(backInput, 'files', { value: [createFile('back.png', 'image/png', 1024)], configurable: true })
    fireEvent.change(backInput)

    await userEvent.click(screen.getByRole('button', { name: 'Gửi xác thực' }))

    const submitBtn = screen.getByRole('button', { name: /Đang gửi hồ sơ/ })
    expect(submitBtn).toBeDisabled()

    await userEvent.click(screen.getByRole('button', { name: /Đang gửi hồ sơ/ }))

    resolveSubmit!(createProfile({ kycStatus: 'PENDING', hasKycDocument: true }))
    await act(async () => { await submitPromise })

    expect(userApi.submitKyc).toHaveBeenCalledTimes(1)
  })

  it('shows reload button on ambiguous error and does not auto-retry', async () => {
    vi.mocked(userApi.submitKyc).mockRejectedValue({ code: 'UNKNOWN_ERROR' })

    const onSaved = vi.fn()
    const onReload = vi.fn().mockResolvedValue(true)
    renderKycForm(createProfile({ kycStatus: 'NONE' }), onSaved, onReload)

    const frontInput = screen.getByLabelText('Ảnh mặt trước') as HTMLInputElement
    const backInput = screen.getByLabelText('Ảnh mặt sau') as HTMLInputElement
    const idInput = screen.getByLabelText('Số CCCD / Passport') as HTMLInputElement

    await userEvent.type(idInput, '123456789012')
    Object.defineProperty(frontInput, 'files', { value: [createFile('front.png', 'image/png', 1024)], configurable: true })
    fireEvent.change(frontInput)
    Object.defineProperty(backInput, 'files', { value: [createFile('back.png', 'image/png', 1024)], configurable: true })
    fireEvent.change(backInput)

    await userEvent.click(screen.getByRole('button', { name: 'Gửi xác thực' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Tải lại trạng thái hồ sơ/ })).toBeInTheDocument()
    })
    expect(screen.queryByRole('button', { name: 'Gửi xác thực' })).not.toBeInTheDocument()
  })

  it('auto-reloads on validation errors only (not double-submit)', async () => {
    // Mock axios-like error that errorCode can parse
    const axiosError = {
      isAxiosError: true,
      response: {
        data: {
          error: { code: 'VALIDATION_ERROR', message: 'Validation failed' }
        }
      }
    }
    vi.mocked(userApi.submitKyc).mockRejectedValue(axiosError)

    const onSaved = vi.fn()
    const onReload = vi.fn().mockResolvedValue(true)
    renderKycForm(createProfile({ kycStatus: 'NONE' }), onSaved, onReload)

    const frontInput = screen.getByLabelText('Ảnh mặt trước') as HTMLInputElement
    const backInput = screen.getByLabelText('Ảnh mặt sau') as HTMLInputElement
    const idInput = screen.getByLabelText('Số CCCD / Passport') as HTMLInputElement

    await userEvent.type(idInput, '123456789012')
    Object.defineProperty(frontInput, 'files', { value: [createFile('front.png', 'image/png', 1024)], configurable: true })
    fireEvent.change(frontInput)
    Object.defineProperty(backInput, 'files', { value: [createFile('back.png', 'image/png', 1024)], configurable: true })
    fireEvent.change(backInput)

    await userEvent.click(screen.getByRole('button', { name: 'Gửi xác thực' }))

    await waitFor(() => {
      expect(onReload).toHaveBeenCalled()
    })
  })

  it('new user does not see fake Tier 2', () => {
    renderKycForm(createProfile({ kycStatus: 'NONE', kycTier: 0 }))
    expect(screen.queryByText(/Cấp 2/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Cấp xác thực: 2/)).not.toBeInTheDocument()
  })

  it('user with approved KYC sees approval message from server', () => {
    renderKycForm(createProfile({ kycStatus: 'APPROVED', kycTier: 1 }))
    expect(screen.getByText(/Danh tính của bạn đã được xác thực/)).toBeInTheDocument()
  })
})