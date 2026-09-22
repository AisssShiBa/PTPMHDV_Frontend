// d:\PTPMHDV\Frontend\src\features\wallet\components\TopupModal.tsx
import { useState } from 'react'
import { walletService } from '../services/walletService'
import { useAuthStore } from '@/features/auth/stores/useAuthStore'
import { X, PlusCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

const PRESET_AMOUNTS = [50000, 100000, 200000, 500000, 1000000, 2000000]

export const TopupModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const user = useAuthStore((state) => state.user)
  const [amount, setAmount] = useState('100000')
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleTopup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id) {
      toast.error('Vui lòng đăng nhập để nạp tiền')
      return
    }
    try {
      setLoading(true)
      await walletService.topup(String(user.id), amount)
      toast.success(`Nạp thành công ${Number(amount).toLocaleString('vi-VN')} VND vào ví!`)
      onSuccess?.()
      onClose()
    } catch (err: any) {
      toast.error('Nạp tiền thất bại: ' + (err?.response?.data?.error?.message || err.message))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-md rounded-2xl bg-card border border-border p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-foreground font-bold text-lg">
            <PlusCircle className="size-5 text-primary" />
            <span>Nạp tiền vào ví</span>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted text-muted-foreground transition-colors">
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleTopup} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Số tiền muốn nạp (VND)</label>
            <input
              type="number"
              min="10000"
              step="10000"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full mt-1 px-3.5 py-2.5 rounded-xl border border-border bg-background text-lg font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground mb-2 block">Chọn nhanh mệnh giá</label>
            <div className="grid grid-cols-3 gap-2">
              {PRESET_AMOUNTS.map((val) => (
                <button
                  type="button"
                  key={val}
                  onClick={() => setAmount(String(val))}
                  className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                    amount === String(val)
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-card hover:bg-muted text-foreground'
                  }`}
                >
                  {val.toLocaleString('vi-VN')} đ
                </button>
              ))}
            </div>
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
              <span>{loading ? 'Đang nạp...' : 'Nạp tiền ngay'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
