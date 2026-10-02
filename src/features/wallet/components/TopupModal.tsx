import { useState, useEffect } from 'react'
import { paymentService } from '@/features/payment/services/paymentService'
import { useAuthStore } from '@/features/auth/stores/useAuthStore'
import { X, PlusCircle, Loader2, ChevronUp, ChevronDown, CheckCircle2, Copy, AlertCircle, Timer } from 'lucide-react'
import { toast } from 'sonner'
import type { TopupResponse } from '@/features/payment/types/payment.types'

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
  const [topupData, setTopupData] = useState<TopupResponse | null>(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [status, setStatus] = useState<'PENDING' | 'APPROVED' | 'EXPIRED' | 'REJECTED'>('PENDING')

  // Reset state when closed
  useEffect(() => {
    if (!isOpen) {
      setAmountDisplay('100,000')
      setAmountValue('100000')
      setTopupData(null)
      setStatus('PENDING')
      setTimeLeft(0)
    }
  }, [isOpen])

  // Polling for status
  useEffect(() => {
    if (!isOpen || !topupData || status !== 'PENDING') return

    const pollStatus = async () => {
      try {
        const res = await paymentService.getTopupStatus(topupData.topup.id)
        if (res.status === 'APPROVED') {
          setStatus('APPROVED')
          toast.success('Nạp tiền thành công!')
          onSuccess?.()
        } else if (res.status === 'REJECTED') {
          setStatus('REJECTED')
          toast.error('Yêu cầu nạp tiền đã bị từ chối')
        } else if (res.status === 'EXPIRED') {
          setStatus('EXPIRED')
        }
      } catch (error) {
        console.error('Lỗi khi kiểm tra trạng thái', error)
      }
    }

    const intervalId = setInterval(pollStatus, 5000)
    return () => clearInterval(intervalId)
  }, [isOpen, topupData, status, onSuccess])

  // Countdown timer
  useEffect(() => {
    if (!topupData || status !== 'PENDING') return

    const expiryTime = new Date(topupData.topup.expiresAt).getTime()

    const updateTimer = () => {
      const now = new Date().getTime()
      const diff = Math.floor((expiryTime - now) / 1000)

      if (diff <= 0) {
        setTimeLeft(0)
        setStatus('EXPIRED')
      } else {
        setTimeLeft(diff)
      }
    }

    updateTimer()
    const timerId = setInterval(updateTimer, 1000)

    return () => clearInterval(timerId)
  }, [topupData, status])

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

  const handleCreateTopup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.id) {
      toast.error('Vui lòng đăng nhập để nạp tiền')
      return
    }
    if (!amountValue || Number(amountValue) < 10000) {
      toast.error('Số tiền nạp tối thiểu là 10,000 VND')
      return
    }

    try {
      setLoading(true)
      const res = await paymentService.createTopup(amountValue) as TopupResponse
      setTopupData(res)
      setStatus('PENDING')
    } catch (err: any) {
      toast.error('Tạo yêu cầu nạp tiền thất bại: ' + (err?.response?.data?.error?.message || err.message))
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0')
    const s = (seconds % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`Đã sao chép ${label}`)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-md rounded-2xl bg-card border border-border p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200 my-8">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2 text-foreground font-bold text-lg">
            <PlusCircle className="size-5 text-primary" />
            <span>Nạp tiền vào ví</span>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted text-muted-foreground transition-colors">
            <X className="size-4" />
          </button>
        </div>

        {/* STEP 1: INPUT AMOUNT */}
        {!topupData && (
          <form onSubmit={handleCreateTopup} className="space-y-4">
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
              disabled={loading || !amountValue || Number(amountValue) < 10000}
              className="w-full rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 transition-all mt-4"
            >
              {loading && <Loader2 className="size-4 animate-spin" />}
              Tiếp tục
            </button>
          </form>
        )}

        {/* STEP 2 & 3: QR SCANNER & STATUS */}
        {topupData && status === 'PENDING' && (
          <div className="space-y-5">
            <div className="text-center space-y-1">
              <h3 className="font-semibold text-lg">Quét mã để thanh toán</h3>
              <p className="text-sm text-muted-foreground">Sử dụng App Ngân hàng hoặc Ví điện tử để quét mã</p>
            </div>

            <div className="flex justify-center">
              <div className="p-3 bg-white rounded-2xl shadow-sm border border-border">
                <img
                  src={topupData.paymentInfo.qrUrl}
                  alt="QR Code"
                  className="w-48 h-48 object-contain"
                />
              </div>
            </div>

            <div className="bg-muted/50 rounded-xl p-4 space-y-3 text-sm">
              <div className="flex justify-between items-center pb-2 border-b border-border/50">
                <span className="text-muted-foreground">Ngân hàng</span>
                <span className="font-semibold">{topupData.paymentInfo.bankName}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-border/50">
                <span className="text-muted-foreground">Chủ tài khoản</span>
                <span className="font-semibold">{topupData.paymentInfo.accountName}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-border/50">
                <span className="text-muted-foreground">Số tài khoản</span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{topupData.paymentInfo.accountNumber}</span>
                  <button onClick={() => handleCopy(topupData.paymentInfo.accountNumber, 'Số tài khoản')} className="text-primary hover:text-primary/80">
                    <Copy className="size-4" />
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-border/50">
                <span className="text-muted-foreground">Số tiền</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-primary">{topupData.paymentInfo.amount.toLocaleString('vi-VN')} VND</span>
                  <button onClick={() => handleCopy(topupData.paymentInfo.amount.toString(), 'Số tiền')} className="text-primary hover:text-primary/80">
                    <Copy className="size-4" />
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-muted-foreground">Nội dung (Bắt buộc)</span>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded">{topupData.paymentInfo.content}</span>
                  <button onClick={() => handleCopy(topupData.paymentInfo.content, 'Nội dung')} className="text-primary hover:text-primary/80">
                    <Copy className="size-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-rose-500 font-medium">
              <Timer className="size-4 animate-pulse" />
              <span>Giao dịch hết hạn sau: {formatTime(timeLeft)}</span>
            </div>
            
            <div className="flex items-center justify-center gap-2 text-muted-foreground text-xs mt-2">
              <Loader2 className="size-3 animate-spin" />
              <span>Hệ thống đang chờ bạn thanh toán...</span>
            </div>
          </div>
        )}

        {topupData && status === 'APPROVED' && (
          <div className="py-8 flex flex-col items-center text-center space-y-4 animate-in zoom-in duration-300">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center">
              <CheckCircle2 className="size-10" />
            </div>
            <h3 className="text-xl font-bold text-emerald-500">Nạp tiền thành công!</h3>
            <p className="text-muted-foreground text-sm">
              {Number(topupData.topup.amount).toLocaleString('vi-VN')} VND đã được cộng vào ví của bạn.
            </p>
            <button
              onClick={onClose}
              className="mt-6 w-full rounded-xl bg-emerald-500 text-white font-bold py-3 hover:bg-emerald-600 transition-colors"
            >
              Đóng
            </button>
          </div>
        )}

        {topupData && status === 'EXPIRED' && (
          <div className="py-8 flex flex-col items-center text-center space-y-4 animate-in zoom-in duration-300">
            <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center">
              <Timer className="size-10" />
            </div>
            <h3 className="text-xl font-bold text-rose-500">Giao dịch đã hết hạn</h3>
            <p className="text-muted-foreground text-sm">
              Bạn đã quá thời gian thanh toán. Vui lòng tạo yêu cầu nạp tiền mới.
            </p>
            <button
              onClick={() => {
                setTopupData(null)
                setStatus('PENDING')
              }}
              className="mt-6 w-full rounded-xl bg-primary text-white font-bold py-3 hover:bg-primary/90 transition-colors"
            >
              Thử lại
            </button>
          </div>
        )}
        
        {topupData && status === 'REJECTED' && (
          <div className="py-8 flex flex-col items-center text-center space-y-4 animate-in zoom-in duration-300">
            <div className="w-16 h-16 bg-rose-100 text-rose-500 rounded-full flex items-center justify-center">
              <AlertCircle className="size-10" />
            </div>
            <h3 className="text-xl font-bold text-rose-500">Giao dịch bị từ chối</h3>
            <p className="text-muted-foreground text-sm">
              Yêu cầu nạp tiền của bạn đã bị từ chối bởi quản trị viên.
            </p>
            <button
              onClick={onClose}
              className="mt-6 w-full rounded-xl border border-border font-bold py-3 hover:bg-muted transition-colors"
            >
              Đóng
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
