import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  RotateCcw,
  Undo2
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatDateTime, formatVnd } from '@/lib/format'
import { billProviderLabel } from '../constants'
import { isTerminalOrderStatus, orderStatusLabel, orderTypeLabel } from '../status'
import { failureReasonMessage } from '../status'
import type { UtilityOrderView } from '../types'

interface OrderStatusPanelProps {
  order: UtilityOrderView
  onReset: () => void
}

const badgeClass = (status: UtilityOrderView['status']): string => {
  if (status === 'SUCCESS') {
    return 'border-none bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
  }
  if (status === 'REFUNDED') {
    return 'border-none bg-sky-500/15 text-sky-700 dark:text-sky-400'
  }
  if (status === 'FAILED' || status === 'REFUND_FAILED') {
    return 'border-none bg-destructive/15 text-destructive'
  }
  return 'border-none bg-amber-500/15 text-amber-700 dark:text-amber-400'
}

const panelTitle = (status: UtilityOrderView['status']): string => {
  if (status === 'SUCCESS') return 'Giao dịch thành công'
  if (status === 'REFUNDED') return 'Đã hoàn tiền'
  if (status === 'REFUND_FAILED') return 'Hoàn tiền thất bại'
  if (status === 'FAILED') return 'Giao dịch thất bại'
  if (status === 'REFUND_REQUESTED') return 'Đang hoàn tiền'
  if (status === 'PENDING_PAYMENT') return 'Đang chờ thanh toán'
  return 'Giao dịch đang xử lý'
}

const panelDescription = (status: UtilityOrderView['status']): string => {
  if (status === 'SUCCESS') {
    return 'Dịch vụ đã được nhà cung cấp xác nhận. Biên lai điện tử được ghi nhận trên đơn hàng.'
  }
  if (status === 'REFUNDED') {
    return 'Nhà cung cấp không xử lý được giao dịch. FinVault đã hoàn tiền vào ví của bạn.'
  }
  if (status === 'REFUND_FAILED') {
    return 'Yêu cầu hoàn tiền không thành công. Vui lòng liên hệ hỗ trợ FinVault kèm mã đơn hàng.'
  }
  if (status === 'FAILED') {
    return 'Giao dịch không hoàn tất. Nếu ví đã bị trừ tiền, FinVault sẽ hoàn lại theo quy trình.'
  }
  if (status === 'REFUND_REQUESTED') {
    return 'FinVault đang xử lý hoàn tiền cho giao dịch này. Trạng thái sẽ tự cập nhật.'
  }
  if (status === 'PENDING_PAYMENT') {
    return 'Đơn hàng đã được tạo nhưng chưa xác thực thanh toán. Vui lòng hoàn tất bước PIN.'
  }
  return 'FinVault đang tự động cập nhật trạng thái đơn hàng từ nhà cung cấp.'
}

export function OrderStatusPanel({ order, onReset }: OrderStatusPanelProps) {
  const terminal = isTerminalOrderStatus(order.status)
  const failure = failureReasonMessage(order.failureReason)
  const isFailure = order.status === 'FAILED' || order.status === 'REFUND_FAILED'

  return (
    <div className="mx-auto max-w-2xl animate-in zoom-in-95 duration-200">
      <Card
        className={`relative overflow-hidden bg-card shadow-lg ${
          isFailure
            ? 'border-destructive/30'
            : order.status === 'REFUNDED'
              ? 'border-sky-500/30'
              : 'border-emerald-500/30'
        }`}
      >
        <div
          className={`h-2 w-full ${
            isFailure
              ? 'bg-destructive'
              : order.status === 'REFUNDED'
                ? 'bg-sky-500'
                : 'bg-emerald-500'
          }`}
        />
        <CardContent className="space-y-6 px-6 pb-8 pt-8">
          <div className="text-center">
            <div
              className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full shadow-inner ${
                isFailure
                  ? 'bg-destructive/15 text-destructive'
                  : order.status === 'REFUNDED'
                    ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400'
                    : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {!terminal ? (
                <Loader2 className="h-9 w-9 animate-spin" />
              ) : order.status === 'REFUNDED' ? (
                <Undo2 className="h-9 w-9" />
              ) : isFailure ? (
                <AlertTriangle className="h-9 w-9" />
              ) : (
                <CheckCircle2 className="h-9 w-9" />
              )}
            </div>
            <h2 className="mt-4 text-2xl font-bold tracking-tight text-foreground">
              {panelTitle(order.status)}
            </h2>
            <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground sm:text-sm">
              {panelDescription(order.status)}
            </p>
            <div className="mt-3 flex items-center justify-center gap-2">
              <Badge className={`text-[10px] font-bold ${badgeClass(order.status)}`}>
                {orderStatusLabel(order.status)}
              </Badge>
              {!terminal && (
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  Tự động cập nhật
                </span>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-muted/40 px-4 py-3 text-center">
            <span className="block text-xs text-muted-foreground">Số tiền giao dịch</span>
            <span className="mt-0.5 block text-3xl font-extrabold text-primary">
              {formatVnd(order.amount)}
            </span>
          </div>

          {failure && (
            <p
              role="alert"
              className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs font-medium text-destructive"
            >
              {failure}
            </p>
          )}

          <div className="space-y-3 rounded-xl border border-border bg-background p-4 text-left text-xs sm:text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Mã đơn hàng</span>
              <span className="break-all text-right font-mono font-bold text-foreground">
                {order.orderId}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-border/60 pt-2.5">
              <span className="text-muted-foreground">Loại giao dịch</span>
              <span className="font-semibold text-foreground">{orderTypeLabel(order.type)}</span>
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-border/60 pt-2.5">
              <span className="text-muted-foreground">Đối tượng nhận</span>
              <span className="max-w-[220px] truncate text-right font-semibold text-foreground">
                {order.target}
              </span>
            </div>
            {order.providerCode && (
              <div className="flex items-center justify-between gap-4 border-t border-border/60 pt-2.5">
                <span className="text-muted-foreground">Nhà cung cấp</span>
                <span className="font-semibold text-foreground">
                  {billProviderLabel(order.providerCode)}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between gap-4 border-t border-border/60 pt-2.5">
              <span className="text-muted-foreground">Chiết khấu ghi nhận</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                {formatVnd(order.discountAmount)}
              </span>
            </div>
            {order.providerRef && (
              <div className="flex items-center justify-between gap-4 border-t border-border/60 pt-2.5">
                <span className="text-muted-foreground">Mã nhà cung cấp</span>
                <span className="break-all text-right font-mono font-medium text-foreground">
                  {order.providerRef}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between gap-4 border-t border-border/60 pt-2.5">
              <span className="text-muted-foreground">Thời gian tạo</span>
              <span className="font-medium text-foreground">{formatDateTime(order.createdAt)}</span>
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-border/60 pt-2.5">
              <span className="text-muted-foreground">Cập nhật gần nhất</span>
              <span className="font-medium text-foreground">{formatDateTime(order.updatedAt)}</span>
            </div>
          </div>

          <Button
            type="button"
            size="lg"
            onClick={onReset}
            className="h-11 w-full cursor-pointer gap-2 text-sm font-semibold shadow-sm"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Thực hiện giao dịch khác</span>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
