import { useState } from 'react'
import {
  BadgeCheck,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  Search,
  Shield,
  UserCheck,
  XCircle
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { QueryBoundary } from '@/components/common/QueryBoundary'
import { errorMessage } from '@/lib/apiResponse'
import { formatDateTime } from '@/lib/format'
import type { KycStatus } from '@/features/user/types/user.types'
import { useAdminKycList, useChangeKycTier, useReviewKyc } from '../api/admin.queries'
import { kycReviewSchema, kycTierSchema } from '../schemas/admin.schema'
import type { AdminKycItem } from '../types/admin.types'
import { AdminKycDocumentsViewer } from './AdminKycDocumentsViewer'

type KycAction = 'APPROVED' | 'REJECTED' | 1 | 2

const PAGE_SIZE = 10

const statusLabels: Record<KycStatus, string> = {
  NONE: 'Chưa nộp',
  PENDING: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối'
}

const statusBadge = (status: KycStatus) => {
  if (status === 'PENDING')
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-400">
        <span className="size-1.5 rounded-full bg-amber-500" />
        Chờ duyệt
      </span>
    )
  if (status === 'APPROVED')
    return (
      <Badge className="border-none bg-emerald-500/15 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
        Đã duyệt
      </Badge>
    )
  if (status === 'REJECTED')
    return (
      <Badge className="border-none bg-destructive/15 text-[10px] font-semibold text-destructive">
        Từ chối
      </Badge>
    )
  return <Badge variant="outline" className="text-[10px]">Chưa nộp</Badge>
}

const actionTitle = (action: KycAction) => {
  if (action === 'APPROVED') return 'Duyệt hồ sơ (đặt Cấp 1)'
  if (action === 'REJECTED') return 'Từ chối hồ sơ (đưa về Cấp 0)'
  if (action === 2) return 'Nâng lên Cấp 2'
  return 'Đặt về Cấp 1'
}

export function AdminKycManager() {
  const [status, setStatus] = useState<KycStatus | ''>('PENDING')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showId, setShowId] = useState(false)
  const [action, setAction] = useState<KycAction | null>(null)
  const [reason, setReason] = useState('')
  const [formError, setFormError] = useState('')

  const list = useAdminKycList({ page, limit: PAGE_SIZE, status: status || undefined, search })
  const reviewKyc = useReviewKyc()
  const changeTier = useChangeKycTier()
  const submitting = reviewKyc.isPending || changeTier.isPending

  const resetForm = () => {
    setAction(null)
    setReason('')
    setFormError('')
  }

  const selectProfile = (item: AdminKycItem) => {
    setSelectedId(item.id)
    setShowId(false)
    resetForm()
  }

  const submit = async (item: AdminKycItem) => {
    if (action === null || submitting) return
    if (action === 'APPROVED' || action === 'REJECTED') {
      const parsed = kycReviewSchema.safeParse({ status: action, detail: reason })
      if (!parsed.success) {
        setFormError(parsed.error.issues[0]?.message ?? 'Dữ liệu chưa hợp lệ.')
        return
      }
      try {
        const updated = await reviewKyc.mutateAsync({
          userId: item.id,
          status: parsed.data.status,
          detail: parsed.data.detail
        })
        toast.success(
          `Đã cập nhật hồ sơ: ${statusLabels[updated.kycStatus]} • Cấp ${updated.kycTier}.`
        )
        resetForm()
      } catch (error) {
        setFormError(errorMessage(error))
      }
      return
    }

    const parsed = kycTierSchema.safeParse({ tier: action, reason })
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? 'Dữ liệu chưa hợp lệ.')
      return
    }
    try {
      const updated = await changeTier.mutateAsync({
        userId: item.id,
        tier: parsed.data.tier,
        reason: parsed.data.reason
      })
      toast.success(`Đã đổi cấp KYC thành Cấp ${updated.kycTier}.`)
      resetForm()
    } catch (error) {
      setFormError(errorMessage(error))
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      <div>
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <Badge className="gap-1 border-none bg-primary font-bold text-primary-foreground hover:bg-primary/90">
            <UserCheck className="size-3.5" />
            KYC VERIFICATION
          </Badge>
          <Badge className="gap-1 border-none bg-amber-500/15 font-semibold text-amber-700 dark:text-amber-400">
            <Clock className="size-3.5" />
            {list.data ? list.data.totalElements : '—'} hồ sơ theo bộ lọc
          </Badge>
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
          Phê duyệt Định danh Khách hàng
        </h1>
        <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
          Đối chiếu ảnh CCCD hai mặt và ra quyết định cấp hạn mức giao dịch. Mọi thao tác đều được
          ghi nhật ký kiểm toán.
        </p>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <Card className="overflow-hidden border-border shadow-xs lg:col-span-5">
          <CardHeader className="border-b border-border/60 bg-muted/30 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-foreground">Hàng đợi thẩm định</CardTitle>
                <CardDescription className="text-xs">Chọn hồ sơ để đối chiếu thông tin</CardDescription>
              </div>
              <Badge variant="outline" className="border-primary/30 font-mono text-xs font-semibold text-primary">
                Trang {page}
              </Badge>
            </div>

            <div className="mt-2 flex flex-wrap gap-1">
              {(['PENDING', 'APPROVED', 'REJECTED', ''] as const).map((value) => (
                <Button
                  key={value || 'ALL'}
                  type="button"
                  size="sm"
                  variant={status === value ? 'default' : 'ghost'}
                  onClick={() => {
                    setStatus(value)
                    setPage(1)
                  }}
                  className="h-7 rounded-lg text-[11px] font-semibold"
                >
                  {value ? statusLabels[value] : 'Tất cả'}
                </Button>
              ))}
            </div>

            <form
              className="mt-2 flex gap-2"
              onSubmit={(event) => {
                event.preventDefault()
                setPage(1)
                setSearch(searchInput.trim())
              }}
            >
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  placeholder="Tìm theo email, họ tên..."
                  className="h-9 pl-9 text-xs"
                />
              </div>
              <Button type="submit" size="sm" variant="outline" className="h-9 text-xs font-semibold">
                Tìm
              </Button>
            </form>
          </CardHeader>

          <CardContent className="max-h-[620px] divide-y divide-border/60 overflow-y-auto p-0">
            <QueryBoundary
              query={list}
              skeleton={
                <div className="space-y-2 p-3" role="status">
                  {[0, 1, 2, 3].map((item) => (
                    <div key={item} className="h-14 animate-pulse rounded-xl bg-muted/60" />
                  ))}
                </div>
              }
              isEmpty={(data) => data.content.length === 0}
              emptyFallback={
                <p className="p-8 text-center text-xs text-muted-foreground">
                  Không có hồ sơ nào khớp bộ lọc hiện tại.
                </p>
              }
            >
              {(data) => {
                const active = data.content.find((item) => item.id === selectedId) ?? data.content[0]
                return (
                  <div>
                    {data.content.map((item) => {
                      const isSelected = item.id === active?.id
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => selectProfile(item)}
                          className={`flex w-full items-center justify-between gap-3 p-3.5 text-left transition-all ${
                            isSelected ? 'border-l-4 border-primary bg-primary/10' : 'hover:bg-muted/40'
                          }`}
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <div
                              className={`flex size-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                                isSelected
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-muted text-muted-foreground'
                              }`}
                            >
                              {(item.fullName ?? item.email).slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-xs font-bold text-foreground sm:text-sm">
                                {item.fullName ?? '(Chưa cập nhật tên)'}
                              </p>
                              <p className="truncate font-mono text-[11px] text-muted-foreground">
                                {item.email}
                              </p>
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            {statusBadge(item.kycStatus)}
                            <span className="mt-1 block text-[10px] text-muted-foreground">
                              Cấp {item.kycTier} • {formatDateTime(item.createdAt).slice(0, 10)}
                            </span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )
              }}
            </QueryBoundary>
          </CardContent>

          <div className="flex items-center justify-between border-t border-border/60 bg-muted/30 p-3 text-xs">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1 || list.isFetching}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              className="h-8 text-xs"
            >
              Trang trước
            </Button>
            <span className="text-muted-foreground">
              {list.data ? `${page}/${list.data.totalPages}` : '—'}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!list.data || page >= list.data.totalPages || list.isFetching}
              onClick={() => setPage((current) => current + 1)}
              className="h-8 text-xs"
            >
              Trang sau
            </Button>
          </div>
        </Card>

        <Card className="overflow-hidden border-border shadow-xs lg:col-span-7">
          {!list.data || list.data.content.length === 0 ? (
            <CardContent className="p-10 text-center text-sm text-muted-foreground">
              Chọn một hồ sơ ở hàng đợi để xem chi tiết.
            </CardContent>
          ) : (
            (() => {
              const item = list.data.content.find((entry) => entry.id === selectedId) ?? list.data.content[0]
              return (
                <>
                  <CardHeader className="border-b border-border/60 bg-muted/30 pb-3">
                    <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                      <div>
                        <CardTitle className="text-base font-bold text-foreground sm:text-lg">
                          {item.fullName ?? '(Chưa cập nhật tên)'}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Mã hồ sơ: <strong className="font-mono text-foreground">{item.id}</strong> • Nộp lúc{' '}
                          {formatDateTime(item.createdAt)}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {statusBadge(item.kycStatus)}
                        <Badge variant="outline" className="border-primary/30 text-xs font-semibold text-primary">
                          Cấp {item.kycTier}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-6 p-5">
                    <div className="space-y-3 rounded-2xl border border-border bg-muted/40 p-4">
                      <div className="flex items-center justify-between">
                        <strong className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-foreground">
                          <Shield className="size-4 text-primary" />
                          Thông tin định danh
                        </strong>
                        {item.idNumber && (
                          <button
                            type="button"
                            onClick={() => setShowId((current) => !current)}
                            className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                          >
                            {showId ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                            {showId ? 'Ẩn số CCCD' : 'Xem số CCCD'}
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4 pt-1 text-xs sm:grid-cols-4">
                        <div>
                          <span className="block text-[11px] text-muted-foreground">Họ và tên</span>
                          <strong className="text-sm font-bold text-foreground">
                            {item.fullName ?? '—'}
                          </strong>
                        </div>
                        <div>
                          <span className="block text-[11px] text-muted-foreground">Số CCCD</span>
                          <strong className="font-mono text-sm font-bold text-foreground">
                            {item.idNumber
                              ? showId
                                ? item.idNumber
                                : `********${item.idNumber.slice(-4)}`
                              : '—'}
                          </strong>
                        </div>
                        <div>
                          <span className="block text-[11px] text-muted-foreground">Email</span>
                          <span className="block truncate font-medium text-foreground">{item.email}</span>
                        </div>
                        <div>
                          <span className="block text-[11px] text-muted-foreground">Điện thoại</span>
                          <span className="font-mono font-medium text-foreground">{item.phone ?? '—'}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 border-t border-border/60 pt-2 text-xs sm:grid-cols-4">
                        <div>
                          <span className="block text-[11px] text-muted-foreground">Địa chỉ</span>
                          <span className="font-medium text-foreground">{item.address ?? '—'}</span>
                        </div>
                        <div>
                          <span className="block text-[11px] text-muted-foreground">Trạng thái KYC</span>
                          <span className="font-medium text-foreground">{statusLabels[item.kycStatus]}</span>
                        </div>
                        <div>
                          <span className="block text-[11px] text-muted-foreground">Cấp hiện tại</span>
                          <span className="font-medium text-foreground">Cấp {item.kycTier}</span>
                        </div>
                        <div>
                          <span className="block text-[11px] text-muted-foreground">Cập nhật</span>
                          <span className="font-medium text-foreground">{formatDateTime(item.updatedAt)}</span>
                        </div>
                      </div>
                    </div>

                    <AdminKycDocumentsViewer key={item.id} userId={item.id} />

                    <div className="space-y-3 border-t border-border pt-4">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant={action === 'APPROVED' ? 'default' : 'outline'}
                          disabled={item.kycStatus !== 'PENDING' || submitting}
                          onClick={() => {
                            setAction('APPROVED')
                            setFormError('')
                          }}
                          className="gap-1.5 text-xs font-semibold"
                        >
                          <CheckCircle2 className="size-4" />
                          Duyệt
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={action === 'REJECTED' ? 'destructive' : 'outline'}
                          disabled={item.kycStatus !== 'PENDING' || submitting}
                          onClick={() => {
                            setAction('REJECTED')
                            setFormError('')
                          }}
                          className="gap-1.5 text-xs font-semibold"
                        >
                          <XCircle className="size-4" />
                          Từ chối
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={action === 1 ? 'default' : 'outline'}
                          disabled={submitting}
                          onClick={() => {
                            setAction(1)
                            setFormError('')
                          }}
                          className="gap-1.5 text-xs font-semibold"
                        >
                          <BadgeCheck className="size-4" />
                          Đặt Cấp 1
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={action === 2 ? 'default' : 'outline'}
                          disabled={submitting}
                          onClick={() => {
                            setAction(2)
                            setFormError('')
                          }}
                          className="gap-1.5 text-xs font-semibold"
                        >
                          <BadgeCheck className="size-4" />
                          Nâng Cấp 2
                        </Button>
                      </div>

                      {action !== null && (
                        <form
                          className="space-y-2 rounded-2xl border border-border bg-muted/30 p-4"
                          onSubmit={(event) => {
                            event.preventDefault()
                            void submit(item)
                          }}
                        >
                          <p className="text-sm font-semibold text-foreground">{actionTitle(action)}</p>
                          <Label htmlFor="kyc-action-reason" className="text-xs">
                            {action === 'APPROVED'
                              ? 'Ghi chú duyệt (không bắt buộc, tối đa 500 ký tự)'
                              : 'Lý do (bắt buộc, 1 đến 500 ký tự)'}
                          </Label>
                          <Input
                            id="kyc-action-reason"
                            value={reason}
                            maxLength={500}
                            disabled={submitting}
                            aria-invalid={Boolean(formError)}
                            onChange={(event) => setReason(event.target.value)}
                            placeholder="Nhập lý do để lưu vào nhật ký kiểm toán"
                          />
                          <p className="text-[11px] text-muted-foreground">
                            Không nhập số CCCD đầy đủ hoặc thông tin nhạy cảm vào lý do.
                          </p>
                          {formError && (
                            <p role="alert" className="text-sm text-destructive">
                              {formError}
                            </p>
                          )}
                          <div className="flex gap-2 pt-1">
                            <Button
                              type="submit"
                              size="sm"
                              variant={action === 'REJECTED' ? 'destructive' : 'default'}
                              disabled={submitting}
                              className="text-xs font-semibold"
                            >
                              {submitting ? 'Đang lưu…' : 'Xác nhận'}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              disabled={submitting}
                              onClick={resetForm}
                              className="text-xs font-semibold"
                            >
                              Hủy
                            </Button>
                          </div>
                        </form>
                      )}
                    </div>
                  </CardContent>
                </>
              )
            })()
          )}
        </Card>
      </div>
    </div>
  )
}
