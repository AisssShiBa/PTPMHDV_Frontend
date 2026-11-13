import axios from 'axios'
import { useState, useRef, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ShieldCheck, Lock, AlertTriangle, Eye, EyeOff, Delete } from 'lucide-react'
import { useAuthStore } from '../stores/useAuthStore'
import { authApi } from '../api/auth.api'
import { errorMessage } from '@/lib/apiResponse'
import { formatVndExact } from '@/lib/format'

export interface PinModalProps {
  open: boolean
  onOpenChange?: (open: boolean) => void
  title?: string
  description?: string
  paymentId?: string
  amount?: string
  onSuccess: (transactionToken: string) => void
  onCancel?: () => void
}

export function PinModal(props: PinModalProps) {
  const owner = useAuthStore((state) => state.user?.id)
  return props.open ? <PinModalSession key={[owner, props.paymentId, props.amount].join(':')} {...props} /> : null
}

function PinModalSession({
  open,
  onOpenChange,
  title = 'Xác thực mã PIN giao dịch',
  description = 'Vui lòng nhập mã PIN bảo mật 6 số để tiếp tục giao dịch.',
  amount,
  paymentId,
  onSuccess,
  onCancel
}: PinModalProps) {
  const [pin, setPin] = useState<string[]>(Array(6).fill(''))
  const [showPin, setShowPin] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [lockedUntil, setLockedUntil] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const active = useRef(true)
  const verifying = useRef(false)
  const lockCountdown = lockedUntil ? Math.max(0, Math.ceil((lockedUntil - now) / 1000)) : 0
  const isLocked = lockCountdown > 0
  useEffect(() => { active.current = true; return () => { active.current = false } }, [])
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Xử lý khi gõ ký tự vào từng ô
  const handleDigitChange = (index: number, value: string) => {
    if (isLocked || isLoading) return

    // Chỉ nhận ký tự số từ 0 đến 9
    const cleanValue = value.replace(/\D/g, '')
    if (!cleanValue) {
      const newPin = [...pin]
      newPin[index] = ''
      setPin(newPin)
      return
    }

    const lastDigit = cleanValue.slice(-1)
    const newPin = [...pin]
    newPin[index] = lastDigit
    setPin(newPin)
    setErrorMsg(null)

    // Tự động nhảy focus sang ô tiếp theo
    if (index < 5 && lastDigit) {
      inputRefs.current[index + 1]?.focus()
    }

    // Nếu đã nhập đủ 6 số -> Tự động xác thực
    const fullPin = newPin.join('')
    if (fullPin.length === 6 && !newPin.includes('')) {
      verifyPin(fullPin)
    }
  }

  // Xử lý phím Backspace điều hướng lùi
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  // Xử lý dán (Paste) mã 6 số từ clipboard
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (isLocked || isLoading) return

    const pasteData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasteData) return

    const newPin = Array(6).fill('')
    for (let i = 0; i < pasteData.length; i++) {
      newPin[i] = pasteData[i]
    }
    setPin(newPin)

    if (pasteData.length === 6) {
      verifyPin(pasteData)
    } else {
      inputRefs.current[pasteData.length]?.focus()
    }
  }

  // Xử lý bàn phím số ảo on-screen
  const handleVirtualKey = (key: string) => {
    if (isLocked || isLoading) return

    if (key === 'del') {
      const lastFilledIndex = pin.findLastIndex((d) => d !== '')
      if (lastFilledIndex >= 0) {
        const newPin = [...pin]
        newPin[lastFilledIndex] = ''
        setPin(newPin)
        inputRefs.current[lastFilledIndex]?.focus()
      }
      return
    }

    const firstEmptyIndex = pin.findIndex((d) => d === '')
    if (firstEmptyIndex !== -1) {
      handleDigitChange(firstEmptyIndex, key)
    }
  }

  // Only the Auth API can issue a transaction token for this order.
  const verifyPin = async (inputPin: string) => {
    if (verifying.current || isLocked) return
    if (!paymentId || !amount) {
      setErrorMsg('Giao dịch chưa sẵn sàng để xác thực mã PIN.')
      setPin(Array(6).fill(''))
      return
    }
    verifying.current = true
    setIsLoading(true)
    setErrorMsg(null)
    try {
      const result = await authApi.verifyPin({ pin: inputPin, paymentId, amount })
      if (!active.current) return
      setPin(Array(6).fill(''))
      onSuccess(result.transactionToken)
      onOpenChange?.(false)
    } catch (error) {
      if (!active.current) return
      const details = axios.isAxiosError(error) ? error.response?.data?.error : undefined
      const remaining = details?.details?.remainingAttempts ?? details?.remainingAttempts ?? details?.details?.attemptsRemaining
      if (['INVALID_PIN', 'PIN_INVALID'].includes(details?.code) && typeof remaining === 'number' && Number.isInteger(remaining) && remaining >= 0 && remaining <= 5) {
        setErrorMsg(`Mã PIN không chính xác. Bạn còn ${remaining} lần thử.`)
      } else setErrorMsg(errorMessage(error))
      setPin(Array(6).fill(''))
      try {
        const status = await authApi.getPinStatus()
        if (!active.current) return
        const deadline = status.lockedUntil ? Date.parse(status.lockedUntil) : NaN
        setNow(() => Date.now())
        setLockedUntil(status.isLocked && Number.isFinite(deadline) ? deadline : null)
      } catch { /* Preserve the original verification error. */ }
      inputRefs.current[0]?.focus()
    } finally {
      verifying.current = false
      if (active.current) setIsLoading(false)
    }
  }

  // Format đếm ngược phút:giây
  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleClose = () => {
    onCancel?.()
    onOpenChange?.(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md p-6 sm:p-8 bg-card border-border shadow-2xl rounded-2xl">
        <DialogHeader className="text-center space-y-2 sm:text-center">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shadow-sm">
            <Lock className="h-6 w-6" />
          </div>
          <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
            {title}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {description}
          </DialogDescription>
        </DialogHeader>

        {/* Thông tin số tiền giao dịch nếu có */}
        {amount && (
          <div className="p-3 rounded-xl bg-muted/40 border border-border/60 flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">Số tiền thanh toán:</span>
            <span className="font-extrabold text-primary text-base tracking-tight">
              {formatVndExact(amount)} ₫
            </span>
          </div>
        )}

        {/* Trạng thái bị khóa PIN_LOCKED */}
        {isLocked ? (
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-center space-y-2">
            <div className="flex items-center justify-center gap-1.5 text-destructive font-semibold text-sm">
              <AlertTriangle className="h-4 w-4" />
              <span>Tài khoản tạm khóa giao dịch</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Vui lòng thử lại sau: <strong className="text-foreground">{formatCountdown(lockCountdown)}</strong>
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 6 Ô NHẬP MÃ PIN */}
            <div className="flex justify-center items-center gap-2 sm:gap-3 py-2">
              {pin.map((digit, index) => (
                <div key={index} className="relative">
                  <input
                    ref={(el) => {
                      inputRefs.current[index] = el
                    }}
                    autoFocus={index === 0}
                    aria-label={`Chữ số PIN ${index + 1}`}
                    type={showPin ? 'text' : 'password'}
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    disabled={isLocked || isLoading}
                    onChange={(e) => handleDigitChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={handlePaste}
                    className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-bold rounded-xl border bg-surface-container-lowest text-foreground outline-none transition-all duration-150 ${
                      digit
                        ? 'border-primary ring-2 ring-primary/15'
                        : 'border-input focus:border-primary focus:ring-2 focus:ring-primary/20'
                    } ${errorMsg ? 'border-destructive ring-destructive/20' : ''}`}
                  />
                  {/* Hiệu ứng chấm tròn nếu đang che mật khẩu và có giá trị */}
                  {!showPin && digit && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <div className="h-3 w-3 rounded-full bg-primary" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Nút bật/tắt hiển thị mã PIN */}
            <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
              <div className="flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span>Xác thực PIN qua hệ thống</span>
              </div>
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="flex items-center gap-1 text-primary hover:underline font-medium cursor-pointer"
              >
                {showPin ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                <span>{showPin ? 'Ẩn mã PIN' : 'Hiện mã PIN'}</span>
              </button>
            </div>

            {/* Thông báo lỗi nếu có */}
            {errorMsg && (
              <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive text-center font-medium animate-shake">
                {errorMsg}
              </div>
            )}

            {/* BÀN PHÍM SỐ ẢO ON-SCREEN BẢO MẬT */}
            <div className="pt-2">
              <div className="grid grid-cols-3 gap-2 max-w-[280px] mx-auto">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => handleVirtualKey(num)}
                    disabled={isLocked || isLoading}
                    className="h-11 rounded-xl bg-muted/60 hover:bg-muted font-bold text-base text-foreground transition-all duration-100 active:scale-95 flex items-center justify-center shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    {num}
                  </button>
                ))}
                <div />
                <button
                  type="button"
                  onClick={() => handleVirtualKey('0')}
                  disabled={isLocked || isLoading}
                  className="h-11 rounded-xl bg-muted/60 hover:bg-muted font-bold text-base text-foreground transition-all duration-100 active:scale-95 flex items-center justify-center shadow-xs cursor-pointer disabled:opacity-50"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={() => handleVirtualKey('del')}
                  disabled={isLocked || isLoading}
                  aria-label="Xóa ký tự vừa nhập"
                  className="h-11 rounded-xl bg-muted/40 hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-all duration-100 active:scale-95 flex items-center justify-center shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <Delete className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Nút hủy giao dịch */}
        <div className="pt-2 flex justify-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClose}
            className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
          >
            Đóng xác thực
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default PinModal
