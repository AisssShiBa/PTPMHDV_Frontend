import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, Clock, Lock, Receipt, RefreshCw, RotateCcw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { addMoney, compareMoney, formatVnd } from '@/lib/format'
import type { P2pQuoteResult } from '../types/payment.types'

export type TransferQuoteProgress =
  | { phase: 'checkout'; message: string }
  | { phase: 'confirm'; message: string | null; isPolling: boolean }

export interface TransferQuoteReviewProps {
  quote: P2pQuoteResult
  countdown: number
  details: {
    recipientName: string
    recipientQuery: string
    availableBalance: string
    message: string
  }
  activity: {
    isCheckingOut: boolean
    isConfirming: boolean
    isQuoting: boolean
    hasCheckoutPayment: boolean
    hasUnresolvedCheckout: boolean
    confirmationLocked: boolean
  }
  progress: TransferQuoteProgress | null
  onRefreshQuote: () => void
  onCheckout: () => void
  onCheckStatus: () => void
  onBack: () => void
}

function QuoteTimer({ countdown }: Pick<TransferQuoteReviewProps, 'countdown'>) {
  return (
    <div className="pt-3 flex items-center justify-center">
      {countdown > 0 ? (
        <Badge variant="outline" className="px-3 py-1 gap-1.5 text-xs font-semibold border-amber-500/30 text-amber-600 bg-amber-500/10">
          <Clock className="h-3.5 w-3.5 text-amber-500 animate-spin" />
          <span>Báo giá có hiệu lực trong: {countdown} giây</span>
        </Badge>
      ) : (
        <Badge variant="destructive" className="px-3 py-1 gap-1.5 text-xs font-semibold">
          <AlertTriangle className="h-3.5 w-3.5" /><span>Báo giá đã hết hạn</span>
        </Badge>
      )}
    </div>
  )
}

function QuoteDetails({ quote, details }: Pick<TransferQuoteReviewProps, 'quote' | 'details'>) {
  return (
    <div className="space-y-3 rounded-xl border border-border p-4 bg-card text-sm">
      <div className="flex justify-between items-center text-xs sm:text-sm">
        <span className="text-muted-foreground">Người nhận</span>
        <div className="text-right"><span className="font-bold text-foreground block">{details.recipientName}</span>
          <span className="text-xs text-muted-foreground font-mono">{details.recipientQuery}</span></div>
      </div>
      <div className="border-t border-border/60 pt-2.5 flex justify-between items-center text-xs sm:text-sm">
        <span className="text-muted-foreground">Nguồn tiền</span>
        <span className="font-medium text-foreground">Số dư ví FinVault ({formatVnd(details.availableBalance)})</span>
      </div>
      <div className="border-t border-border/60 pt-2.5 flex justify-between items-center text-xs sm:text-sm">
        <span className="text-muted-foreground">Lời nhắn</span>
        <span className="font-medium text-foreground text-right">{details.message || 'Chuyển tiền FinVault'}</span>
      </div>
      <div className="border-t border-border/60 pt-2.5 flex justify-between items-center text-xs sm:text-sm">
        <span className="font-semibold text-foreground">Tổng trừ ví</span>
        <span className="text-base font-bold text-primary">{formatVnd(addMoney(quote.amount, quote.fee))}</span>
      </div>
    </div>
  )
}

function QuoteProgress({ progress, activity, onCheckout, onCheckStatus }:
  Pick<TransferQuoteReviewProps, 'progress' | 'activity' | 'onCheckout' | 'onCheckStatus'>) {
  if (!progress) return null
  const polling = progress.phase === 'confirm' && progress.isPolling
  const title = progress.phase === 'checkout' ? 'Đang xử lý, vui lòng không thực hiện lại'
    : polling ? 'Đang kiểm tra kết quả giao dịch...' : 'Giao dịch đang xử lý'
  return (
    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 space-y-3 animate-in fade-in-50 duration-200">
      <div className="flex items-start gap-2.5">
        {polling ? <RefreshCw className="h-5 w-5 text-amber-600 animate-spin shrink-0 mt-0.5" />
          : <Clock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />}
        <div><p className="font-bold text-sm">{title}</p><p className="text-xs text-amber-700 mt-1 leading-relaxed">{progress.message}</p></div>
      </div>
      <div className="flex items-center gap-2 pt-1">
        {progress.phase === 'checkout' && (
          <Button type="button" size="sm" onClick={onCheckout} disabled={activity.isCheckingOut} className="h-8 text-xs font-semibold gap-1.5 cursor-pointer">
            <RotateCcw className="h-3.5 w-3.5" /><span>{activity.isCheckingOut ? 'Đang thử lại...' : 'Thử lại'}</span>
          </Button>
        )}
        {progress.phase === 'confirm' && !polling && <>
          <Button type="button" size="sm" onClick={onCheckStatus} disabled={activity.isConfirming} className="h-8 text-xs font-semibold gap-1.5 cursor-pointer">
            <RefreshCw className="h-3.5 w-3.5" /><span>Kiểm tra lại</span>
          </Button>
          <Button asChild variant="outline" size="sm" className="h-8 text-xs font-semibold border-amber-300 hover:bg-amber-100">
            <Link to="/app/transactions">Xem Lịch sử giao dịch</Link>
          </Button>
        </>}
      </div>
    </div>
  )
}

function QuoteActions({ activity, countdown, onBack, onCheckout }:
  Pick<TransferQuoteReviewProps, 'activity' | 'countdown' | 'onBack' | 'onCheckout'>) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
      <Button type="button" variant="outline" onClick={onBack}
        disabled={activity.hasUnresolvedCheckout || activity.confirmationLocked} className="h-11 font-semibold gap-2 cursor-pointer">
        <ArrowLeft className="h-4 w-4" /><span>Quay lại sửa</span>
      </Button>
      <Button type="button" onClick={onCheckout}
        disabled={activity.isCheckingOut || activity.confirmationLocked || (!activity.hasCheckoutPayment && countdown <= 0)}
        className="h-11 font-semibold gap-2 shadow-sm cursor-pointer">
        <Lock className="h-4 w-4" />
        <span>{activity.isCheckingOut ? 'Đang tạo phiên...' : activity.isConfirming ? 'Đang xác nhận...' : 'Xác nhận chuyển tiền'}</span>
      </Button>
    </div>
  )
}

export function TransferQuoteReview(props: TransferQuoteReviewProps) {
  const { quote, countdown, details, activity, onRefreshQuote } = props
  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in-50 duration-200">
      <Card className="border-border shadow-md">
        <CardHeader className="text-center pb-4 border-b border-border">
          <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-2"><Receipt className="h-6 w-6" /></div>
          <CardTitle className="text-xl font-bold">Xác nhận báo giá chuyển tiền</CardTitle>
          <CardDescription className="text-xs">Vui lòng kiểm tra kỹ thông tin người nhận và số tiền trước khi thực hiện bước xác thực</CardDescription>
          <QuoteTimer countdown={countdown} />
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 text-center">
            <span className="text-xs text-muted-foreground">Số tiền chuyển</span>
            <div className="text-3xl font-extrabold text-primary mt-1">{formatVnd(quote.amount)}</div>
            <Badge variant="outline" className="mt-2 text-xs text-emerald-600 border-emerald-500/30">
              Phí giao dịch: {formatVnd(quote.fee)}{compareMoney(quote.fee, '0') === 0 ? ' (Miễn phí)' : ''}
            </Badge>
          </div>
          <QuoteDetails quote={quote} details={details} />
          {countdown <= 0 && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 flex items-center justify-between">
              <span>Báo giá đã hết hạn. Lấy báo giá mới khi cần tạo đơn; đơn đã tạo vẫn được kiểm tra theo mã giao dịch cũ.</span>
              <Button type="button" size="sm" onClick={onRefreshQuote} disabled={activity.isQuoting || activity.confirmationLocked} className="h-7 text-xs font-semibold ml-2">
                <RefreshCw className="h-3 w-3 mr-1" /> Lấy báo giá mới
              </Button>
            </div>
          )}
          <QuoteProgress progress={props.progress} activity={activity} onCheckout={props.onCheckout} onCheckStatus={props.onCheckStatus} />
          <QuoteActions activity={activity} countdown={countdown} onBack={props.onBack} onCheckout={props.onCheckout} />
        </CardContent>
      </Card>
    </div>
  )
}
