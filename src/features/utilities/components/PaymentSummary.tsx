import { Loader2, Receipt } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatVnd, isGreaterThanOrEqual, subtractMoney } from '@/lib/format'

interface PaymentSummaryProps {
  balance: string
  amount: string
  discount?: string
  serviceName: string
  insufficient: boolean
  submitting: boolean
  disabled?: boolean
  onPay: () => void
}

export function PaymentSummary({
  balance,
  amount,
  discount,
  serviceName,
  insufficient,
  submitting,
  disabled,
  onPay
}: PaymentSummaryProps) {
  const payable = /^\d+$/.test(amount) ? amount : '0'
  const remaining = isGreaterThanOrEqual(balance, payable)
    ? subtractMoney(balance, payable)
    : '0'
  const discountValue = discount && discount !== '0' ? discount : null

  return (
    <Card className="sticky top-24 border-border shadow-sm">
      <CardHeader className="border-b border-border/60 pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span>Chi tiết thanh toán</span>
          <Receipt className="h-4 w-4 text-primary" />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3.5 pt-4 text-xs sm:text-sm">
        <div className="flex items-center justify-between py-1">
          <span className="text-muted-foreground">Nguồn thanh toán:</span>
          <div className="text-right">
            <span className="block font-semibold text-foreground">Ví FinVault chính</span>
            <span className="text-[11px] text-muted-foreground">
              (Số dư: {formatVnd(balance)})
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border/60 py-2">
          <span className="text-muted-foreground">Dịch vụ:</span>
          <span className="max-w-[220px] truncate text-right font-semibold text-foreground">
            {serviceName}
          </span>
        </div>

        <div className="flex items-center justify-between border-t border-border/60 py-2">
          <span className="text-muted-foreground">Số tiền gốc:</span>
          <span className="font-semibold text-foreground">{formatVnd(payable)}</span>
        </div>

        {discountValue && (
          <div className="flex items-center justify-between border-t border-border/60 py-2 text-emerald-600 dark:text-emerald-400">
            <span className="font-medium">Chiết khấu 3% (ghi nhận):</span>
            <span className="font-bold">{formatVnd(discountValue)}</span>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-border/60 py-2">
          <span className="text-muted-foreground">Phí giao dịch:</span>
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">0 ₫</span>
        </div>

        <div className="border-t-2 border-dashed border-border/80 pt-3">
          <div className="flex items-baseline justify-between">
            <span className="font-bold text-foreground">Tổng tiền thanh toán:</span>
            <span className="text-2xl font-extrabold text-primary">{formatVnd(payable)}</span>
          </div>
          <div className="mt-1 text-right text-[11px] text-muted-foreground">
            Số dư còn lại dự kiến:{' '}
            <strong className="text-foreground">{formatVnd(remaining)}</strong>
          </div>
        </div>

        <Button
          type="button"
          size="lg"
          disabled={disabled || submitting || insufficient || payable === '0'}
          onClick={onPay}
          className="mt-2 h-12 w-full cursor-pointer gap-2 text-sm font-semibold shadow-md"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Receipt className="h-4 w-4" />
          )}
          <span>
            {submitting ? 'Đang xử lý…' : `Thanh toán ngay ${formatVnd(payable)}`}
          </span>
        </Button>

        {insufficient && (
          <p className="text-center text-[11px] font-medium text-destructive">
            Số dư ví không đủ để thanh toán. Vui lòng nạp thêm tiền.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
