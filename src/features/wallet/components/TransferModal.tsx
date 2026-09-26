import { useState } from 'react'
import { walletService } from '../services/walletService'
import { useAuthStore } from '@/features/auth/stores/useAuthStore'
import { X, ArrowLeftRight, Loader2, CheckCircle2, ChevronUp, ChevronDown, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

const STEP = 50000

export const TransferModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const user = useAuthStore((state) => state.user)
  const [toUserId, setToUserId] = useState('')
  const [amountDisplay, setAmountDisplay] = useState('50,000')
  const [amountValue, setAmountValue] = useState('50000')
  const [loading, setLoading] = useState(false)
  const [checkingWallet, setCheckingWallet] = useState(false)
  const [isWalletValid, setIsWalletValid] = useState<boolean | null>(null)

  if (!isOpen) return null

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '')
    setAmountValue(rawValue)
    setAmountDisplay(rawValue ? Number(rawValue).toLocaleString('vi-VN') : '')
  }

  const handleStep = (direction: 'up' | 'down') => {
    let currentVal = Number(amountValue) || 0;
    if (direction === 'up') currentVal += STEP;
    else currentVal = Math.max(0, currentVal - STEP);
    
    setAmountValue(currentVal.toString());
    setAmountDisplay(currentVal ? currentVal.toLocaleString('vi-VN') : '0');
  }

  const handleCheckReceiver = async () => {
    if (!toUserId.trim()) return
    try {
      setCheckingWallet(true)
      setIsWalletValid(null)
      await walletService.getBalance(toUserId.trim()) 
      setIsWalletValid(true)
      toast.success('Tìm thấy ví người nhận hợp lệ!')
    } catch (err) {
      setIsWalletValid(false)
      // Không ném toast error nữa để tránh giật màn hình (toast pop-up)
    } finally {
      setCheckingWallet(false)
    }
  }

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id) {
      toast.error('Vui lòng đăng nhập')
      return
    }
    if (isWalletValid === false) {
      toast.error('Ví người nhận không hợp lệ!')
      return
    }

    try {
      setLoading(true)
      await walletService.transfer(String(user.id), toUserId.trim(), amountValue)
      toast.success(`Chuyển ${amountDisplay} VND thành công!`)
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
          <div className="space-y-1">
            <label className="text-sm font-medium">ID ví người nhận</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={toUserId}
                onChange={(e) => {
                  setToUserId(e.target.value)
                  setIsWalletValid(null)
                }}
                className={`flex-1 rounded-xl border bg-background px-4 py-2 outline-none transition-all ${
                  isWalletValid === true ? 'border-emerald-500 focus:border-emerald-500' : isWalletValid === false ? 'border-rose-500 focus:border-rose-500' : 'border-input focus:border-primary'
                }`}
                placeholder="Nhập User ID"
                required
              />
              <button
                type="button"
                onClick={handleCheckReceiver}
                disabled={!toUserId || checkingWallet}
                className="rounded-xl bg-secondary px-4 py-2 text-sm font-semibold hover:bg-secondary/80 disabled:opacity-50 transition-colors flex items-center justify-center min-w-[90px]"
              >
                {checkingWallet ? <Loader2 className="size-4 animate-spin" /> : 'Kiểm tra'}
              </button>
            </div>
            {/* Vùng giữ chỗ cho dòng thông báo để tránh giật layout */}
            <div className="min-h-[20px] pt-1">
              {isWalletValid === true && (
                <p className="text-xs text-emerald-500 flex items-center gap-1 animate-in fade-in">
                  <CheckCircle2 className="size-3" /> Hợp lệ
                </p>
              )}
              {isWalletValid === false && (
                <p className="text-xs text-rose-500 flex items-center gap-1 animate-in fade-in">
                  <AlertCircle className="size-3" /> Mã ID / Tài khoản không tồn tại
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Số tiền chuyển (VND)</label>
            <div className="relative">
              <input
                type="text"
                value={amountDisplay}
                onChange={handleAmountChange}
                className="w-full rounded-xl border border-input bg-background pl-4 pr-10 py-3 text-lg font-bold shadow-sm focus:border-primary outline-none transition-all"
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

          <button
            type="submit"
            disabled={loading || !amountValue || Number(amountValue) <= 0 || isWalletValid === false}
            className="w-full rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 transition-all mt-4"
          >
            {loading && <Loader2 className="size-4 animate-spin" />}
            Xác nhận chuyển
          </button>
        </form>
      </div>
    </div>
  )
}
