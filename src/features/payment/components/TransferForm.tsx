import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight, Check, Clock, Info, Receipt, Search, UserCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatVnd, isValidMoneyInput } from '@/lib/format'

interface RecipientFields {
  query: string
  name: string | null
  error: string
  loading: boolean
  cooldown: number
  onChange: (value: string) => void
  onLookup: () => void
}

interface TransferFields {
  amount: string
  message: string
  availableBalance: string
  limitError: { message: string } | null
  onAmountChange: (value: string) => void
  onMessageChange: (value: string) => void
}

export interface TransferFormProps {
  recipient: RecipientFields
  transfer: TransferFields
  isQuoting: boolean
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

const QUICK_AMOUNTS = ['50000', '100000', '200000', '500000', '1000000']

function RecipientStatus({ recipient }: Pick<TransferFormProps, 'recipient'>) {
  return <>
    {recipient.cooldown > 0 && (
      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 flex items-center gap-2">
        <Clock className="h-4 w-4 shrink-0" />
        <span>Bạn đang thao tác quá nhanh. Vui lòng chờ {recipient.cooldown}s trước khi thử lại.</span>
      </div>
    )}
    {recipient.error && recipient.cooldown === 0 && (
      <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0" /><span>{recipient.error}</span>
      </div>
    )}
    {recipient.name && (
      <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-between animate-in fade-in-50 duration-200">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold"><UserCheck className="h-5 w-5" /></div>
          <div><div className="text-sm font-bold text-foreground">{recipient.name}</div><div className="text-xs text-muted-foreground font-mono">{recipient.query}</div></div>
        </div>
        <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 gap-1 text-xs"><Check className="h-3.5 w-3.5" />Hợp lệ</Badge>
      </div>
    )}
  </>
}

function RecipientCard({ recipient }: Pick<TransferFormProps, 'recipient'>) {
  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-primary" /><CardTitle className="text-base sm:text-lg">Người nhận tiền</CardTitle></div>
          <Badge variant="outline" className="text-xs font-normal text-muted-foreground">Miễn phí chuyển 100%</Badge>
        </div>
        <CardDescription className="text-xs">Nhập số điện thoại hoặc email của người nhận trong hệ thống FinVault</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="recipient" className="text-xs font-semibold text-foreground">Số điện thoại / Email người nhận</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input id="recipient" value={recipient.query} onChange={event => recipient.onChange(event.target.value)}
                placeholder="Ví dụ: 0912345678 hoặc email@domain.com" autoComplete="off" disabled={recipient.cooldown > 0}
                className="pl-10 h-11 text-base sm:text-sm font-medium" />
            </div>
            <Button type="button" variant="outline" onClick={recipient.onLookup}
              disabled={recipient.loading || recipient.cooldown > 0 || !recipient.query.trim()} className="h-11 px-4 text-xs font-semibold">
              {recipient.loading ? 'Đang tìm...' : 'Kiểm tra'}
            </Button>
          </div>
        </div>
        <RecipientStatus recipient={recipient} />
      </CardContent>
    </Card>
  )
}

function AmountInput({ transfer }: Pick<TransferFormProps, 'transfer'>) {
  return <>
    <span className="text-xs text-muted-foreground block mb-2 font-medium">Số tiền chuyển (VND)</span>
    <div className="flex items-center justify-center gap-2">
      <Input type="text" inputMode="numeric" value={transfer.amount} onChange={event => transfer.onAmountChange(event.target.value)}
        placeholder="0" aria-label="Số tiền chuyển (VND)"
        className="text-center font-bold text-2xl sm:text-3xl text-primary border-none shadow-none bg-transparent focus-visible:ring-0 max-w-[280px] h-12" />
      <span className="text-xl sm:text-2xl font-bold text-primary">₫</span>
    </div>
    {transfer.amount && isValidMoneyInput(transfer.amount) && (
      <p className="text-xs font-semibold text-primary/80 mt-1">{formatVnd(transfer.amount)}</p>
    )}
    <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
      {QUICK_AMOUNTS.map(value => (
        <button key={value} type="button" onClick={() => transfer.onAmountChange(value)}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${transfer.amount === value
            ? 'bg-primary text-primary-foreground shadow-xs' : 'border border-border bg-card hover:bg-muted text-foreground'}`}>
          {formatVnd(value)}
        </button>
      ))}
    </div>
  </>
}

function LimitAlert({ message }: { message: string }) {
  return (
    <div className="mt-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-left text-xs text-rose-700 space-y-2">
      <div className="flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
        <div><p className="font-semibold">{message}</p><p className="text-[11px] text-muted-foreground mt-1">Để tăng hạn mức giao dịch, bạn có thể hoàn tất nâng cấp định danh tài khoản.</p></div>
      </div>
      <div className="pt-1"><Button asChild size="sm" variant="outline" className="h-7 text-xs text-rose-700 border-rose-300 hover:bg-rose-100">
        <Link to="/app/profile">Nâng cấp gói KYC ngay</Link>
      </Button></div>
    </div>
  )
}

function AmountCard({ transfer }: Pick<TransferFormProps, 'transfer'>) {
  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-primary" /><CardTitle className="text-base sm:text-lg">Số tiền &amp; Lời nhắn</CardTitle></div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="p-5 rounded-2xl bg-muted/40 border border-border/80 text-center">
          <AmountInput transfer={transfer} />
          {transfer.limitError && <LimitAlert message={transfer.limitError.message} />}
          <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5 text-primary shrink-0" />
            <span>Số dư khả dụng trong ví: <strong className="text-foreground">{formatVnd(transfer.availableBalance)}</strong></span>
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <Label htmlFor="message" className="text-xs font-semibold text-foreground">Lời nhắn tới người nhận</Label>
            <span className="text-[11px] text-muted-foreground">{transfer.message.length}/100 ký tự</span>
          </div>
          <Input id="message" maxLength={100} value={transfer.message} onChange={event => transfer.onMessageChange(event.target.value)}
            placeholder="Nhập nội dung chuyển tiền..." className="h-11 text-sm" />
        </div>
      </CardContent>
    </Card>
  )
}

function TransferSummary({ recipient, transfer, isQuoting }: Omit<TransferFormProps, 'onSubmit'>) {
  return (
    <Card className="border-border shadow-sm sticky top-24">
      <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Receipt className="h-4 w-4 text-primary" /><span>Tóm tắt giao dịch</span></CardTitle></CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="space-y-2.5 divide-y divide-border/60 text-xs sm:text-sm">
          <div className="flex justify-between items-center py-1">
            <span className="text-muted-foreground">Người nhận</span>
            <span className="font-semibold text-foreground text-right truncate max-w-[180px]">{recipient.name ?? 'Chưa chọn'}</span>
          </div>
          <div className="flex justify-between items-center py-2"><span className="text-muted-foreground">Số tiền</span><span className="font-bold text-foreground">{formatVnd(transfer.amount)}</span></div>
          <div className="flex justify-between items-center py-2"><span className="text-muted-foreground">Phí giao dịch</span><span className="font-semibold text-emerald-600">0 ₫ (Miễn phí)</span></div>
          <div className="flex justify-between items-center pt-3"><span className="font-semibold text-foreground">Tổng tiền trừ ví</span><span className="text-base sm:text-lg font-bold text-primary">{formatVnd(transfer.amount)}</span></div>
        </div>
        <Button type="submit" size="lg" disabled={!recipient.name || !transfer.amount || !isValidMoneyInput(transfer.amount) || isQuoting}
          className="w-full h-11 text-sm font-semibold gap-2 shadow-sm cursor-pointer">
          <span>{isQuoting ? 'Đang lấy báo giá...' : 'Tiếp tục kiểm tra'}</span><ArrowRight className="h-4 w-4" />
        </Button>
        <p className="text-[11px] text-center text-muted-foreground">Kiểm tra người nhận và số tiền trước khi tiếp tục.</p>
      </CardContent>
    </Card>
  )
}

export function TransferForm({ recipient, transfer, isQuoting, onSubmit }: TransferFormProps) {
  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <div className="lg:col-span-8 space-y-6"><RecipientCard recipient={recipient} /><AmountCard transfer={transfer} /></div>
      <div className="lg:col-span-4 space-y-4"><TransferSummary recipient={recipient} transfer={transfer} isQuoting={isQuoting} /></div>
    </form>
  )
}
