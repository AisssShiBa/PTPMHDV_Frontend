// d:\PTPMHDV\Frontend\src\features\wallet\components\TransferModal.tsx
import { useState } from 'react'
import { walletService } from '../services/walletService'
import { useAuthStore } from '@/features/auth/stores/useAuthStore'
import { X, ArrowLeftRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export const TransferModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const user = useAuthStore((state) => state.user)
  const [toUserId, setToUserId] = useState('')
  const [amount, setAmount] = useState('50000')
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id) {
      toast.error('Vui lòng đăng nhập')
      return
    }
    try {
      setLoading(true)
      await walletService.transfer(String(user.id), toUserId.trim(), amount)
      toast.success(`Chuyển ${Number(amount).toLocaleString('vi-VN')} VND thành công!`)
      onSuccess?.()
      onClose()
    } catch (err: any) {
      toast.error('Chuyển tiền thất bại: ' + (err?.response?.data?.error?.message || err.message))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-2xl bg-card border border-border p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-foreground font-bold text-lg">
            <ArrowLeftRight className="size-5 text-primary" />
            <span>Chuyển tiền nội bộ (P2P)</span>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted text-muted-foreground transition-colors">
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleTransfer} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground">ID người nhận (UUID tài khoản)</label>
            <input
              type="text"
              required
              placeholder="e.g. 213cb32c-4d66-447d-b822-..."
              value={toUserId}
              onChange={(e) => setToUserId(e.target.value)}
              className="w-full mt-1 px-3.5 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 font-mono"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground">Số tiền chuyển (VND)</label>
            <input
              type="number"
              min="1000"
              step="1000"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full mt-1 px-3.5 py-2.5 rounded-xl border border-border bg-background text-lg font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="pt-3 flex gap-3">
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
              <span>{loading ? 'Đang chuyển...' : 'Xác nhận chuyển'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
