import { useState } from 'react'
import { walletService } from '../services/walletService'
import { useAuthStore } from '@/features/auth/stores/useAuthStore'
import { X, PlusCircle, Loader2, ChevronUp, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

const PRESET_AMOUNTS = [50000, 100000, 200000, 500000, 1000000]
const STEP = 50000

export const TopupModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const user = useAuthStore((state) => state.user)
  const [amountDisplay, setAmountDisplay] = useState('100,000')
  const [amountValue, setAmountValue] = useState('100000')
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '')
    setAmountValue(rawValue)
    setAmountDisplay(rawValue ? Number(rawValue).toLocaleString('vi-VN') : '')
  }

  const handlePresetSelect = (value: number) => {
    setAmountValue(value.toString())
    setAmountDisplay(value.toLocaleString('vi-VN'))
  }

  const handleStep = (direction: 'up' | 'down') => {
    let currentVal = Number(amountValue) || 0;
    if (direction === 'up') currentVal += STEP;
    else currentVal = Math.max(0, currentVal - STEP);
    
    setAmountValue(currentVal.toString());
    setAmountDisplay(currentVal ? currentVal.toLocaleString('vi-VN') : '0');
  }

  const handleTopup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id) {
      toast.error('Vui lòng đăng nhập để nạp tiền')
      return
    }
    if (!amountValue || Number(amountValue) <= 0) {
      toast.error('Vui lòng nhập số tiền hợp lệ')
      return
    }
    
    try {
      setLoading(true)
      await walletService.topup(String(user.id), amountValue)
      toast.success(`Nạp thành công ${amountDisplay} VND vào ví!`)
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
          <div className="space-y-2">
            <label className="text-sm font-medium">Số tiền nạp (VND)</label>
            <div className="relative">
              <input
                type="text"
                value={amountDisplay}
                onChange={handleAmountChange}
                className="w-full rounded-xl border border-input bg-background pl-4 pr-10 py-3 text-lg font-bold shadow-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                placeholder="0"
                required
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
                <button 
                  type="button" 
                  onClick={() => handleStep('up')}
                  className="p-1 bg-muted/80 hover:bg-muted text-muted-foreground rounded-t-sm transition-colors"
                >
                  <ChevronUp className="size-3" />
                </button>
                <button 
                  type="button" 
                  onClick={() => handleStep('down')}
                  className="p-1 bg-muted/80 hover:bg-muted text-muted-foreground rounded-b-sm transition-colors"
                >
                  <ChevronDown className="size-3" />
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {PRESET_AMOUNTS.map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => handlePresetSelect(val)}
                className={`py-2 text-xs font-semibold rounded-lg border transition-all ${
                  amountValue === val.toString() 
                    ? 'border-primary bg-primary/10 text-primary' 
                    : 'border-border bg-muted/30 text-muted-foreground hover:bg-muted'
                }`}
              >
                {val.toLocaleString('vi-VN')}
              </button>
            ))}
          </div>

          <button
            type="submit"
            disabled={loading || !amountValue || Number(amountValue) <= 0}
            className="w-full rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 transition-all mt-4"
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            Xác nhận nạp {amountDisplay} ₫
          </button>
        </form>
      </div>
    </div>
  )
}
