import { Info, Smartphone, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatVnd } from '@/lib/format'
import { VALID_AMOUNTS } from '../constants'
import { discountForAmount } from '../schemas'

interface TopupFormProps {
  phone: string
  amount: string
  onPhoneChange: (value: string) => void
  onAmountChange: (value: string) => void
  disabled?: boolean
  error?: string | null
}

export function TopupForm({
  phone,
  amount,
  onPhoneChange,
  onAmountChange,
  disabled,
  error
}: TopupFormProps) {
  return (
    <Card className="border-border shadow-sm animate-in fade-in-50 duration-200">
      <CardHeader className="border-b border-border/60 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-primary" />
            <span>Thông tin nạp tiền di động</span>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="border-amber-500/40 text-[10px] font-bold uppercase text-amber-700 dark:text-amber-400"
            >
              Mô phỏng
            </Badge>
            <Badge className="gap-1 border-none bg-emerald-500/15 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              <Sparkles className="h-3 w-3" />
              Chiết khấu 3%
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-4">
        <div className="space-y-1.5">
          <Label htmlFor="utilityPhone" className="text-xs font-semibold text-foreground">
            Số điện thoại người nhận
          </Label>
          <div className="relative">
            <Input
              id="utilityPhone"
              value={phone}
              onChange={(event) => onPhoneChange(event.target.value.replace(/[^\d+]/g, ''))}
              placeholder="Ví dụ: 0987654321"
              inputMode="tel"
              autoComplete="tel"
              disabled={disabled}
              maxLength={12}
              className="h-11 pr-10 text-base font-medium sm:text-sm"
            />
            <Smartphone className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
          <span className="text-[11px] text-muted-foreground">
            Nhà mạng được xác định tự động từ đầu số. Hỗ trợ 03, 05, 07, 08, 09 và +84.
          </span>
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-1">
            <Label className="text-xs font-semibold text-foreground">
              Chọn mệnh giá tiền nạp
            </Label>
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
              Ưu đãi 3% được backend ghi nhận
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {VALID_AMOUNTS.map((denomination) => {
              const selected = amount === denomination
              return (
                <button
                  key={denomination}
                  type="button"
                  onClick={() => onAmountChange(denomination)}
                  disabled={disabled}
                  className={`relative flex flex-col justify-between rounded-xl border-2 p-3 text-left transition-all ${
                    selected
                      ? 'border-primary bg-primary/10 shadow-xs'
                      : 'border-border bg-card hover:bg-muted'
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  <span
                    className={`text-sm font-bold ${
                      selected ? 'text-primary' : 'text-foreground'
                    }`}
                  >
                    {formatVnd(denomination)}
                  </span>
                  <span className="mt-0.5 text-xs text-muted-foreground">
                    Ưu đãi:{' '}
                    <strong className="text-foreground">
                      {formatVnd(discountForAmount(denomination))}
                    </strong>
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 p-3.5">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="text-xs text-muted-foreground">
            <strong className="block text-foreground">Đây là giao dịch mô phỏng</strong>
            Số tiền thanh toán là mệnh giá đã chọn. Khoản chiết khấu 3% do backend ghi nhận
            trên đơn, không tự trừ vào số tiền thanh toán.
          </div>
        </div>

        {error && (
          <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-2.5 text-xs font-medium text-destructive">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
