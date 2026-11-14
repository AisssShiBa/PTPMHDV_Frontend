import { Link } from 'react-router-dom'
import {
  Activity,
  ChevronRight,
  CreditCard,
  RefreshCw,
  Scale,
  ShieldCheck,
  Store,
  UserCheck,
  Users
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { QueryBoundary } from '@/components/common/QueryBoundary'
import { formatDateTime, formatNumber } from '@/lib/format'
import { useAdminDashboard } from '../api/admin.queries'

const ACTION_LABELS: Record<string, string> = {
  APPROVE_KYC: 'Duyệt hồ sơ KYC',
  REJECT_KYC: 'Từ chối hồ sơ KYC',
  UPDATE_KYC_TIER: 'Đổi cấp KYC',
  VIEW_KYC_DOCUMENTS: 'Xem ảnh CCCD',
  APPROVE_MERCHANT: 'Duyệt Merchant',
  REJECT_MERCHANT: 'Từ chối Merchant',
  RUN_RECONCILIATION: 'Chạy đối soát',
  ADJUST_ANOMALY: 'Điều chỉnh anomaly'
}

const actionLabel = (action: string) => ACTION_LABELS[action] ?? action

export function AdminDashboard() {
  const dashboard = useAdminDashboard()

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <Badge className="border-none bg-destructive font-bold text-destructive-foreground hover:bg-destructive/90">
              FINVAULT OPERATIONS
            </Badge>
            <Badge className="gap-1 border-none bg-emerald-500/15 font-semibold text-emerald-700 dark:text-emerald-400">
              <ShieldCheck className="size-3.5" />
              Dữ liệu trực tiếp từ hệ thống
            </Badge>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
            Tổng quan Vận hành & Quản trị
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
            Số liệu người dùng, hồ sơ định danh, đối tác và nhật ký thao tác của quản trị viên.
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => void dashboard.refetch()}
          disabled={dashboard.isFetching}
          className="h-10 gap-1.5 text-xs font-semibold"
        >
          <RefreshCw className={`size-4 ${dashboard.isFetching ? 'animate-spin' : ''}`} />
          Làm mới số liệu
        </Button>
      </div>

      <QueryBoundary
        query={dashboard}
        skeleton={
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" role="status">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="h-32 animate-pulse rounded-2xl border border-border bg-muted/50" />
            ))}
          </div>
        }
      >
        {(stats) => {
          const kycTotal =
            stats.users.kycBreakdown.none +
            stats.users.kycBreakdown.pending +
            stats.users.kycBreakdown.approved +
            stats.users.kycBreakdown.rejected
          const kycRows: Array<{ label: string; value: number; color: string }> = [
            { label: 'Chưa nộp', value: stats.users.kycBreakdown.none, color: 'bg-muted-foreground/50' },
            { label: 'Chờ duyệt', value: stats.users.kycBreakdown.pending, color: 'bg-amber-500' },
            { label: 'Đã duyệt', value: stats.users.kycBreakdown.approved, color: 'bg-emerald-500' },
            { label: 'Từ chối', value: stats.users.kycBreakdown.rejected, color: 'bg-destructive' }
          ]

          return (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="border-border shadow-xs">
                  <CardContent className="p-5">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Tổng người dùng</span>
                      <div className="rounded-xl bg-primary/10 p-2 text-primary">
                        <Users className="size-4" />
                      </div>
                    </div>
                    <div className="text-2xl font-extrabold tracking-tight text-foreground">
                      {formatNumber(stats.users.total)} <span className="text-sm font-normal text-muted-foreground">tài khoản</span>
                    </div>
                    <p className="mt-3 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                      {formatNumber(stats.users.kycBreakdown.approved)} hồ sơ đã xác thực
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-border bg-amber-500/5 shadow-xs">
                  <CardContent className="p-5">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-700 dark:text-amber-400">KYC chờ duyệt</span>
                      <div className="rounded-xl bg-amber-500/15 p-2 text-amber-600 dark:text-amber-400">
                        <UserCheck className="size-4" />
                      </div>
                    </div>
                    <div className="text-2xl font-extrabold tracking-tight text-amber-700 dark:text-amber-400">
                      {formatNumber(stats.users.kycBreakdown.pending)} <span className="text-sm font-normal">hồ sơ</span>
                    </div>
                    <Link
                      to="/admin/kyc"
                      className="mt-3 flex items-center gap-1 border-t border-amber-500/20 pt-3 text-xs font-semibold text-amber-700 hover:underline dark:text-amber-400"
                    >
                      Đi tới hàng đợi <ChevronRight className="size-3.5" />
                    </Link>
                  </CardContent>
                </Card>

                <Card className="border-border shadow-xs">
                  <CardContent className="p-5">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Merchant chờ duyệt</span>
                      <div className="rounded-xl bg-blue-500/10 p-2 text-blue-600 dark:text-blue-400">
                        <Store className="size-4" />
                      </div>
                    </div>
                    <div className="text-2xl font-extrabold tracking-tight text-foreground">
                      {formatNumber(stats.merchants.statusBreakdown.pending)}{' '}
                      <span className="text-sm font-normal text-muted-foreground">đối tác</span>
                    </div>
                    <p className="mt-3 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                      Tổng {formatNumber(stats.merchants.total)} Merchant
                    </p>
                  </CardContent>
                </Card>

                <Card className="border-border shadow-xs">
                  <CardContent className="p-5">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">Thao tác Admin hôm nay</span>
                      <div className="rounded-xl bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
                        <Activity className="size-4" />
                      </div>
                    </div>
                    <div className="text-2xl font-extrabold tracking-tight text-foreground">
                      {formatNumber(stats.audits.todayActionsCount)}{' '}
                      <span className="text-sm font-normal text-muted-foreground">thao tác</span>
                    </div>
                    <p className="mt-3 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                      Tổng {formatNumber(stats.audits.totalLogs)} bản ghi kiểm toán
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Link
                  to="/admin/kyc"
                  className="group flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-xs transition-all hover:border-primary/40"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <UserCheck className="size-5" />
                    </div>
                    <div>
                      <strong className="block text-sm font-bold text-foreground transition-colors group-hover:text-primary">
                        Thẩm định hồ sơ KYC
                      </strong>
                      <span className="text-xs text-muted-foreground">
                        {formatNumber(stats.users.kycBreakdown.pending)} hồ sơ đang chờ
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                </Link>

                <Link
                  to="/admin/reconciliation"
                  className="group flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-xs transition-all hover:border-primary/40"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                      <Scale className="size-5" />
                    </div>
                    <div>
                      <strong className="block text-sm font-bold text-foreground transition-colors group-hover:text-blue-600">
                        Đối soát tài chính
                      </strong>
                      <span className="text-xs text-muted-foreground">Chạy kiểm tra và xem báo cáo</span>
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                </Link>

                <Link
                  to="/admin/topups"
                  className="group flex items-center justify-between rounded-2xl border border-border bg-card p-4 shadow-xs transition-all hover:border-primary/40"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      <CreditCard className="size-5" />
                    </div>
                    <div>
                      <strong className="block text-sm font-bold text-foreground transition-colors group-hover:text-amber-600">
                        Nạp tiền & tra soát
                      </strong>
                      <span className="text-xs text-muted-foreground">Đối chiếu lệnh nạp VNPAY</span>
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                </Link>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
                <Card className="border-border shadow-xs lg:col-span-5">
                  <CardHeader className="border-b border-border/60 pb-3">
                    <CardTitle className="text-base">Phân bổ trạng thái KYC</CardTitle>
                    <CardDescription className="text-xs">
                      Tổng {formatNumber(kycTotal)} hồ sơ người dùng
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-4">
                    {kycRows.map((row) => {
                      const percent = kycTotal > 0 ? Math.round((row.value / kycTotal) * 100) : 0
                      return (
                        <div key={row.label} className="space-y-1.5">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-foreground">{row.label}</span>
                            <span className="font-mono text-muted-foreground">
                              {formatNumber(row.value)} ({percent}%)
                            </span>
                          </div>
                          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                            <div className={`h-full rounded-full ${row.color}`} style={{ width: `${percent}%` }} />
                          </div>
                        </div>
                      )
                    })}
                  </CardContent>
                </Card>

                <Card className="border-border shadow-xs lg:col-span-7">
                  <CardHeader className="border-b border-border/60 pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Activity className="size-5 text-primary" />
                      Nhật ký thao tác gần đây
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Năm bản ghi kiểm toán mới nhất từ cơ sở dữ liệu admin-service
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="divide-y divide-border/60 pt-2">
                    {stats.audits.recentActivities.length === 0 ? (
                      <p className="py-8 text-center text-xs text-muted-foreground">
                        Chưa có thao tác quản trị nào được ghi nhận.
                      </p>
                    ) : (
                      stats.audits.recentActivities.map((activity) => (
                        <div key={activity.id} className="flex items-start justify-between gap-3 py-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground">{actionLabel(activity.action)}</p>
                            <p className="truncate text-[11px] text-muted-foreground">
                              Admin {activity.adminId}
                              {activity.targetId ? ` • đối tượng ${activity.targetId}` : ''}
                            </p>
                          </div>
                          <time className="shrink-0 text-[11px] text-muted-foreground">
                            {formatDateTime(activity.createdAt)}
                          </time>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )
        }}
      </QueryBoundary>
    </div>
  )
}
