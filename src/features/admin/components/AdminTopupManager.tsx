import { useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  ExternalLink,
  RefreshCw,
  Search,
  ShieldCheck,
  XCircle
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { QueryBoundary } from '@/components/common/QueryBoundary'
import { errorCode, errorMessage } from '@/lib/apiResponse'
import { formatDateTime, formatNumber, formatVnd, toBigIntSafe } from '@/lib/format'
import { useAdminTopups, useApproveTopup, useRejectTopup } from '../api/admin.queries'
import { topupRejectSchema } from '../schemas/admin.schema'
import type { AdminTopup, AdminTopupStatus } from '../types/admin.types'

const STATUS_LABELS: Record<AdminTopupStatus, string> = {
  PENDING: 'Chờ thanh toán',
  PROCESSING: 'Đang xử lý',
  APPROVED: 'Thành công',
  REJECTED: 'Đã từ chối',
  EXPIRED: 'Hết hạn',
  FAILED: 'Thất bại'
}

const statusBadge = (status: AdminTopupStatus) => {
  if (status === 'APPROVED')
    return (
      <Badge className="border-none bg-emerald-500/15 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
        THÀNH CÔNG
      </Badge>
    )
  if (status === 'REJECTED' || status === 'FAILED')
    return (
      <Badge className="border-none bg-destructive/15 text-[10px] font-bold text-destructive">
        {STATUS_LABELS[status].toUpperCase()}
      </Badge>
    )
  if (status === 'PROCESSING')
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 px-2.5 py-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-400">
        ĐANG XỬ LÝ
      </span>
    )
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
      {STATUS_LABELS[status].toUpperCase()}
    </span>
  )
}

const actionError = (error: unknown) => {
  if (errorCode(error) === 'NOT_ALLOWED')
    return 'Thao tác duyệt/từ chối thủ công đã bị tắt cho tích hợp VNPAY. Lệnh nạp được xử lý tự động qua IPN.'
  return errorMessage(error)
}

export function AdminTopupManager() {
  const [status, setStatus] = useState<AdminTopupStatus | ''>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selected, setSelected] = useState<AdminTopup | null>(null)
  const [rejectMode, setRejectMode] = useState(false)
  const [reason, setReason] = useState('')
  const [actionErrorText, setActionErrorText] = useState('')

  const topups = useAdminTopups(status || undefined)
  const approve = useApproveTopup()
  const reject = useRejectTopup()
  const submitting = approve.isPending || reject.isPending

  const rows = (topups.data ?? []).filter((item) => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return true
    return [item.code, item.userId, item.vnpTransactionNo, item.vnpBankCode]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query))
  })

  const totalAmount = rows.reduce((sum, item) => sum + toBigIntSafe(item.amount), 0n)
  const pendingCount = (topups.data ?? []).filter(
    (item) => item.status === 'PENDING' || item.status === 'PROCESSING'
  ).length

  const closeDialog = () => {
    setSelected(null)
    setRejectMode(false)
    setReason('')
    setActionErrorText('')
  }

  const handleApprove = async (item: AdminTopup) => {
    setActionErrorText('')
    try {
      await approve.mutateAsync(item.id)
      toast.success('Đã gửi yêu cầu duyệt lệnh nạp tiền.')
      closeDialog()
    } catch (error) {
      setActionErrorText(actionError(error))
    }
  }

  const handleReject = async (item: AdminTopup) => {
    const parsed = topupRejectSchema.safeParse({ reason })
    if (!parsed.success) {
      setActionErrorText(parsed.error.issues[0]?.message ?? 'Dữ liệu chưa hợp lệ.')
      return
    }
    setActionErrorText('')
    try {
      await reject.mutateAsync({ id: item.id, reason: parsed.data.reason })
      toast.success('Đã gửi yêu cầu từ chối lệnh nạp tiền.')
      closeDialog()
    } catch (error) {
      setActionErrorText(actionError(error))
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <Badge className="gap-1 border-none bg-primary font-bold text-primary-foreground hover:bg-primary/90">
              <CreditCard className="size-3.5" />
              GATEWAY RECONCILIATION
            </Badge>
            <Badge className="gap-1 border-none bg-emerald-500/15 font-semibold text-emerald-700 dark:text-emerald-400">
              <ShieldCheck className="size-3.5" />
              VNPAY IPN
            </Badge>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            Quản lý Giao dịch Nạp tiền & Tra soát
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
            Đối chiếu lệnh nạp vào ví với mã tham chiếu VNPAY do payment-service ghi nhận.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => void topups.refetch()}
          disabled={topups.isFetching}
          className="h-10 gap-1.5 text-xs font-semibold"
        >
          <RefreshCw className={`size-4 ${topups.isFetching ? 'animate-spin' : ''}`} />
          Làm mới danh sách
        </Button>
      </div>

      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
        Backend đang tắt duyệt/từ chối thủ công cho tích hợp VNPAY; lệnh nạp được cộng tiền tự động
        qua IPN. Nút thao tác bên dưới vẫn gọi đúng endpoint và hiển thị lỗi trả về từ backend.
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border shadow-xs">
          <CardContent className="p-5">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Tổng tiền các lệnh hiển thị</span>
              <div className="rounded-xl bg-primary/10 p-2 text-primary">
                <DollarSign className="size-4" />
              </div>
            </div>
            <div className="text-xl font-extrabold tracking-tight text-foreground">
              {formatVnd(totalAmount)}
            </div>
            <p className="mt-3 border-t border-border/60 pt-3 text-xs text-muted-foreground">
              {formatNumber(rows.length)} lệnh
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs">
          <CardContent className="p-5">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Tổng số lệnh từ backend</span>
              <div className="rounded-xl bg-blue-500/10 p-2 text-blue-600 dark:text-blue-400">
                <CreditCard className="size-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold tracking-tight text-foreground">
              {formatNumber(topups.data?.length ?? 0)}
            </div>
            <p className="mt-3 border-t border-border/60 pt-3 text-xs text-muted-foreground">
              Theo bộ lọc trạng thái hiện tại
            </p>
          </CardContent>
        </Card>

        <Card className="border-border bg-amber-500/5 shadow-xs">
          <CardContent className="p-5">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-bold text-amber-700 dark:text-amber-400">Lệnh chưa hoàn tất</span>
              <div className="rounded-xl bg-amber-500/15 p-2 text-amber-600 dark:text-amber-400">
                <Clock className="size-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold tracking-tight text-amber-700 dark:text-amber-400">
              {formatNumber(pendingCount)}
            </div>
            <p className="mt-3 border-t border-amber-500/20 pt-3 text-xs text-muted-foreground">
              PENDING hoặc PROCESSING
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs">
          <CardContent className="p-5">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Lệnh thành công</span>
              <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold tracking-tight text-foreground">
              {formatNumber((topups.data ?? []).filter((item) => item.status === 'APPROVED').length)}
            </div>
            <p className="mt-3 border-t border-border/60 pt-3 text-xs text-muted-foreground">
              Đã cộng tiền vào ví
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col justify-between gap-3 rounded-2xl border border-border bg-muted/50 p-1.5 sm:flex-row sm:items-center">
        <div className="flex items-center gap-1 overflow-x-auto p-0.5">
          <Button
            type="button"
            size="sm"
            variant={status === '' ? 'default' : 'ghost'}
            onClick={() => setStatus('')}
            className="h-8 rounded-xl text-xs font-semibold"
          >
            Tất cả
          </Button>
          {(['PENDING', 'PROCESSING', 'APPROVED', 'REJECTED', 'EXPIRED', 'FAILED'] as const).map(
            (value) => (
              <Button
                key={value}
                type="button"
                size="sm"
                variant={status === value ? 'default' : 'ghost'}
                onClick={() => setStatus(value)}
                className="h-8 rounded-xl text-xs font-semibold"
              >
                {STATUS_LABELS[value]}
              </Button>
            )
          )}
        </div>

        <div className="relative w-full px-1 sm:w-80">
          <Search className="absolute left-3.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Tìm theo mã GD, userId, VNPAY Ref..."
            className="h-9 pl-9 text-xs"
          />
        </div>
      </div>

      <Card className="overflow-hidden border-border shadow-xs">
        <CardHeader className="border-b border-border/60 bg-muted/30 pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold text-foreground">
              Nhật ký giao dịch nạp tiền
            </CardTitle>
            <Badge variant="outline" className="border-primary/30 font-mono text-xs font-semibold text-primary">
              {rows.length} giao dịch
            </Badge>
          </div>
          <CardDescription className="text-xs">
            Dữ liệu lấy từ payment-service qua Gateway, sắp xếp mới nhất trước.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          <QueryBoundary
            query={topups}
            skeleton={
              <div className="space-y-2 p-4" role="status">
                {[0, 1, 2].map((item) => (
                  <div key={item} className="h-12 animate-pulse rounded-xl bg-muted/60" />
                ))}
              </div>
            }
            isEmpty={(data) => data.length === 0}
            emptyFallback={
              <p className="p-10 text-center text-xs text-muted-foreground">
                Không có lệnh nạp tiền nào khớp bộ lọc hiện tại.
              </p>
            }
          >
            {() => (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="border-b border-border/60 bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        <th className="px-4 py-3">Mã GD / Thời gian</th>
                        <th className="px-4 py-3">Người dùng</th>
                        <th className="px-4 py-3">VNPAY Ref</th>
                        <th className="px-4 py-3 text-right">Số tiền</th>
                        <th className="px-4 py-3 text-center">Trạng thái</th>
                        <th className="px-4 py-3 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60 font-medium">
                      {rows.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                            Không có giao dịch khớp từ khóa tìm kiếm.
                          </td>
                        </tr>
                      ) : (
                        rows.map((item) => (
                          <tr key={item.id} className="transition-colors hover:bg-muted/40">
                            <td className="px-4 py-3.5 font-mono font-semibold text-foreground">
                              <div>{item.code}</div>
                              <span className="text-[11px] font-normal text-muted-foreground">
                                {formatDateTime(item.createdAt)}
                              </span>
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="font-mono text-[11px] text-foreground">{item.userId}</div>
                              <div className="text-[11px] text-muted-foreground">
                                Hết hạn {formatDateTime(item.expiresAt)}
                              </div>
                            </td>
                            <td className="px-4 py-3.5 font-mono">
                              <div className="text-foreground">{item.vnpTransactionNo ?? '—'}</div>
                              <div className="text-[11px] text-muted-foreground">
                                {item.vnpBankCode ?? 'Chưa có ngân hàng'}
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-right">
                              <span className="font-mono text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                +{formatVnd(item.amount)}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-center">{statusBadge(item.status)}</td>
                            <td className="px-4 py-3.5 text-right">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelected(item)
                                  setRejectMode(false)
                                  setReason('')
                                  setActionErrorText('')
                                }}
                                className="h-8 gap-1 text-xs font-semibold"
                              >
                                <ExternalLink className="size-3.5" />
                                Chi tiết
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="flex items-center justify-between border-t border-border/60 bg-muted/30 p-4 text-xs text-muted-foreground">
                  <span>Hệ thống ghi log toàn bộ chu kỳ phản hồi IPN từ VNPAY.</span>
                  <span className="font-mono font-bold text-primary">{rows.length} giao dịch</span>
                </div>
              </>
            )}
          </QueryBoundary>
        </CardContent>
      </Card>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-lg p-6">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="text-base font-bold text-foreground sm:text-lg">
              Tra soát giao dịch nạp tiền VNPAY
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Thông tin do payment-service trả về; không hiển thị dữ liệu nhạy cảm ngoài phạm vi cần thiết.
            </DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="space-y-4 pt-2 text-xs">
              <div className="space-y-2.5 rounded-2xl border border-border bg-muted/50 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Mã GD FinVault:</span>
                  <span className="font-mono font-bold text-foreground">{selected.code}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">userId:</span>
                  <span className="font-mono font-semibold text-foreground">{selected.userId}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Số tiền yêu cầu nạp:</span>
                  <strong className="font-mono text-sm text-emerald-600 dark:text-emerald-400">
                    {formatVnd(selected.amount)}
                  </strong>
                </div>
                <div className="flex items-center justify-between border-t border-border/60 pt-2">
                  <span className="text-muted-foreground">VNPAY TransactionNo:</span>
                  <span className="font-mono font-semibold text-foreground">
                    {selected.vnpTransactionNo ?? '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Ngân hàng:</span>
                  <span className="font-semibold text-foreground">{selected.vnpBankCode ?? '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Mã phản hồi:</span>
                  <span className="font-mono font-bold text-primary">
                    {selected.vnpResponseCode ?? '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Trạng thái:</span>
                  {statusBadge(selected.status)}
                </div>
                {selected.rejectReason && (
                  <div className="flex items-start justify-between gap-4 border-t border-border/60 pt-2">
                    <span className="text-muted-foreground">Lý do từ chối:</span>
                    <span className="text-right text-foreground">{selected.rejectReason}</span>
                  </div>
                )}
              </div>

              {actionErrorText && (
                <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-destructive">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <p role="alert">{actionErrorText}</p>
                </div>
              )}

              {rejectMode ? (
                <form
                  className="space-y-2"
                  onSubmit={(event) => {
                    event.preventDefault()
                    void handleReject(selected)
                  }}
                >
                  <Label htmlFor="topup-reject-reason" className="text-xs">
                    Lý do từ chối (bắt buộc, 1 đến 500 ký tự)
                  </Label>
                  <Input
                    id="topup-reject-reason"
                    value={reason}
                    maxLength={500}
                    disabled={submitting}
                    onChange={(event) => setReason(event.target.value)}
                    placeholder="Nhập lý do từ chối lệnh nạp"
                  />
                  <div className="flex gap-2 pt-1">
                    <Button
                      type="submit"
                      size="sm"
                      variant="destructive"
                      disabled={submitting}
                      className="text-xs font-semibold"
                    >
                      {submitting ? 'Đang gửi…' : 'Xác nhận từ chối'}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={submitting}
                      onClick={() => {
                        setRejectMode(false)
                        setActionErrorText('')
                      }}
                      className="text-xs font-semibold"
                    >
                      Hủy
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-col gap-2 pt-1 sm:flex-row">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeDialog}
                    className="h-10 flex-1 text-xs font-semibold"
                  >
                    Đóng
                  </Button>
                  {(selected.status === 'PENDING' || selected.status === 'PROCESSING') && (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={submitting}
                        onClick={() => {
                          setRejectMode(true)
                          setActionErrorText('')
                        }}
                        className="h-10 flex-1 gap-1.5 text-xs font-semibold text-destructive"
                      >
                        <XCircle className="size-4" />
                        Từ chối
                      </Button>
                      <Button
                        type="button"
                        disabled={submitting}
                        onClick={() => void handleApprove(selected)}
                        className="h-10 flex-1 gap-1.5 text-xs font-bold"
                      >
                        <CheckCircle2 className="size-4" />
                        {submitting ? 'Đang gửi…' : 'Duyệt lệnh'}
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
