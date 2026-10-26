import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { X, ArrowLeftRight, Loader2, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/features/auth/stores/useAuthStore'
import { useRecipientLookup } from '@/features/user/hooks/useRecipientLookup'
import { errorMessage } from '@/lib/apiResponse'
import { walletService } from '../services/walletService'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function TransferModal({ isOpen, onClose, onSuccess }: Props) {
  const user = useAuthStore((state) => state.user)
  return isOpen && user ? <TransferForm key={user.id} authUserId={user.id} onClose={onClose} onSuccess={onSuccess} /> : null
}

function TransferForm({ authUserId, onClose, onSuccess }: Omit<Props, 'isOpen'> & { authUserId: string }) {
  const lookup = useRecipientLookup(authUserId)
  const [amount, setAmount] = useState('50000')
  const [confirmed, setConfirmed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [uncertain, setUncertain] = useState(false)
  const dialog = useRef<HTMLDialogElement | null>(null)
  const busy = useRef(false)
  const reference = useRef<string | null>(null)
  const amountValue = Number(amount)
  const validAmount = /^\d+$/.test(amount) && Number.isSafeInteger(amountValue) && amountValue > 0
  const disabled = loading || uncertain
  const amountDisplay = amount ? amountValue.toLocaleString('vi-VN') : ''

  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    return () => element?.close()
  }, [])

  const submit = async () => {
    if (busy.current || !lookup.recipient || !confirmed || !validAmount || lookup.loading || lookup.remaining) return
    if (useAuthStore.getState().user?.id !== authUserId) return
    busy.current = true; setLoading(true); setError('')
    reference.current ??= 'P2P-' + crypto.randomUUID()
    try {
      await walletService.transfer(authUserId, lookup.recipient.authUserId, String(amountValue), reference.current)
      if (useAuthStore.getState().user?.id !== authUserId) return
      toast.success(`Đã chuyển ${amountDisplay} VND cho ${lookup.recipient.maskedName}.`)
      onSuccess?.(); onClose()
    } catch (failure) {
      if (useAuthStore.getState().user?.id !== authUserId) return
      if (!axios.isAxiosError(failure) || !failure.response || failure.response.status >= 500) {
        setUncertain(true)
        setError('Chưa xác định được kết quả chuyển tiền. Bạn có thể thử lại đúng giao dịch này với cùng mã tham chiếu.')
      } else {
        setError(errorMessage(failure))
        // A definite rejection can be corrected and submitted as a new attempt.
        if (!uncertain) reference.current = null
      }
    } finally { busy.current = false; setLoading(false) }
  }

  return <dialog ref={dialog} aria-labelledby="transfer-title" aria-describedby="transfer-help"
    onCancel={(event) => { event.preventDefault(); if (!busy.current) onClose() }}
    className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-md overflow-y-auto rounded-2xl border border-border bg-card p-5 text-foreground shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-xs sm:p-6">
    <div className="mb-5 flex items-center justify-between gap-3">
      <h2 id="transfer-title" className="flex items-center gap-2 text-lg font-bold"><ArrowLeftRight className="size-5 shrink-0 text-primary" />Chuyển tiền nội bộ</h2>
      <Button type="button" size="icon-sm" variant="ghost" aria-label="Đóng chuyển tiền" disabled={loading} onClick={onClose}><X className="size-4" /></Button>
    </div>
    <p id="transfer-help" className="mb-5 text-sm text-muted-foreground">Tra cứu bằng email hoặc số điện thoại đã đăng ký, rồi kiểm tra tên người nhận trước khi chuyển.</p>
    <form className="space-y-5" onSubmit={(event) => { event.preventDefault(); if (!uncertain) void submit() }} noValidate>
      <div className="space-y-2">
        <Label htmlFor="transfer-recipient">Email hoặc số điện thoại người nhận</Label>
        <div className="flex gap-2">
          <Input id="transfer-recipient" value={lookup.query} maxLength={254} autoComplete="off" spellCheck={false} disabled={disabled}
            className="min-w-0 flex-1" aria-invalid={!!lookup.error} aria-describedby="recipient-help recipient-status"
            placeholder="binh@example.com hoặc 0912345678"
            onChange={(event) => { lookup.changeQuery(event.target.value); setConfirmed(false); setError(''); reference.current = null }}
            onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); if (!disabled) { setConfirmed(false); void lookup.lookup() } } }} />
          <Button type="button" variant="secondary" disabled={disabled || lookup.loading || !!lookup.remaining || !lookup.query.trim()}
            onClick={() => { setConfirmed(false); void lookup.lookup() }}>
            {lookup.loading ? <><Loader2 className="size-4 animate-spin" />Đang tìm</> : 'Tra cứu'}
          </Button>
        </div>
        <p id="recipient-help" className="text-xs text-muted-foreground">Nhập đầy đủ và chính xác. Số điện thoại cần khớp cả mã quốc gia và cách viết đã lưu.</p>
        <div id="recipient-status" aria-live="polite" className="space-y-2 text-sm">
          {lookup.error && <p role="alert" className="text-destructive">{lookup.error}</p>}
          {!!lookup.remaining && <p role="status" className="rounded-lg bg-amber-500/10 p-3 text-amber-700 dark:text-amber-300">Bạn đã tra cứu quá nhiều lần. Thử lại sau {lookup.remaining} giây.</p>}
          {lookup.recipient && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
            <p className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300"><CheckCircle2 className="size-4" />Người nhận tìm thấy</p>
            <p className="mt-1 break-words font-semibold" data-testid="recipient-name">{lookup.recipient.maskedName}</p>
            <p className="mt-1 text-xs text-muted-foreground">Tên được che một phần để bảo vệ thông tin cá nhân.</p>
          </div>}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="transfer-amount">Số tiền chuyển (VND)</Label>
        <Input id="transfer-amount" inputMode="numeric" value={amountDisplay} maxLength={21} disabled={disabled}
          aria-invalid={!validAmount} aria-describedby={!validAmount ? 'transfer-amount-error' : undefined}
          onChange={(event) => { setAmount(event.target.value.replace(/\D/g, '').slice(0, 15)); setConfirmed(false); setError(''); reference.current = null }} />
        {!validAmount && <p id="transfer-amount-error" className="text-sm text-destructive">Nhập số tiền nguyên lớn hơn 0.</p>}
      </div>
      <label className="flex items-start gap-3 text-sm">
        <input id="transfer-confirm" type="checkbox" className="mt-0.5 size-4 accent-primary" checked={confirmed}
          disabled={disabled || !lookup.recipient || !validAmount} onChange={(event) => setConfirmed(event.target.checked)} />
        <span>Tôi xác nhận chuyển {validAmount ? `${amountDisplay} VND` : 'số tiền trên'} cho {lookup.recipient?.maskedName || 'người nhận đã tra cứu'}.</span>
      </label>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {uncertain && <p className="text-xs text-muted-foreground">Nếu đóng cửa sổ, hãy kiểm tra lịch sử ví trước khi tạo giao dịch mới.</p>}
      <Button type={uncertain ? 'button' : 'submit'} className="w-full" disabled={loading || !lookup.recipient || !confirmed || !validAmount || lookup.loading || !!lookup.remaining}
        onClick={uncertain ? () => void submit() : undefined}>
        {loading && <Loader2 className="size-4 animate-spin" />}{loading ? 'Đang chuyển…' : uncertain ? 'Thử lại giao dịch này' : 'Xác nhận chuyển'}
      </Button>
    </form>
  </dialog>
}
