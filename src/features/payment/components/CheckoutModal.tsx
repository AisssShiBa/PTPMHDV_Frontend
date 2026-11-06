// d:\PTPMHDV\Frontend\src\features\payment\components\CheckoutModal.tsx
import { useState } from 'react'
import { paymentService } from '../services/paymentService'
import type { PaymentType } from '../types/payment.types'
import { X, CreditCard, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export const CheckoutModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [amount, setAmount] = useState('50000')
  const [type, setType] = useState<PaymentType>('BUS_TICKET')
  const [referenceId, setReferenceId] = useState(`ORDER-${Date.now()}`)
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      const idempotencyKey = crypto.randomUUID()
      await paymentService.checkout({
        amount,
        type,
        referenceId,
        callbackTopic: 'payment.callback',
        idempotencyKey
      })
      toast.success('Khởi tạo thanh toán thành công!')
      onSuccess?.()
      onClose()
    } catch (err: any) {
      toast.error('Thanh toán thất bại: ' + (err?.response?.data?.error?.message || err.message))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-2xl bg-card border border-border p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-foreground font-bold text-lg">
            <CreditCard className="size-5 text-primary" />
            <span>Thanh toán dịch vụ</span>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted text-muted-foreground transition-colors">
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleCheckout} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Loại dịch vụ</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as PaymentType)}
              className="w-full mt-1 px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="BUS_TICKET">Vé xe Bus</option>
              <option value="MOVIE_TICKET">Vé xem phim</option>
              <option value="TRAIN_TICKET">Vé tàu hỏa</option>
              <option value="CARD_TOPUP">Nạp thẻ cào điện thoại</option>
              <option value="WALLET_TRANSFER">Chuyển tiền Ví</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground">Số tiền (VND)</label>
            <input
              type="number"
              min="1000"
              step="1000"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full mt-1 px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground">Mã tham chiếu (Đơn hàng)</label>
            <input
              type="text"
              required
              value={referenceId}
              onChange={(e) => setReferenceId(e.target.value)}
              className="w-full mt-1 px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-border text-xs sm:text-sm font-semibold hover:bg-muted transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-primary text-white text-xs sm:text-sm font-bold shadow-md shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="size-4 animate-spin" />}
              <span>{loading ? 'Đang xử lý...' : 'Xác nhận'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
