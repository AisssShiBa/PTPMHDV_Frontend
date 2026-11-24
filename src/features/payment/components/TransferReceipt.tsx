import { ArrowLeft, Check, CheckCircle2, Copy, Printer, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { compareMoney, formatDateTime, formatVnd } from '@/lib/format'

export interface TransferReceiptData {
  id: string
  timestamp: string
  recipientName: string
  recipientPhone: string
  amount: string
  fee: string
  message: string
}

interface TransferReceiptProps {
  receipt: TransferReceiptData
  copied: boolean
  onCopy: (paymentId: string) => void
  onNewTransfer: () => void
  onPrint: () => void
  onHome: () => void
}

function ReceiptDetails({ receipt, copied, onCopy }: Pick<TransferReceiptProps, 'receipt' | 'copied' | 'onCopy'>) {
  const free = compareMoney(receipt.fee, '0') === 0
  return (
    <div className="rounded-xl border border-border p-4 bg-background text-left space-y-3 text-xs sm:text-sm">
      <div className="flex justify-between items-center">
        <span className="text-muted-foreground">Mã giao dịch</span>
        <div className="flex items-center gap-1.5 font-bold font-mono text-foreground">
          <span>{receipt.id}</span>
          <button type="button" aria-label="Sao chép mã giao dịch" onClick={() => onCopy(receipt.id)}
            className="text-primary hover:text-primary/80 transition-colors p-1 cursor-pointer">
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>
      <div className="border-t border-border/60 pt-2.5 flex justify-between items-center">
        <span className="text-muted-foreground">Thời gian thực hiện</span>
        <span className="font-medium text-foreground">{formatDateTime(receipt.timestamp)}</span>
      </div>
      <div className="border-t border-border/60 pt-2.5 flex justify-between items-center">
        <span className="text-muted-foreground">Người nhận</span>
        <div className="text-right">
          <span className="font-semibold text-foreground block">{receipt.recipientName}</span>
          <span className="text-xs text-muted-foreground font-mono">{receipt.recipientPhone}</span>
        </div>
      </div>
      <div className="border-t border-border/60 pt-2.5 flex justify-between items-center">
        <span className="text-muted-foreground">Phương thức thanh toán</span>
        <span className="font-medium text-foreground">Số dư ví FinVault</span>
      </div>
      <div className="border-t border-border/60 pt-2.5 flex justify-between items-center">
        <span className="text-muted-foreground">Lời nhắn</span>
        <span className="font-medium text-foreground text-right">{receipt.message}</span>
      </div>
      <div className="border-t border-border/60 pt-2.5 flex justify-between items-center">
        <span className="text-muted-foreground">Phí dịch vụ</span>
        <span className="font-semibold text-emerald-600">{formatVnd(receipt.fee)}{free ? ' (Miễn phí)' : ''}</span>
      </div>
    </div>
  )
}

function ReceiptActions({ onNewTransfer, onPrint, onHome }:
  Pick<TransferReceiptProps, 'onNewTransfer' | 'onPrint' | 'onHome'>) {
  return (
    <div className="space-y-2.5 pt-2">
      <Button type="button" size="lg" onClick={onNewTransfer}
        className="w-full h-11 text-sm font-semibold gap-2 shadow-sm cursor-pointer">
        <RotateCcw className="h-4 w-4" />
        <span>Chuyển tiếp giao dịch khác</span>
      </Button>
      <div className="grid grid-cols-2 gap-2.5">
        <Button type="button" variant="outline" onClick={onPrint}
          className="h-10 text-xs font-semibold gap-1.5 cursor-pointer">
          <Printer className="h-3.5 w-3.5" />
          <span>In / Tải biên lai</span>
        </Button>
        <Button type="button" variant="outline" onClick={onHome}
          className="h-10 text-xs font-semibold gap-1.5 cursor-pointer">
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Về trang chủ</span>
        </Button>
      </div>
    </div>
  )
}

export function TransferReceipt({ receipt, copied, onCopy, onNewTransfer, onPrint, onHome }: TransferReceiptProps) {
  return (
    <div className="max-w-xl mx-auto space-y-6 animate-in zoom-in-95 duration-200">
      <Card className="border-emerald-500/30 shadow-lg relative overflow-hidden bg-card">
        <div className="h-2 w-full bg-emerald-500" />
        <CardContent className="pt-8 pb-8 px-6 text-center space-y-6">
          <div className="mx-auto h-16 w-16 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center shadow-inner">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Chuyển tiền thành công!</h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">Tiền đã được gửi tức thì vào ví của người nhận</p>
          </div>
          <div className="py-3 px-4 rounded-2xl bg-muted/40 border border-border text-center">
            <span className="text-xs text-muted-foreground block">Số tiền giao dịch</span>
            <span className="text-3xl font-extrabold text-primary mt-0.5 block">{formatVnd(receipt.amount)}</span>
          </div>
          <ReceiptDetails receipt={receipt} copied={copied} onCopy={onCopy} />
          <ReceiptActions onNewTransfer={onNewTransfer} onPrint={onPrint} onHome={onHome} />
        </CardContent>
      </Card>
    </div>
  )
}
