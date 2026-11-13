import { Link, useSearchParams } from 'react-router-dom'
import { useWalletBalance } from '@/features/wallet'
import { QueryBoundary } from '@/components/common/QueryBoundary'
import { errorMessage } from '@/lib/apiResponse'
import { formatVndExact } from '@/lib/format'
import { useTopupReturn } from '../hooks/useTopupReturn'
import { topupLabels } from './topupLabels'
export function TopupStatusPanel() {
  const [params] = useSearchParams()
  const { id, history, status, mismatch, resolving } = useTopupReturn(params)
  const data = mismatch ? undefined : status.data
  const success = data?.status === 'APPROVED' && !status.isError
  const failed = data && ['FAILED', 'REJECTED', 'EXPIRED'].includes(data.status)
  return (
    <section className="mx-auto max-w-2xl space-y-5 rounded-2xl border border-border bg-card p-6 text-center">
      <h1 className="text-2xl font-bold">
        {success
          ? 'Nạp tiền thành công'
          : failed
            ? 'Giao dịch không thành công'
            : 'Chưa xác nhận kết quả'}
      </h1>
      <p>
        {resolving
          ? 'Đang đối chiếu mã giao dịch với lịch sử của bạn…'
          : mismatch
            ? 'Mã trả về không khớp lệnh nạp. Vui lòng kiểm tra lịch sử.'
            : !id
              ? 'Chưa xác định được lệnh nạp. Vui lòng kiểm tra lịch sử giao dịch.'
              : status.isError
                ? 'Chưa đọc được trạng thái. Chưa thể xác nhận tiền đã vào ví.'
                : success
                  ? 'Backend đã xác nhận nạp tiền thành công.'
                  : 'Trạng thái chỉ được xác nhận từ máy chủ. Hết thời gian chờ không có nghĩa giao dịch thất bại.'}
      </p>
      {(status.isError || history.isError) && (
        <p role="alert">{errorMessage(status.error ?? history.error)}</p>
      )}
      {data && (
        <dl className="space-y-2 break-all">
          <dt>Mã lệnh</dt>
          <dd>{data.code}</dd>
          <dt>Số tiền</dt>
          <dd>{formatVndExact(data.amount)} ₫</dd>
          <dt>Trạng thái máy chủ</dt>
          <dd>{topupLabels[data.status]}</dd>
        </dl>
      )}
      {id && (
        <button
          disabled={status.isFetching}
          onClick={() => {
            void status.refetch()
          }}
        >
          Kiểm tra lại
        </button>
      )}
      {!id && params.has('vnp_TxnRef') && (
        <button
          disabled={history.isFetching}
          onClick={() => {
            void history.refetch()
          }}
        >
          Đối chiếu lại lịch sử
        </button>
      )}
      {success && (
        <div>
          <h2>Số dư khả dụng từ máy chủ</h2>
          <WalletReceipt />
        </div>
      )}
      <nav className="flex flex-wrap justify-center gap-4">
        <Link to="/app">Về ví</Link>
        <Link to="/app/topup">Xem lịch sử nạp tiền</Link>
        <Link to="/app/transactions">Xem lịch sử giao dịch</Link>
      </nav>
    </section>
  )
}

function WalletReceipt() {
  const wallet = useWalletBalance()
  return (
    <QueryBoundary query={wallet}>
      {(balance) => <p>{formatVndExact(balance.availableBalance)} ₫</p>}
    </QueryBoundary>
  )
}
