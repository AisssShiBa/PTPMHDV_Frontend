import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { errorMessage } from '@/lib/apiResponse'
import { useAuthStore } from '@/features/auth/stores/useAuthStore'
import { adminService } from '../services/adminService'
import type { AdminKycItem } from '../types/admin.types'

export type KycAction = 'APPROVED' | 'REJECTED' | 1 | 2

export function KycActionForm({ item, action, onBusy, onSaved }: {
  item: AdminKycItem; action: KycAction; onBusy: (busy: boolean) => void; onSaved: () => void
}) {
  const lock = useRef(false)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [needsReload, setNeedsReload] = useState(false)
  const description = action === 'APPROVED' ? 'Duyệt hồ sơ và đặt cấp KYC về 1.'
    : action === 'REJECTED' ? 'Từ chối hồ sơ và đưa cấp KYC về 0. Người dùng cần nộp lại giấy tờ.'
    : action === 2 ? 'Nâng cấp 2 (mô phỏng liên kết ngân hàng).'
    : 'Đặt cấp KYC về 1; hồ sơ vẫn ở trạng thái đã xác thực.'
  const submit = async () => {
    if (lock.current || needsReload) return
    const detail = reason.trim()
    if (!detail || detail.length > 500) { setError('Vui lòng nhập lý do từ 1 đến 500 ký tự.'); return }
    lock.current = true; setSubmitting(true); onBusy(true); setError('')
    const adminId = useAuthStore.getState().user?.id
    let failed = false
    try {
      const result = typeof action === 'number'
        ? await adminService.updateKycTier(item.id, action, detail)
        : await adminService.reviewKyc(item.id, action, detail)
      if (useAuthStore.getState().user?.id !== adminId) return
      toast.success(`Đã cập nhật hồ sơ: cấp KYC ${result.kycTier}.`)
      onSaved()
    } catch (failure) {
      if (useAuthStore.getState().user?.id !== adminId) return
      setError(errorMessage(failure))
      setNeedsReload(true)
      failed = true
    } finally { lock.current = false; setSubmitting(false); if (!failed) onBusy(false) }
  }
  return <form className="space-y-3 border-t border-border pt-5" onSubmit={(event) => { event.preventDefault(); void submit() }}>
    <p className="font-semibold">{description}</p>
    <Label htmlFor="kyc-reason">Lý do xét duyệt / đổi cấp</Label>
    <Input id="kyc-reason" value={reason} maxLength={500} disabled={submitting || needsReload} aria-invalid={!!error} aria-describedby="kyc-action-help"
      onChange={(event) => setReason(event.target.value)} placeholder="Nhập lý do để lưu vào nhật ký" />
    <p id="kyc-action-help" className="text-xs text-muted-foreground">Bắt buộc, tối đa 500 ký tự. Không nhập số CCCD đầy đủ vào lý do.</p>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {needsReload ? <div className="space-y-2"><p className="text-sm">Tải lại hồ sơ và kiểm tra kết quả trước khi thực hiện tiếp.</p><Button type="button" variant="outline" onClick={onSaved}>Tải lại danh sách</Button></div>
      : <Button type="submit" variant={action === 'REJECTED' ? 'destructive' : 'default'} disabled={submitting}>{submitting ? 'Đang lưu…' : 'Xác nhận cập nhật'}</Button>}
  </form>
}
