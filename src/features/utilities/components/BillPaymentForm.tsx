import {
  CheckCircle2,
  Droplets,
  Loader2,
  RefreshCw,
  Search,
  Wifi,
  Zap
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatVnd } from '@/lib/format'
import { BILL_PROVIDERS } from '../constants'
import { utilitiesErrorMessage } from '../errors'
import type { BillLookup } from '../types'

interface BillLookupState {
  data?: BillLookup
  isLoading: boolean
  isError: boolean
  error?: unknown
  refetch?: () => void
}

interface BillPaymentFormProps {
  provider: string
  customerCode: string
  onProviderChange: (value: string) => void
  onCustomerCodeChange: (value: string) => void
  onLookup: () => void
  lookup: BillLookupState
  disabled?: boolean
  error?: string | null
}

const providerIcon = (code: string) => {
  if (code === 'SAWACO') return <Droplets className="h-5 w-5" />
  if (code === 'FPT') return <Wifi className="h-5 w-5" />
  return <Zap className="h-5 w-5" />
}

export function BillPaymentForm({
  provider,
  customerCode,
  onProviderChange,
  onCustomerCodeChange,
  onLookup,
  lookup,
  disabled,
  error
}: BillPaymentFormProps) {
  return (
    <Card className="border-border shadow-sm animate-in fade-in-50 duration-200">
      <CardHeader className="border-b border-border/60 pb-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-primary" />
            <span>Tra cứu hóa đơn sinh hoạt</span>
          </CardTitle>
          <Badge
            variant="outline"
            className="border-amber-500/40 text-[10px] font-bold uppercase text-amber-700 dark:text-amber-400"
          >
            Mô phỏng
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-4">
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-foreground">
            Chọn loại hóa đơn cần thanh toán
          </Label>
          <div className="grid grid-cols-3 gap-3">
            {BILL_PROVIDERS.map((item) => {
              const selected = provider === item.code
              return (
                <button
                  key={item.code}
                  type="button"
                  onClick={() => onProviderChange(item.code)}
                  disabled={disabled}
                  className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 p-3 transition-all ${
                    selected
                      ? 'border-primary bg-primary/10 shadow-xs'
                      : 'border-border bg-card hover:bg-muted'
                  } disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                    {providerIcon(item.code)}
                  </div>
                  <span
                    className={`text-xs font-bold ${
                      selected ? 'text-primary' : 'text-foreground'
                    }`}
                  >
                    {item.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="utilityCustomerCode" className="text-xs font-semibold text-foreground">
            Mã khách hàng / Mã danh bộ
          </Label>
          <div className="flex gap-2">
            <Input
              id="utilityCustomerCode"
              value={customerCode}
              onChange={(event) => onCustomerCodeChange(event.target.value)}
              placeholder="Nhập mã in trên hóa đơn"
              disabled={disabled}
              maxLength={64}
              className="h-11 font-mono uppercase"
            />
            <Button
              type="button"
              onClick={onLookup}
              disabled={disabled || lookup.isLoading}
              className="h-11 shrink-0 cursor-pointer gap-1.5 px-4 text-xs font-semibold"
            >
              {lookup.isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              <span>Tra cứu</span>
            </Button>
          </div>
          <span className="text-[11px] text-muted-foreground">
            Mã khách hàng in trên hóa đơn giấy hoặc tin nhắn thông báo cước.
          </span>
        </div>

        {lookup.isError && (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs font-medium text-destructive"
          >
            <span>{utilitiesErrorMessage(lookup.error)}</span>
            {lookup.refetch && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => lookup.refetch?.()}
                className="h-8 gap-1.5 text-xs"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Thử lại
              </Button>
            )}
          </div>
        )}

        {lookup.data && (
          <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4 animate-in fade-in-50 duration-200">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-primary/15 pb-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span className="text-sm font-bold text-foreground">Đã tìm thấy hóa đơn</span>
              </div>
              <Badge className="border-none bg-amber-500/20 text-[10px] font-bold text-amber-800 dark:text-amber-300">
                Chưa thanh toán
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="block text-muted-foreground">Nhà cung cấp:</span>
                <span className="font-bold text-foreground">{lookup.data.provider}</span>
              </div>
              <div>
                <span className="block text-muted-foreground">Khách hàng:</span>
                <span className="font-bold text-foreground">{lookup.data.customerName}</span>
              </div>
              <div>
                <span className="block text-muted-foreground">Mã khách hàng:</span>
                <span className="font-mono font-semibold text-foreground">
                  {lookup.data.customerCode}
                </span>
              </div>
              <div>
                <span className="block text-muted-foreground">Kỳ hóa đơn:</span>
                <span className="font-semibold text-foreground">{lookup.data.period}</span>
              </div>
            </div>

            <div className="flex items-baseline justify-between border-t border-primary/15 pt-2">
              <span className="text-xs font-semibold text-muted-foreground">Số tiền cước:</span>
              <span className="text-xl font-bold text-primary">
                {formatVnd(lookup.data.amount)}
              </span>
            </div>
          </div>
        )}

        {error && (
          <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/10 p-2.5 text-xs font-medium text-destructive">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
