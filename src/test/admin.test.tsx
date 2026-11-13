import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { AxiosError, type AxiosResponse } from 'axios'
import { server } from '@/mocks/server'
import { errorMessage, type ApiResponse } from '@/lib/apiResponse'
import { AdminDashboard } from '@/features/admin/components/AdminDashboard'
import { AdminKycManager } from '@/features/admin/components/AdminKycManager'
import { AdminTopupManager } from '@/features/admin/components/AdminTopupManager'
import { AdminKycDocumentsViewer } from '@/features/admin/components/AdminKycDocumentsViewer'
import { adminKeys, useApproveTopup } from '@/features/admin/api/admin.queries'
import {
  kycReviewSchema,
  kycTierSchema,
  topupRejectSchema
} from '@/features/admin/schemas/admin.schema'
import type { AdminKycItem, AdminTopup } from '@/features/admin/types/admin.types'

const userId = '10000000-0000-4000-8000-000000000001'
const topupId = '20000000-0000-4000-8000-000000000002'

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const result = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  )
  return { ...result, queryClient }
}

const kycItem: AdminKycItem = {
  id: userId,
  authUserId: userId,
  email: 'nguyen@example.com',
  fullName: 'Nguyễn Văn A',
  phone: '0901234567',
  address: 'Hà Nội',
  kycStatus: 'PENDING',
  kycTier: 0,
  idNumber: null,
  idImageUrl: null,
  createdAt: '2026-11-10T10:00:00.000Z',
  updatedAt: '2026-11-10T10:00:00.000Z'
}

const topup: AdminTopup = {
  id: topupId,
  userId,
  amount: '100000.00',
  code: 'TOPUP-1',
  status: 'PENDING',
  expiresAt: '2026-11-12T10:00:00.000Z',
  approvedBy: null,
  approvedAt: null,
  rejectReason: null,
  walletTransactionId: null,
  vnpTransactionNo: null,
  vnpBankCode: null,
  vnpPayDate: null,
  vnpResponseCode: null,
  paymentUrl: null,
  createdAt: '2026-11-12T09:00:00.000Z',
  updatedAt: '2026-11-12T09:00:00.000Z'
}

const dashboardStats = {
  users: { total: 1234, kycBreakdown: { none: 10, pending: 4, approved: 1200, rejected: 20 } },
  merchants: { total: 7, statusBreakdown: { pending: 1, approved: 6, rejected: 0 } },
  audits: { totalLogs: 55, todayActionsCount: 9, recentActivities: [] }
}

const axiosError = (status: number, code?: string) =>
  new AxiosError<ApiResponse<unknown>>(
    'Request failed',
    'ERR_BAD_REQUEST',
    undefined,
    undefined,
    {
      status,
      statusText: 'Error',
      headers: {},
      config: {},
      data: { success: false, error: { code: code ?? 'UNKNOWN', message: 'raw english message' } }
    } as AxiosResponse<ApiResponse<unknown>>
  )

describe('Admin KYC schemas [N17]', () => {
  it('chặn từ chối KYC khi thiếu lý do và chấp nhận lý do hợp lệ', () => {
    const missing = kycReviewSchema.safeParse({ status: 'REJECTED', detail: '   ' })
    expect(missing.success).toBe(false)
    if (!missing.success) {
      expect(missing.error.issues[0]?.message).toBe(
        'Vui lòng nhập lý do từ chối (1 đến 500 ký tự).'
      )
    }

    expect(kycReviewSchema.safeParse({ status: 'APPROVED' }).success).toBe(true)
    expect(
      kycReviewSchema.safeParse({ status: 'REJECTED', detail: 'Ảnh CCCD bị mờ' }).success
    ).toBe(true)
    expect(
      kycReviewSchema.safeParse({ status: 'REJECTED', detail: 'x'.repeat(501) }).success
    ).toBe(false)
  })

  it('đổi cấp KYC bắt buộc lý do 1..500 và chỉ nhận cấp 1/2', () => {
    expect(kycTierSchema.safeParse({ tier: 2, reason: '   ' }).success).toBe(false)
    expect(kycTierSchema.safeParse({ tier: 2, reason: 'x'.repeat(501) }).success).toBe(false)
    expect(kycTierSchema.safeParse({ tier: 2, reason: 'Xác minh ngân hàng' }).success).toBe(true)
    expect(kycTierSchema.safeParse({ tier: 3, reason: 'Xác minh' }).success).toBe(false)
  })

  it('từ chối lệnh nạp tiền bắt buộc lý do 1..500', () => {
    expect(topupRejectSchema.safeParse({ reason: '  ' }).success).toBe(false)
    expect(topupRejectSchema.safeParse({ reason: 'x'.repeat(501) }).success).toBe(false)
    expect(topupRejectSchema.safeParse({ reason: 'Sai số tiền' }).success).toBe(true)
  })

  it('lỗi 403 và 409 trả thông báo tiếng Việt, không lộ message thô', () => {
    expect(errorMessage(axiosError(403))).toBe('Bạn không có quyền thực hiện thao tác này.')
    expect(errorMessage(axiosError(409))).toBe(
      'Dữ liệu đã thay đổi hoặc đang bị xung đột. Vui lòng thử lại.'
    )
    expect(errorMessage(axiosError(409, 'INVALID_TRANSITION'))).toBe(
      'Trạng thái đã thay đổi. Vui lòng tải lại thông tin.'
    )
  })
})

describe('Admin KYC UI [N17]', () => {
  it('hiển thị đủ 4 trạng thái danh sách KYC', async () => {
    server.use(
      http.get('*/api/admin/kyc', () =>
        HttpResponse.json({ success: true, data: { content: [], page: 1, limit: 10, totalElements: 0, totalPages: 1 } })
      )
    )
    const first = renderWithClient(<AdminKycManager />)
    // Loading
    expect(screen.getByRole('status')).toBeInTheDocument()
    // Empty
    expect(
      await screen.findByText('Không có hồ sơ nào khớp bộ lọc hiện tại.')
    ).toBeInTheDocument()
    first.unmount()

    // Error
    server.use(
      http.get('*/api/admin/kyc', () =>
        HttpResponse.json({ success: false, error: { code: 'INTERNAL', message: 'boom' } }, { status: 500 })
      )
    )
    renderWithClient(<AdminKycManager />)
    expect(await screen.findByText('Không thể tải dữ liệu')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Thử lại/ })).toBeInTheDocument()
  })

  it('mở hồ sơ, chặn từ chối thiếu lý do rồi gửi đúng body khi có lý do', async () => {
    let reviewCalls = 0
    let reviewBody: unknown
    server.use(
      http.get('*/api/admin/kyc', () =>
        HttpResponse.json({
          success: true,
          data: { content: [kycItem], page: 1, limit: 10, totalElements: 1, totalPages: 1 }
        })
      ),
      http.post(`*/api/admin/kyc/${userId}/review`, async ({ request }) => {
        reviewCalls += 1
        reviewBody = await request.json()
        return HttpResponse.json({
          success: true,
          data: { ...kycItem, kycStatus: 'REJECTED', kycTier: 0 }
        })
      })
    )

    renderWithClient(<AdminKycManager />)
    await screen.findAllByText('Nguyễn Văn A')

    const rejectButtons = screen.getAllByRole('button', { name: 'Từ chối' })
    fireEvent.click(rejectButtons[rejectButtons.length - 1] as HTMLElement)
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận' }))
    expect(
      await screen.findByText('Vui lòng nhập lý do từ chối (1 đến 500 ký tự).')
    ).toBeInTheDocument()
    expect(reviewCalls).toBe(0)

    fireEvent.change(screen.getByPlaceholderText('Nhập lý do để lưu vào nhật ký kiểm toán'), {
      target: { value: '  Ảnh CCCD bị mờ  ' }
    })
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận' }))

    await waitFor(() => expect(reviewCalls).toBe(1))
    expect(reviewBody).toEqual({ status: 'REJECTED', detail: 'Ảnh CCCD bị mờ' })
  })

  it('nâng cấp KYC gửi đúng body tier và reason', async () => {
    let tierBody: unknown
    server.use(
      http.get('*/api/admin/kyc', () =>
        HttpResponse.json({
          success: true,
          data: { content: [kycItem], page: 1, limit: 10, totalElements: 1, totalPages: 1 }
        })
      ),
      http.patch(`*/api/admin/kyc/${userId}/tier`, async ({ request }) => {
        tierBody = await request.json()
        return HttpResponse.json({ success: true, data: { ...kycItem, kycTier: 2 } })
      })
    )

    renderWithClient(<AdminKycManager />)
    await screen.findAllByText('Nguyễn Văn A')

    fireEvent.click(screen.getByRole('button', { name: 'Nâng Cấp 2' }))
    fireEvent.change(screen.getByPlaceholderText('Nhập lý do để lưu vào nhật ký kiểm toán'), {
      target: { value: 'Xác minh ngân hàng' }
    })
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận' }))

    await waitFor(() => expect(tierBody).toEqual({ tier: 2, reason: 'Xác minh ngân hàng' }))
  })
})

describe('Admin KYC documents viewer [N17]', () => {
  it('tải ảnh qua endpoint audit và không ghi storage', async () => {
    localStorage.clear()
    sessionStorage.clear()
    server.use(
      http.get(`*/api/admin/kyc/${userId}/documents`, () =>
        HttpResponse.json({
          success: true,
          data: {
            frontUrl: 'https://cdn.example.com/front.jpg',
            backUrl: 'https://cdn.example.com/back.jpg',
            expiresAt: '2026-11-12T10:00:00.000Z'
          }
        })
      )
    )

    renderWithClient(<AdminKycDocumentsViewer userId={userId} />)
    fireEvent.click(screen.getByRole('button', { name: 'Xem hai mặt CCCD' }))

    expect(await screen.findByAltText('CCCD mặt trước')).toHaveAttribute(
      'src',
      'https://cdn.example.com/front.jpg'
    )
    expect(screen.getByAltText('CCCD mặt sau')).toBeInTheDocument()
    expect(localStorage.length).toBe(0)
    expect(sessionStorage.length).toBe(0)
  })
})

describe('Admin Topups UI [N17]', () => {
  it('hiển thị 4 trạng thái và số tiền dạng chuỗi', async () => {
    server.use(
      http.get('*/api/payments/admin/topups', () =>
        HttpResponse.json({ success: true, data: [topup] })
      )
    )
    const successRender = renderWithClient(<AdminTopupManager />)
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(await screen.findByText('TOPUP-1')).toBeInTheDocument()
    expect(screen.getByText('+100.000 ₫')).toBeInTheDocument()
    successRender.unmount()

    server.use(
      http.get('*/api/payments/admin/topups', () => HttpResponse.json({ success: true, data: [] }))
    )
    const emptyRender = renderWithClient(<AdminTopupManager />)
    expect(
      await screen.findByText('Không có lệnh nạp tiền nào khớp bộ lọc hiện tại.')
    ).toBeInTheDocument()
    emptyRender.unmount()

    server.use(
      http.get('*/api/payments/admin/topups', () =>
        HttpResponse.json({ success: false, error: { code: 'INTERNAL', message: 'boom' } }, { status: 500 })
      )
    )
    renderWithClient(<AdminTopupManager />)
    expect(await screen.findByText('Không thể tải dữ liệu')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Thử lại/ })).toBeInTheDocument()
  })

  it('duyệt lệnh nạp hiển thị lỗi NOT_ALLOWED bằng tiếng Việt', async () => {
    server.use(
      http.get('*/api/payments/admin/topups', () =>
        HttpResponse.json({ success: true, data: [topup] })
      ),
      http.post(`*/api/payments/admin/topups/${topupId}/approve`, () =>
        HttpResponse.json(
          { success: false, error: { code: 'NOT_ALLOWED', message: 'Manual approval disabled' } },
          { status: 400 }
        )
      )
    )

    renderWithClient(<AdminTopupManager />)
    fireEvent.click(await screen.findByRole('button', { name: 'Chi tiết' }))
    fireEvent.click(screen.getByRole('button', { name: 'Duyệt lệnh' }))

    expect(
      await screen.findByText(
        'Thao tác duyệt/từ chối thủ công đã bị tắt cho tích hợp VNPAY. Lệnh nạp được xử lý tự động qua IPN.'
      )
    ).toBeInTheDocument()
  })
})

describe('Admin dashboard [N17]', () => {
  it('hiển thị loading, lỗi và dữ liệu thật từ /admin/dashboard', async () => {
    server.use(
      http.get('*/api/admin/dashboard', () => HttpResponse.json({ success: true, data: dashboardStats }))
    )
    const successRender = renderWithClient(<AdminDashboard />)
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(await screen.findByText('1.234')).toBeInTheDocument()
    expect(screen.getByText('Tổng người dùng')).toBeInTheDocument()
    expect(screen.getByText('Chưa có thao tác quản trị nào được ghi nhận.')).toBeInTheDocument()
    successRender.unmount()

    server.use(
      http.get('*/api/admin/dashboard', () =>
        HttpResponse.json({ success: false, error: { code: 'INTERNAL', message: 'boom' } }, { status: 500 })
      )
    )
    renderWithClient(<AdminDashboard />)
    expect(await screen.findByText('Không thể tải dữ liệu')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Thử lại/ })).toBeInTheDocument()
  })
})

describe('Admin mutation invalidation [N17]', () => {
  it('duyệt nạp tiền invalidate danh sách topups và dashboard', async () => {
    server.use(
      http.post(`*/api/payments/admin/topups/${topupId}/approve`, () =>
        HttpResponse.json({ success: true, message: 'ok' })
      )
    )
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')

    function Probe() {
      const approve = useApproveTopup()
      return (
        <button type="button" onClick={() => approve.mutate(topupId)}>
          approve
        </button>
      )
    }

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <Probe />
        </MemoryRouter>
      </QueryClientProvider>
    )
    fireEvent.click(screen.getByRole('button', { name: 'approve' }))

    await waitFor(() => expect(invalidate).toHaveBeenCalledTimes(2))
    expect(invalidate).toHaveBeenCalledWith({ queryKey: adminKeys.topups() })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: adminKeys.dashboard() })
  })
})
