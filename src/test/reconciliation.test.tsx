import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { AdminReconciliation } from '@/features/admin/reconciliation/components/AdminReconciliation'
import { reconciliationKeys } from '@/features/admin/reconciliation/queries'
import { reconciliationErrorMessage } from '@/features/admin/reconciliation/messages'
import type { ReconciliationReport } from '@/features/admin/reconciliation/types'

const report = (overrides: Partial<ReconciliationReport> = {}): ReconciliationReport => ({
  id: 7,
  runAt: '2026-11-12T09:30:00.000Z',
  totalWallets: 1234,
  anomaliesFound: 5,
  systemBalanceExpected: '1000000',
  systemBalanceActual: '900000',
  isBalanced: false,
  anomalies: [
    { id: '41', type: 'NEGATIVE_BALANCE', walletId: 1, transactionId: null },
    { id: '42', type: 'BALANCE_DRIFT_QUICK', walletId: 2, transactionId: 'tx-2' },
    { id: '43', type: 'BALANCE_DRIFT_FULL', walletId: 3, transactionId: null },
    { id: '44', type: 'TRANSACTION_UNBALANCED', walletId: 4, transactionId: 'tx-4' },
    { id: '45', type: 'FUTURE_TYPE', walletId: 5, transactionId: null }
  ],
  ...overrides
})

const pageOf = (items: ReconciliationReport[], total = items.length) => ({
  items,
  page: 1,
  limit: 10,
  total
})

function renderReconciliation() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const view = render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AdminReconciliation />
      </MemoryRouter>
    </QueryClientProvider>
  )
  return { ...view, queryClient }
}

const reportListHandler = (items: ReconciliationReport[]) =>
  http.get('*/api/admin/reconciliation/reports', () =>
    HttpResponse.json({ success: true, data: pageOf(items) })
  )

const reportDetailHandler = (value: ReconciliationReport) =>
  http.get('*/api/admin/reconciliation/reports/:id', () =>
    HttpResponse.json({ success: true, data: value })
  )

const adjustHandler = (respond: () => Response) =>
  http.post('*/api/admin/reconciliation/anomalies/:id/adjust', () => respond())

const apiError = (status: number, code: string, message = 'raw english message') =>
  HttpResponse.json({ success: false, error: { code, message } }, { status })

describe('Reconciliation page states and reports [N18]', () => {
  it('hiển thị loading, lỗi và rỗng của danh sách báo cáo', async () => {
    server.use(reportListHandler([]))
    const view = renderReconciliation()
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(
      await screen.findByText('Chưa có báo cáo đối soát nào. Hãy chạy đối soát nhanh hoặc đầy đủ.')
    ).toBeInTheDocument()
    view.unmount()

    server.use(
      http.get('*/api/admin/reconciliation/reports', () =>
        apiError(500, 'INTERNAL', 'boom')
      )
    )
    renderReconciliation()
    expect(await screen.findByText('Không thể tải dữ liệu')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Thử lại/ })).toBeInTheDocument()
  })

  it('hiển thị đủ 4 loại anomaly, loại lạ mặc định và trạng thái isBalanced', async () => {
    server.use(reportListHandler([report()]), reportDetailHandler(report()))

    const view = renderReconciliation()
    fireEvent.click(await screen.findByText('Báo cáo #7'))

    expect(await screen.findByText('Số dư âm')).toBeInTheDocument()
    expect(screen.getByText('Lệch số dư (đối soát nhanh)')).toBeInTheDocument()
    expect(screen.getByText('Lệch số dư (đối soát đầy đủ)')).toBeInTheDocument()
    expect(screen.getByText('Bút toán không cân')).toBeInTheDocument()
    expect(screen.getByText('Loại bất thường khác')).toBeInTheDocument()
    expect(screen.getByText('(FUTURE_TYPE)')).toBeInTheDocument()
    expect(screen.getAllByText('SAI LỆCH').length).toBeGreaterThan(0)
    view.unmount()

    const balanced = report({ id: 8, isBalanced: true, anomalies: [], anomaliesFound: 0 })
    server.use(reportListHandler([balanced]), reportDetailHandler(balanced))
    renderReconciliation()
    fireEvent.click(await screen.findByText('Báo cáo #8'))
    await waitFor(() => expect(screen.getAllByText('CÂN ĐỐI').length).toBeGreaterThan(1))
    expect(
      screen.getByText('Không phát hiện bất thường trong báo cáo này.')
    ).toBeInTheDocument()
  })

  it('gọi đúng endpoint và query mode khi chạy đối soát', async () => {
    const modes: string[] = []
    server.use(
      reportListHandler([]),
      http.post('*/api/admin/reconciliation/run', ({ request }) => {
        modes.push(new URL(request.url).searchParams.get('mode') ?? '')
        return HttpResponse.json({ success: true, data: report() })
      }),
      reportDetailHandler(report())
    )

    renderReconciliation()
    fireEvent.click(await screen.findByRole('button', { name: 'Chạy đối soát nhanh' }))
    await waitFor(() => expect(modes).toEqual(['quick']))

    fireEvent.click(screen.getByRole('button', { name: 'Chạy đối soát đầy đủ' }))
    await waitFor(() => expect(modes).toEqual(['quick', 'full']))
  })
})

describe('Reconciliation adjustment [N18]', () => {
  it('gửi đúng body điều chỉnh và đóng hộp thoại khi thành công', async () => {
    let body: unknown
    let calls = 0
    server.use(
      reportListHandler([report()]),
      reportDetailHandler(report()),
      http.post('*/api/admin/reconciliation/anomalies/:id/adjust', async ({ request }) => {
        calls += 1
        body = await request.json()
        return HttpResponse.json({
          success: true,
          data: {
            anomalyId: '41',
            status: 'SUCCEEDED',
            referenceId: 'adjust-anomaly-41',
            transactionId: 'tx-41',
            replayed: false
          }
        })
      })
    )

    renderReconciliation()
    fireEvent.click(await screen.findByText('Báo cáo #7'))
    const adjustButtons = await screen.findAllByRole('button', { name: 'Điều chỉnh' })
    fireEvent.click(adjustButtons[0] as HTMLElement)

    fireEvent.change(await screen.findByLabelText(/Số tiền điều chỉnh/), {
      target: { value: '50000' }
    })
    fireEvent.change(screen.getByLabelText(/Lý do điều chỉnh/), {
      target: { value: '  Bù lệch theo biên bản BB-01  ' }
    })
    fireEvent.click(screen.getByRole('button', { name: /Ký duyệt & Tạo bút toán/ }))

    await waitFor(() => expect(calls).toBe(1))
    expect(body).toEqual({
      direction: 'CREDIT',
      amount: '50000',
      reason: 'Bù lệch theo biên bản BB-01'
    })
    await waitFor(() =>
      expect(screen.queryByLabelText(/Số tiền điều chỉnh/)).not.toBeInTheDocument()
    )
  })

  it('chặn số tiền không hợp lệ trước khi gọi API', async () => {
    let calls = 0
    server.use(
      reportListHandler([report()]),
      reportDetailHandler(report()),
      adjustHandler(() => {
        calls += 1
        return HttpResponse.json({ success: true, data: {} }) as never
      })
    )

    renderReconciliation()
    fireEvent.click(await screen.findByText('Báo cáo #7'))
    fireEvent.click((await screen.findAllByRole('button', { name: 'Điều chỉnh' }))[0] as HTMLElement)

    fireEvent.change(await screen.findByLabelText(/Số tiền điều chỉnh/), {
      target: { value: '1.5' }
    })
    fireEvent.change(screen.getByLabelText(/Lý do điều chỉnh/), {
      target: { value: 'Bù lệch hợp lệ' }
    })
    fireEvent.click(screen.getByRole('button', { name: /Ký duyệt & Tạo bút toán/ }))

    expect(
      await screen.findByText('Số tiền phải là số nguyên dương, không có dấu chấm hay dấu âm.')
    ).toBeInTheDocument()
    expect(calls).toBe(0)
  })

  it('409 ALREADY_ADJUSTED báo đã điều chỉnh và làm mới dữ liệu', async () => {
    let detailCalls = 0
    server.use(
      reportListHandler([report()]),
      http.get('*/api/admin/reconciliation/reports/:id', () => {
        detailCalls += 1
        return HttpResponse.json({ success: true, data: report() })
      }),
      adjustHandler(() => apiError(409, 'ALREADY_ADJUSTED'))
    )

    renderReconciliation()
    fireEvent.click(await screen.findByText('Báo cáo #7'))
    fireEvent.click((await screen.findAllByRole('button', { name: 'Điều chỉnh' }))[0] as HTMLElement)
    fireEvent.change(await screen.findByLabelText(/Số tiền điều chỉnh/), {
      target: { value: '50000' }
    })
    fireEvent.change(screen.getByLabelText(/Lý do điều chỉnh/), {
      target: { value: 'Bù lệch theo biên bản BB-01' }
    })
    const before = detailCalls
    fireEvent.click(screen.getByRole('button', { name: /Ký duyệt & Tạo bút toán/ }))

    expect(
      await screen.findByText(/Bất thường này đã được điều chỉnh trước đó/)
    ).toBeInTheDocument()
    await waitFor(() => expect(detailCalls).toBeGreaterThan(before))
  })

  it('503 ADJUST_OUTCOME_UNKNOWN báo chưa rõ kết quả và KHÔNG tự thử lại', async () => {
    let calls = 0
    server.use(
      reportListHandler([report()]),
      reportDetailHandler(report()),
      adjustHandler(() => {
        calls += 1
        return apiError(503, 'ADJUST_OUTCOME_UNKNOWN')
      })
    )

    renderReconciliation()
    fireEvent.click(await screen.findByText('Báo cáo #7'))
    fireEvent.click((await screen.findAllByRole('button', { name: 'Điều chỉnh' }))[0] as HTMLElement)
    fireEvent.change(await screen.findByLabelText(/Số tiền điều chỉnh/), {
      target: { value: '50000' }
    })
    fireEvent.change(screen.getByLabelText(/Lý do điều chỉnh/), {
      target: { value: 'Bù lệch theo biên bản BB-01' }
    })
    fireEvent.click(screen.getByRole('button', { name: /Ký duyệt & Tạo bút toán/ }))

    expect(
      await screen.findByText(/Chưa rõ kết quả điều chỉnh/)
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tải lại báo cáo' })).toBeInTheDocument()
    // Không có lần gọi tự động thứ hai với khóa/khung mới.
    await new Promise((resolve) => setTimeout(resolve, 50))
    expect(calls).toBe(1)
    expect(screen.queryByLabelText(/Số tiền điều chỉnh/)).not.toBeInTheDocument()
  })

  it('double-click chỉ gửi một request điều chỉnh', async () => {
    let calls = 0
    let release: (() => void) | undefined
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    server.use(
      reportListHandler([report()]),
      reportDetailHandler(report()),
      http.post('*/api/admin/reconciliation/anomalies/:id/adjust', async () => {
        calls += 1
        await gate
        return HttpResponse.json({
          success: true,
          data: {
            anomalyId: '41',
            status: 'SUCCEEDED',
            referenceId: 'adjust-anomaly-41',
            transactionId: 'tx-41',
            replayed: false
          }
        })
      })
    )

    renderReconciliation()
    fireEvent.click(await screen.findByText('Báo cáo #7'))
    fireEvent.click((await screen.findAllByRole('button', { name: 'Điều chỉnh' }))[0] as HTMLElement)
    fireEvent.change(await screen.findByLabelText(/Số tiền điều chỉnh/), {
      target: { value: '50000' }
    })
    fireEvent.change(screen.getByLabelText(/Lý do điều chỉnh/), {
      target: { value: 'Bù lệch theo biên bản BB-01' }
    })
    const submit = screen.getByRole('button', { name: /Ký duyệt & Tạo bút toán/ })
    fireEvent.click(submit)
    fireEvent.click(submit)
    await waitFor(() => expect(calls).toBe(1))
    fireEvent.click(submit)
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(calls).toBe(1)
    release?.()
  })
})

describe('Reconciliation error messages and cache keys [N18]', () => {
  it('409/503 trả thông báo tiếng Việt, không lộ message thô', () => {
    const withCode = (code: string) => ({
      isAxiosError: true,
      response: { status: 409, data: { success: false, error: { code, message: 'raw english' } } }
    })
    expect(reconciliationErrorMessage(withCode('ALREADY_ADJUSTED'))).toContain('đã được điều chỉnh')
    expect(reconciliationErrorMessage(withCode('ADJUSTMENT_OUTCOME_UNKNOWN'))).toContain(
      'chưa rõ kết quả'
    )
    expect(reconciliationErrorMessage(withCode('WALLET_TIMEOUT'))).not.toBe('raw english')
  })

  it('query keys tách danh sách và chi tiết báo cáo', () => {
    expect(reconciliationKeys.reportList(1, 10)).not.toEqual(reconciliationKeys.report(7))
    expect(reconciliationKeys.report(7)).toEqual(['admin', 'reconciliation', 'reports', 'detail', 7])
  })
})
