import { useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  FileCheck,
  RefreshCw,
  Scale,
  Shield,
  Wallet
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { QueryBoundary } from '@/components/common/QueryBoundary'
import { formatDateTime, formatNumber, formatVnd, parseVndToBigInt } from '@/lib/format'
import {
  reconciliationKeys,
  useReconciliationReport,
  useReconciliationReports,
  useRunReconciliation
} from '../queries'
import { reconciliationErrorMessage } from '../messages'
import {
  ANOMALY_LABELS,
  anomalyLabel,
  type AdjustAnomalyResult,
  type ReconciliationAnomaly,
  type ReconciliationReport,
  type ReconciliationRunMode
} from '../types'
import { AdjustAnomalyDialog } from './AdjustAnomalyDialog'

const PAGE_SIZE = 10

const balanceDifference = (report: ReconciliationReport | undefined): string | null => {
  const expected = report?.systemBalanceExpected
  const actual = report?.systemBalanceActual
  if (expected === undefined || actual === undefined) return null
  try {
    const diff = parseVndToBigInt(expected) - parseVndToBigInt(actual)
    if (diff === 0n) return formatVnd(0n)
    return diff > 0n ? `+${formatVnd(diff)}` : `-${formatVnd(-diff)}`
  } catch {
    return null
  }
}

const describeDetail = (detail: unknown): string | null => {
  if (detail === null || detail === undefined) return null
  if (typeof detail === 'string') return detail
  try {
    const text = JSON.stringify(detail)
    if (!text || text === '{}') return null
    return text.length > 240 ? `${text.slice(0, 240)}…` : text
  } catch {
    return null
  }
}

const anomalyBadgeClass = (type: string): string => {
  if (type === 'NEGATIVE_BALANCE') return 'bg-destructive/15 text-destructive'
  if (type === 'TRANSACTION_UNBALANCED') return 'bg-blue-500/15 text-blue-700 dark:text-blue-400'
  if (type.startsWith('BALANCE_DRIFT')) return 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
  return 'bg-muted text-muted-foreground'
}

export function AdminReconciliation() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [adjusting, setAdjusting] = useState<ReconciliationAnomaly | null>(null)

  const reports = useReconciliationReports(page, PAGE_SIZE)
  const detail = useReconciliationReport(selectedId)
  const run = useRunReconciliation()

  const activeReport = detail.data
  const difference = useMemo(() => balanceDifference(activeReport), [activeReport])
  const anomalies = activeReport?.anomalies ?? []
  const totalPages = reports.data
    ? Math.max(1, Math.ceil(reports.data.total / reports.data.limit))
    : 1

  const handleRun = async (mode: ReconciliationRunMode) => {
    setNotice(null)
    try {
      const report = await run.mutateAsync(mode)
      setSelectedId(report.id)
      toast.success('Hoàn tất đối soát.', {
        description: report.isBalanced
          ? 'Hệ thống cân đối, không phát hiện sai lệch.'
          : `Phát hiện ${report.anomaliesFound ?? report.anomalies.length} bất thường cần xử lý.`
      })
    } catch (error) {
      setNotice(reconciliationErrorMessage(error))
    }
  }

  const handleResolved = (result: AdjustAnomalyResult) => {
    setAdjusting(null)
    setNotice(null)
    toast.success(
      result.replayed
        ? 'Điều chỉnh đã được ghi nhận trước đó, không tạo bút toán trùng.'
        : 'Đã tạo bút toán điều chỉnh và ghi nhật ký kiểm toán.'
    )
  }

  const handleConflict = (message: string, refresh: boolean) => {
    setAdjusting(null)
    setNotice(message)
    if (refresh) void queryClient.invalidateQueries({ queryKey: reconciliationKeys.all })
  }

  const reloadReport = () => {
    setNotice(null)
    void detail.refetch()
    void reports.refetch()
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <Badge className="gap-1 border-none bg-primary font-bold text-primary-foreground">
              <Scale className="size-3.5" />
              FINANCIAL RECONCILIATION
            </Badge>
            <Badge
              className={`gap-1 border-none font-semibold ${
                activeReport?.isBalanced === false
                  ? 'bg-destructive/15 text-destructive'
                  : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
              }`}
            >
              <span className="size-1.5 rounded-full bg-current" />
              {activeReport
                ? activeReport.isBalanced
                  ? 'Báo cáo đang cân đối'
                  : 'Báo cáo có sai lệch'
                : 'Chưa chọn báo cáo'}
            </Badge>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            Đối soát Tài chính &amp; Cân đối Số dư Sổ cái
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
            Chạy đối soát nhanh hoặc đầy đủ, xem báo cáo và điều chỉnh bất thường. Mọi điều chỉnh
            đều ghi nhật ký kiểm toán.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={run.isPending}
            onClick={() => void handleRun('quick')}
            className="h-11 gap-2 rounded-xl px-4 text-xs font-bold sm:text-sm"
          >
            <RefreshCw className={`size-4 ${run.isPending ? 'animate-spin' : ''}`} />
            {run.isPending && run.variables === 'quick' ? 'Đang chạy nhanh…' : 'Chạy đối soát nhanh'}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={run.isPending}
            onClick={() => void handleRun('full')}
            className="h-11 gap-2 rounded-xl px-4 text-xs font-bold sm:text-sm"
          >
            <Shield className="size-4" />
            {run.isPending && run.variables === 'full' ? 'Đang chạy đầy đủ…' : 'Chạy đối soát đầy đủ'}
          </Button>
        </div>
      </div>

      {notice && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300 sm:flex-row sm:items-center sm:justify-between"
        >
          <span className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            {notice}
          </span>
          <Button type="button" size="sm" variant="outline" onClick={reloadReport}>
            Tải lại báo cáo
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border shadow-xs">
          <CardContent className="p-5">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Số ví đã kiểm tra</span>
              <Wallet className="size-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold tracking-tight text-foreground">
              {activeReport?.totalWallets === undefined ? '—' : formatNumber(activeReport.totalWallets)}{' '}
              <span className="text-sm font-normal text-muted-foreground">ví</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-amber-500/5 shadow-xs">
          <CardContent className="p-5">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
                Bất thường cần xử lý
              </span>
              <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="text-2xl font-extrabold tracking-tight text-amber-600 dark:text-amber-400">
              {activeReport ? formatNumber(activeReport.anomaliesFound ?? anomalies.length) : '—'}{' '}
              <span className="text-sm font-normal text-muted-foreground">sự vụ</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs">
          <CardContent className="p-5">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Lần chạy gần nhất</span>
              <Clock className="size-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="font-mono text-sm font-bold text-foreground">
              {activeReport?.runAt ? formatDateTime(activeReport.runAt) : '—'}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-xs">
          <CardContent className="p-5">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Chênh lệch số dư</span>
              <DollarSign className="size-4 text-primary" />
            </div>
            <div className="font-mono text-lg font-extrabold tracking-tight text-foreground">
              {difference ?? '—'}
            </div>
            {activeReport && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                Kỳ vọng {activeReport.systemBalanceExpected ? formatVnd(activeReport.systemBalanceExpected) : '—'}
                {' · '}Thực tế{' '}
                {activeReport.systemBalanceActual ? formatVnd(activeReport.systemBalanceActual) : '—'}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <Card className="overflow-hidden border-border shadow-xs lg:col-span-5">
          <CardHeader className="border-b border-border/60 bg-muted/30 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-foreground">Lịch sử báo cáo</CardTitle>
                <CardDescription className="text-xs">
                  Chọn một báo cáo để xem chi tiết và xử lý bất thường
                </CardDescription>
              </div>
              <Badge variant="outline" className="font-mono text-xs">
                Trang {page}/{totalPages}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <QueryBoundary
              query={reports}
              skeleton={
                <div className="space-y-2 p-3" role="status">
                  {[0, 1, 2].map((item) => (
                    <div key={item} className="h-16 animate-pulse rounded-xl bg-muted/60" />
                  ))}
                </div>
              }
              isEmpty={(data) => data.items.length === 0}
              emptyFallback={
                <p className="p-8 text-center text-xs text-muted-foreground">
                  Chưa có báo cáo đối soát nào. Hãy chạy đối soát nhanh hoặc đầy đủ.
                </p>
              }
            >
              {(data) => (
                <div className="divide-y divide-border/60">
                  {data.items.map((report) => {
                    const isSelected = report.id === selectedId
                    return (
                      <button
                        key={report.id}
                        type="button"
                        onClick={() => {
                          setSelectedId(report.id)
                          setNotice(null)
                        }}
                        className={`flex w-full items-center justify-between gap-3 p-3.5 text-left transition-all ${
                          isSelected ? 'border-l-4 border-primary bg-primary/10' : 'hover:bg-muted/40'
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="font-mono text-xs font-bold text-foreground">
                            Báo cáo #{report.id}
                          </p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {report.runAt ? formatDateTime(report.runAt) : 'Không rõ thời điểm'} ·{' '}
                            {formatNumber(report.anomaliesFound ?? report.anomalies.length)} bất thường
                          </p>
                        </div>
                        <Badge
                          className={`shrink-0 border-none text-[10px] font-bold ${
                            report.isBalanced
                              ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                              : 'bg-destructive/15 text-destructive'
                          }`}
                        >
                          {report.isBalanced ? 'CÂN ĐỐI' : 'SAI LỆCH'}
                        </Badge>
                      </button>
                    )
                  })}
                </div>
              )}
            </QueryBoundary>
          </CardContent>
          <div className="flex items-center justify-between border-t border-border/60 bg-muted/30 p-3 text-xs">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1 || reports.isFetching}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="h-8 text-xs"
            >
              Trang trước
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= totalPages || reports.isFetching}
              onClick={() => setPage((current) => current + 1)}
              className="h-8 text-xs"
            >
              Trang sau
            </Button>
          </div>
        </Card>

        <Card className="overflow-hidden border-border shadow-xs lg:col-span-7">
          {selectedId === null ? (
            <CardContent className="p-10 text-center text-sm text-muted-foreground">
              Chọn một báo cáo trong lịch sử hoặc chạy đối soát để xem bất thường.
            </CardContent>
          ) : (
            <QueryBoundary
              query={detail}
              skeleton={
                <div className="space-y-3 p-4" role="status">
                  {[0, 1, 2].map((item) => (
                    <div key={item} className="h-20 animate-pulse rounded-xl bg-muted/60" />
                  ))}
                </div>
              }
            >
              {(report) => (
                <>
                  <CardHeader className="border-b border-border/60 bg-muted/30 pb-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <CardTitle className="text-base font-bold text-foreground">
                          Báo cáo #{report.id}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {report.runAt ? formatDateTime(report.runAt) : 'Không rõ thời điểm chạy'} ·{' '}
                          {formatNumber(report.totalWallets ?? 0)} ví ·{' '}
                          {formatNumber(report.anomaliesFound ?? report.anomalies.length)} bất thường
                        </CardDescription>
                      </div>
                      <Badge
                        className={`border-none text-[10px] font-bold ${
                          report.isBalanced
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                            : 'bg-destructive/15 text-destructive'
                        }`}
                      >
                        {report.isBalanced ? 'CÂN ĐỐI' : 'SAI LỆCH'}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="divide-y divide-border/60 p-0">
                    {anomalies.length === 0 ? (
                      <div className="flex flex-col items-center gap-2 p-10 text-center">
                        <CheckCircle2 className="size-8 text-emerald-500" />
                        <p className="text-sm font-semibold text-foreground">
                          Không phát hiện bất thường trong báo cáo này.
                        </p>
                      </div>
                    ) : (
                      anomalies.map((anomaly) => (
                        <div
                          key={anomaly.id}
                          className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center"
                        >
                          <div className="min-w-0 space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge
                                className={`border-none font-mono text-[10px] font-bold ${anomalyBadgeClass(anomaly.type)}`}
                              >
                                {anomalyLabel(anomaly.type)}
                              </Badge>
                              <span className="font-mono text-[10px] text-muted-foreground">
                                #{anomaly.id}
                              </span>
                              {anomaly.type && !(anomaly.type in ANOMALY_LABELS) && (
                                <span className="font-mono text-[10px] text-muted-foreground">
                                  ({anomaly.type})
                                </span>
                              )}
                            </div>
                            <p className="text-xs font-semibold text-foreground">
                              Ví {anomaly.walletId ?? '—'}
                              {anomaly.transactionId ? ` · Giao dịch ${anomaly.transactionId}` : ''}
                            </p>
                            {describeDetail(anomaly.detail) && (
                              <p className="break-all font-mono text-[11px] text-muted-foreground">
                                {describeDetail(anomaly.detail)}
                              </p>
                            )}
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setNotice(null)
                              setAdjusting(anomaly)
                            }}
                            className="h-9 shrink-0 gap-1.5 text-xs font-semibold"
                          >
                            <FileCheck className="size-3.5" />
                            Điều chỉnh
                          </Button>
                        </div>
                      ))
                    )}
                    <div className="flex items-center gap-2 bg-muted/40 p-4 text-xs text-muted-foreground">
                      <Shield className="size-4 shrink-0 text-primary" />
                      <span>
                        Bút toán điều chỉnh do Kiểm soát viên ký duyệt và được lưu vết độc lập phục vụ
                        kiểm toán tài chính.
                      </span>
                    </div>
                  </CardContent>
                </>
              )}
            </QueryBoundary>
          )}
        </Card>
      </div>

      {adjusting && (
        <AdjustAnomalyDialog
          key={adjusting.id}
          anomaly={adjusting}
          onClose={() => setAdjusting(null)}
          onResolved={handleResolved}
          onConflict={handleConflict}
        />
      )}
    </div>
  )
}
