import type { useCashOutStatus } from '../api/funding.queries'
import { QueryBoundary } from '@/components/common/QueryBoundary'
import { useWalletBalance } from '@/features/wallet'
import { FundingError } from '../api/funding.errors'
import { errorMessage } from '@/lib/apiResponse'
import { formatDateTime, formatVndExact } from '@/lib/format'
import type { CashOutRecord, CashOutStatus } from '../types/funding.types'
const labels: Record<CashOutStatus, string> = {
  REQUESTED: 'Lệnh đã tạo, chưa xác nhận rút tiền',
  HOLDING: 'Đang xử lý giữ tiền',
  PAYOUT_PENDING: 'Ngân hàng đang đối soát, chưa rõ kết quả',
  SUCCEEDED: 'Rút tiền mô phỏng thành công',
  FAILED: 'Lệnh rút không thành công',
}
export function CashOutStatusPanel({
  query,
}: {
  query: ReturnType<typeof useCashOutStatus>
}) {
  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card p-6">
      <h2 className="text-xl font-bold">Trạng thái lệnh rút (mô phỏng)</h2>
      <QueryBoundary
        query={query}
        emptyFallback={<p>Chưa có trạng thái lệnh rút.</p>}
      >
        {(order) => <CashOutReceipt order={order} />}
      </QueryBoundary>
      <ButtonRead
        pending={query.isFetching}
        read={() => {
          void query.refetch()
        }}
      />
      <p className="text-sm text-muted-foreground">
        Hết thời gian chờ không có nghĩa thất bại hoặc đã hoàn tiền. Đóng màn
        hình không hủy lệnh trên máy chủ.
      </p>
    </section>
  )
}
function ButtonRead({ pending, read }: { pending: boolean; read: () => void }) {
  return (
    <button disabled={pending} onClick={read}>
      Kiểm tra lại trạng thái
    </button>
  )
}
function CashOutReceipt({ order }: { order: CashOutRecord }) {
  return (
    <div className="space-y-3">
      <h3 role="status" className="font-bold">
        {labels[order.status]}
      </h3>
      <dl className="space-y-2 break-all">
        <dt>Mã lệnh từ máy chủ</dt>
        <dd>{order.id}</dd>
        <dt>Số tiền</dt>
        <dd>{formatVndExact(order.amount)} ₫</dd>
        <dt>Thời gian tạo</dt>
        <dd>{formatDateTime(order.createdAt)}</dd>
      </dl>
      {order.status === 'FAILED' && (
        <p>
          {errorMessage(
            new FundingError(order.failureReason ?? 'CASHOUT_FAILED'),
          )}
        </p>
      )}
      {order.status === 'SUCCEEDED' && (
        <>
          <ReceiptBalance />
          <button onClick={() => window.print()}>In biên lai mô phỏng</button>
        </>
      )}
      {['SUCCEEDED', 'FAILED'].includes(order.status) && (
        <a className="block text-primary underline" href="/app/withdraw">
          Mở form lệnh khác
        </a>
      )}
    </div>
  )
}
function ReceiptBalance() {
  const wallet = useWalletBalance()
  return (
    <div>
      <h4>Số dư khả dụng từ máy chủ</h4>
      <QueryBoundary query={wallet}>
        {(balance) => <p>{formatVndExact(balance.availableBalance)} ₫</p>}
      </QueryBoundary>
    </div>
  )
}
