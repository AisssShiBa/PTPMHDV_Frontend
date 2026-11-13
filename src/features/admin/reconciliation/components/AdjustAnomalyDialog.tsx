import { useState } from 'react'
import { FileCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAdjustAnomaly } from '../queries'
import { adjustAnomalySchema } from '../schemas'
import {
  isAdjustOutcomeUnknown,
  isAlreadyAdjusted,
  reconciliationErrorMessage
} from '../messages'
import { anomalyLabel, type AdjustAnomalyResult, type ReconciliationAnomaly } from '../types'

interface AdjustAnomalyDialogProps {
  anomaly: ReconciliationAnomaly
  onClose: () => void
  onResolved: (result: AdjustAnomalyResult) => void
  /** refresh = true khi backend đã chắc chắn xử lý (409 đã điều chỉnh); false khi kết quả chưa rõ. */
  onConflict: (message: string, refresh: boolean) => void
}

export function AdjustAnomalyDialog({
  anomaly,
  onClose,
  onResolved,
  onConflict
}: AdjustAnomalyDialogProps) {
  const adjust = useAdjustAnomaly()
  const [direction, setDirection] = useState<'CREDIT' | 'DEBIT'>('CREDIT')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [formError, setFormError] = useState('')

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (adjust.isPending) return
    const parsed = adjustAnomalySchema.safeParse({ direction, amount, reason })
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? 'Dữ liệu chưa hợp lệ.')
      return
    }
    setFormError('')
    try {
      const result = await adjust.mutateAsync({ anomalyId: anomaly.id, payload: parsed.data })
      onResolved(result)
    } catch (error) {
      if (isAlreadyAdjusted(error)) {
        onConflict(reconciliationErrorMessage(error), true)
        return
      }
      if (isAdjustOutcomeUnknown(error)) {
        onConflict(reconciliationErrorMessage(error), false)
        return
      }
      setFormError(reconciliationErrorMessage(error))
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Tạo bút toán điều chỉnh</DialogTitle>
          <DialogDescription>
            {anomalyLabel(anomaly.type)} · Mã bất thường {anomaly.id}
            {anomaly.walletId ? ` · Ví ${anomaly.walletId}` : ''}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <fieldset className="space-y-1.5">
            <legend className="text-xs font-semibold text-muted-foreground">
              Loại điều chỉnh nghiệp vụ
            </legend>
            <div className="grid grid-cols-2 gap-2.5">
              {(['DEBIT', 'CREDIT'] as const).map((value) => (
                <label
                  key={value}
                  className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border p-3 text-xs font-semibold transition-all ${
                    direction === value
                      ? 'border-2 border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:bg-muted/40'
                  }`}
                >
                  <input
                    type="radio"
                    name="adjust-direction"
                    value={value}
                    checked={direction === value}
                    onChange={() => setDirection(value)}
                    disabled={adjust.isPending}
                    className="size-3.5"
                  />
                  <span>{value === 'DEBIT' ? 'Ghi Nợ (Giảm số dư)' : 'Ghi Có (Tăng số dư)'}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="space-y-1.5">
            <Label htmlFor="adjust-amount" className="text-xs font-semibold text-muted-foreground">
              Số tiền điều chỉnh (₫)
            </Label>
            <Input
              id="adjust-amount"
              inputMode="numeric"
              value={amount}
              disabled={adjust.isPending}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="Ví dụ: 50000"
              className="h-11 font-mono text-base font-bold"
              aria-invalid={Boolean(formError)}
            />
            <p className="text-[11px] text-muted-foreground">
              Chỉ nhận số nguyên dương, tối đa 18 chữ số. Không nhập dấu chấm hay số âm.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="adjust-reason" className="text-xs font-semibold text-muted-foreground">
              Lý do điều chỉnh &amp; mã biên bản <span className="font-bold text-destructive">*</span>
            </Label>
            <textarea
              id="adjust-reason"
              value={reason}
              rows={3}
              maxLength={500}
              disabled={adjust.isPending}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Nhập lý do cụ thể và mã biên bản đối soát (5 đến 500 ký tự)…"
              className="w-full rounded-xl border border-input bg-card p-3 text-xs outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {formError && (
            <p role="alert" className="text-sm text-destructive">
              {formError}
            </p>
          )}

          <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/50 p-3 text-xs text-muted-foreground">
            <FileCheck className="mt-0.5 size-4 shrink-0 text-primary" />
            <p>Thao tác được ghi vĩnh viễn vào nhật ký kiểm toán cùng mã tham chiếu của bất thường.</p>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={adjust.isPending}>
              Hủy
            </Button>
            <Button type="submit" disabled={adjust.isPending} className="gap-2 font-bold">
              <FileCheck className="size-4" />
              {adjust.isPending ? 'Đang gửi…' : 'Ký duyệt & Tạo bút toán'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
