import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { PinModal, useAuthStore } from '@/features/auth'
import { useWalletBalance } from '@/features/wallet'
import { QueryBoundary } from '@/components/common/QueryBoundary'
import { Button } from '@/components/ui/button'
import { errorMessage } from '@/lib/apiResponse'
import { formatVndExact } from '@/lib/format'
import { useCashOutStatus } from '../api/funding.queries'
import { useCashOutFlow } from '../hooks/useCashOutFlow'
import { CashOutForm } from './CashOutForm'
import { CashOutStatusPanel } from './CashOutStatusPanel'
import type { CashOutInput } from '../types/funding.types'
export function CashOutWorkspace() {
  const owner = useAuthStore((state) => state.user?.id)
  const [params] = useSearchParams()
  const id = params.get('cashOutId')
  return <CashOutSession key={owner} id={id} />
}
function CashOutSession({ id }: { id: string | null }) {
  const flow = useCashOutFlow()
  const wallet = useWalletBalance()
  const [, setParams] = useSearchParams()
  const [error, setError] = useState<string>()
  const [pinOpen, setPinOpen] = useState(false)
  const [intent, setIntent] = useState<CashOutInput>()
  const validId = id && z.uuid().safeParse(id).success ? id : undefined
  const orderId = id ? validId : flow.order?.id
  const status = useCashOutStatus(orderId ?? '')
  const canConfirm =
    flow.canConfirm &&
    flow.order?.id === orderId &&
    status.data?.id === orderId &&
    status.data?.status === 'REQUESTED' &&
    !status.isError
  const locked = Boolean(id || flow.order || flow.phase !== 'IDLE')
  // The owner-scoped session survives URL updates after create.
  useEffect(() => {
    if (validId)
      void flow
        .reconcile(validId)
        .catch((reason) => setError(errorMessage(reason)))
    // The recovered ID is immutable for this session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validId])
  async function create(input: CashOutInput) {
    setIntent(input)
    setError(undefined)
    try {
      const order = await flow.create(input)
      if (order) {
        setError(undefined)
        setParams({ cashOutId: order.id }, { replace: true })
      }
    } catch (reason) {
      setError(errorMessage(reason))
    }
  }
  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      <header>
        <h1 className="text-3xl font-bold">Rút tiền (mô phỏng)</h1>
        <p className="mt-2 text-muted-foreground">
          Rút về Mock Payout Bank. Không phải dịch vụ chuyển tiền ngân hàng
          thật.
        </p>
      </header>
      <div className="grid items-start gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {!id && !flow.order && (
            <CashOutForm locked={locked} onSubmit={create} />
          )}
          {id && !validId && (
            <p role="alert">
              Mã lệnh rút không hợp lệ. Chưa gửi yêu cầu giao dịch.
            </p>
          )}
          {error && (
            <p
              role="alert"
              className="rounded-xl border border-destructive/30 p-4"
            >
              {error}
            </p>
          )}
          {['UNKNOWN', 'ERROR'].includes(flow.phase) && !orderId && (
            <section className="space-y-3 rounded-2xl border border-border bg-card p-6">
              <p>
                {flow.phase === 'UNKNOWN'
                  ? 'Chưa rõ lệnh đã được tạo hay chưa. Thử lại giữ nguyên nội dung và mã yêu cầu; không tạo giao dịch mới.'
                  : 'Chưa hoàn tất yêu cầu. Thử lại cùng nội dung và mã yêu cầu.'}
              </p>
              <Button
                disabled={!intent}
                onClick={() => {
                  if (intent) void create(intent)
                }}
              >
                Thử lại cùng yêu cầu
              </Button>
              <p>
                Giữ màn hình này cho đến khi lấy được mã lệnh. Chưa hỗ trợ tra
                cứu yêu cầu mất mã sau reload.
              </p>
            </section>
          )}
          {orderId && <CashOutStatusPanel query={status} />}
          {canConfirm && flow.order && (
            <section className="space-y-3 rounded-2xl border border-border bg-card p-6">
              <h2 className="font-bold">Kiểm tra lệnh trước khi xác nhận</h2>
              <p>Số tiền: {formatVndExact(flow.order.amount)} ₫</p>
              <p>
                Điểm nhận:{' '}
                {flow.order.destination
                  ? 'Mã mô phỏng đã gửi'
                  : 'Điểm nhận mặc định của hệ thống mô phỏng'}
              </p>
              <Button onClick={() => setPinOpen(true)}>
                Xác nhận bằng PIN
              </Button>
            </section>
          )}
          {validId && !canConfirm && (
            <p>
              Đang khôi phục/đối soát lệnh. Không tự xác nhận lại lệnh có kết
              quả chưa rõ.
            </p>
          )}
          <Link to="/app">Về ví</Link>
        </div>
        <aside className="space-y-4 rounded-2xl border border-border bg-card p-6">
          <h2 className="font-bold">Số dư khả dụng</h2>
          <QueryBoundary query={wallet}>
            {(balance) => (
              <p className="text-xl font-bold">
                {formatVndExact(balance.availableBalance)} ₫
              </p>
            )}
          </QueryBoundary>
          <p className="text-sm text-muted-foreground">
            Tạo lệnh chưa trừ tiền. Số dư chỉ cập nhật theo kết quả máy chủ.
          </p>
        </aside>
      </div>
      {flow.order && (
        <PinModal
          open={pinOpen}
          onOpenChange={setPinOpen}
          paymentId={flow.order.id}
          amount={flow.order.amount}
          title="Xác nhận rút tiền mô phỏng"
          onSuccess={(token) => {
            setPinOpen(false)
            setError(undefined)
            void flow
              .confirm(token)
              .catch((reason) => setError(errorMessage(reason)))
          }}
        />
      )}
    </div>
  )
}
