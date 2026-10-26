import { useEffect, useRef, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ResourceError, ResourceLoading } from '@/components/common/ResourceState'
import { useRemoteResource } from '@/hooks/useRemoteResource'
import { errorMessage } from '@/lib/apiResponse'
import { adminService } from '@/features/admin/services/adminService'
import type { AdminKycItem } from '@/features/admin/types/admin.types'
import type { KycStatus } from '@/features/user/types/user.types'
import { AdminKycDocumentsViewer } from '@/features/admin/components/AdminKycDocumentsViewer'
import { KycActionForm, type KycAction } from '@/features/admin/components/KycActionForm'
import { KycStatusBadge } from '@/features/user/components/KycStatusBadge'
import { KycTierBadge } from '@/features/user/components/KycTierBadge'

type Filters = { page: number; search: string; status: KycStatus | '' }
const loadList = (key: string, signal: AbortSignal) => {
  const filters: Filters = JSON.parse(key)
  return adminService.getKycList({ ...filters, limit: 10, status: filters.status || undefined }, signal)
}

export default function AdminKyc() {
  const [filters, setFilters] = useState<Filters>({ page: 1, search: '', status: '' })
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<AdminKycItem | null>(null)
  const [action, setAction] = useState<KycAction | null>(null)
  const [busy, setBusy] = useState(false)
  const detailPanel = useRef<HTMLElement | null>(null)
  useEffect(() => {
    if (selected) detailPanel.current?.focus()
  }, [selected, action])
  const resource = useRemoteResource(JSON.stringify(filters), loadList)
  const reload = () => { setBusy(false); setSelected(null); setAction(null); resource.reload() }
  const filter = (next: Filters) => { setSelected(null); setAction(null); setFilters(next) }
  const select = (item: AdminKycItem, next: KycAction | null) => { setSelected(item); setAction(next) }

  return <div className="max-w-6xl space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div><h1 className="text-2xl font-black tracking-tight">Phê duyệt Định danh KYC</h1>
        <p className="mt-1 text-sm text-muted-foreground">Kiểm tra giấy tờ, xét duyệt và quản lý cấp xác thực của người dùng.</p></div>
      <Button variant="outline" disabled={busy || resource.status === 'loading'} onClick={reload}><RefreshCw className="size-4" />Làm mới</Button>
    </header>
    <form className="flex flex-wrap items-end gap-3" onSubmit={(event) => { event.preventDefault(); if (!busy) filter({ ...filters, page: 1, search: search.trim() }) }}>
      <div className="min-w-0 basis-full space-y-2 sm:flex-1"><Label htmlFor="kyc-search">Tìm hồ sơ</Label>
        <Input id="kyc-search" placeholder="Họ tên hoặc email" value={search} maxLength={200} disabled={busy} onChange={(event) => setSearch(event.target.value)} /></div>
      <div className="space-y-2"><Label htmlFor="kyc-status">Trạng thái</Label>
        <select id="kyc-status" className="h-9 rounded-lg border border-border bg-background px-3 text-sm" value={filters.status} disabled={busy}
          onChange={(event) => filter({ ...filters, page: 1, status: event.target.value as Filters['status'] })}>
          <option value="">Tất cả trạng thái</option><option value="PENDING">Đang chờ duyệt</option><option value="APPROVED">Đã xác thực</option>
          <option value="REJECTED">Đã từ chối</option><option value="NONE">Chưa nộp</option>
        </select></div>
      <Button type="submit" disabled={busy}>Tìm kiếm</Button>
    </form>
    {resource.status === 'loading' && <ResourceLoading message="Đang tải danh sách KYC…" />}
    {resource.status === 'error' && <ResourceError message={errorMessage(resource.error)} onRetry={reload} />}
    {resource.status === 'success' && <>
      {selected && <section ref={detailPanel} tabIndex={-1} aria-label="Chi tiết hồ sơ KYC" className="space-y-5 rounded-2xl border border-primary/20 bg-card p-4 outline-none sm:p-6">
        <div className="flex items-start justify-between gap-3"><div className="min-w-0 space-y-2">
          <h2 className="break-words text-lg font-bold">{selected.fullName || 'Chưa cập nhật họ tên'}</h2>
          <p className="break-all text-sm text-muted-foreground">{selected.email}</p>
          <div className="flex gap-2"><KycStatusBadge status={selected.kycStatus} /><KycTierBadge tier={selected.kycTier} /></div>
        </div><Button variant="ghost" disabled={busy} onClick={() => { setSelected(null); setAction(null) }}>Đóng</Button></div>
        <AdminKycDocumentsViewer key={selected.id} userId={selected.id} />
        {action !== null && <KycActionForm key={`${selected.id}-${action}`} item={selected} action={action} onBusy={setBusy} onSaved={reload} />}
      </section>}
      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Danh sách hồ sơ và cấp KYC</caption>
          <thead className="border-b border-border bg-muted/50 text-xs text-muted-foreground"><tr>
            <th className="p-4">Họ tên / Email</th><th className="p-4">Giấy tờ</th><th className="p-4">Trạng thái</th><th className="p-4">Cấp KYC</th><th className="p-4">Thao tác</th>
          </tr></thead>
          <tbody className="divide-y divide-border">
            {resource.data.content.map((item) => <tr key={item.id} className="align-top">
              <td className="p-4"><div className="font-semibold">{item.fullName || 'Chưa cập nhật'}</div><div className="text-xs text-muted-foreground">{item.email}</div></td>
              <td className="p-4"><div className="mb-2 whitespace-nowrap font-mono text-xs">{item.idNumber ? '•••• ' + item.idNumber.slice(-4) : 'Chưa có giấy tờ'}</div>
                <Button size="sm" variant="outline" disabled={busy || !item.hasKycDocument} onClick={() => select(item, null)}>Xem hồ sơ</Button></td>
              <td className="p-4"><KycStatusBadge status={item.kycStatus} /></td><td className="p-4"><KycTierBadge tier={item.kycTier} /></td>
              <td className="p-4"><div className="flex min-w-48 flex-wrap gap-2">
                <Button size="sm" disabled={busy || item.kycStatus !== 'PENDING'} onClick={() => select(item, 'APPROVED')}>Duyệt</Button>
                <Button size="sm" variant="destructive" disabled={busy || !['PENDING', 'APPROVED'].includes(item.kycStatus)} onClick={() => select(item, 'REJECTED')}>Từ chối</Button>
                {item.kycStatus === 'APPROVED' && <Button size="sm" variant="outline" disabled={busy} onClick={() => select(item, item.kycTier === 2 ? 1 : 2)}>
                  {item.kycTier === 2 ? 'Đưa về cấp 1' : 'Nâng cấp 2'}
                </Button>}
                {item.kycStatus === 'APPROVED' && item.kycTier === 0 && <Button size="sm" variant="outline" disabled={busy} onClick={() => select(item, 1)}>Đặt cấp 1</Button>}
              </div></td>
            </tr>)}
            {!resource.data.content.length && <tr><td colSpan={5} className="p-10 text-center text-muted-foreground">Không có hồ sơ phù hợp.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <p className="text-muted-foreground">{resource.data.totalElements} hồ sơ · Trang {filters.page} / {Math.max(filters.page, resource.data.totalPages)}</p>
        <div className="flex gap-2"><Button variant="outline" disabled={busy || filters.page === 1} onClick={() => filter({ ...filters, page: filters.page - 1 })}>Trang trước</Button>
          <Button variant="outline" disabled={busy || filters.page >= resource.data.totalPages} onClick={() => filter({ ...filters, page: filters.page + 1 })}>Trang sau</Button></div>
      </div>
    </>}
  </div>
}
