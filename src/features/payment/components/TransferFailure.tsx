import { AlertTriangle, RotateCcw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { PaymentStatus } from '../types/payment.types'

export interface TransferFailureData {
  id: string
  status: PaymentStatus | null
  reason: string
}

interface TransferFailureProps {
  failure: TransferFailureData
  onNewTransfer: () => void
  onViewHistory: () => void
}

function FailureDetails({ failure }: Pick<TransferFailureProps, 'failure'>) {
  return (
    <div className="rounded-xl border border-border p-4 bg-muted/20 space-y-3 text-xs sm:text-sm">
      <div className="flex justify-between items-center">
        <span className="text-muted-foreground">Mã giao dịch</span>
        <span className="font-mono font-semibold text-foreground">{failure.id}</span>
      </div>
      <div className="border-t border-border/60 pt-2 flex justify-between items-center">
        <span className="text-muted-foreground">Trạng thái</span>
        <span className="font-semibold text-rose-600">{failure.status ?? 'Chưa xác định'}</span>
      </div>
    </div>
  )
}

export function TransferFailure({ failure, onNewTransfer, onViewHistory }: TransferFailureProps) {
  return (
    <div className="max-w-xl mx-auto space-y-6 animate-in zoom-in-95 duration-200">
      <Card className="border-rose-500/30 shadow-lg relative overflow-hidden bg-card">
        <div className="h-2 w-full bg-rose-500" />
        <CardHeader className="text-center pb-4 pt-6">
          <div className="mx-auto h-16 w-16 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center mb-3">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <Badge variant="destructive" className="mx-auto text-xs px-3 py-1 font-semibold">
            Giao dịch không thành công
          </Badge>
          <CardTitle className="text-xl font-bold mt-2 text-foreground">Thanh toán thất bại</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">{failure.reason}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 px-6 sm:px-8 pb-8">
          <FailureDetails failure={failure} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <Button type="button" onClick={onNewTransfer}
              className="h-10 text-xs font-semibold gap-1.5 cursor-pointer">
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Chuyển tiền mới</span>
            </Button>
            <Button type="button" variant="outline" onClick={onViewHistory}
              className="h-10 text-xs font-semibold gap-1.5 cursor-pointer">
              <span>Xem lịch sử ví</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
