import { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ShieldCheck, Lock, AlertTriangle, Eye, EyeOff, Delete } from 'lucide-react'
import { formatVnd } from '@/lib/format'
import { authApi } from '../api/auth.api'
import { errorMessage } from '@/lib/apiResponse'

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

export function PinModal({
  open,
  onOpenChange,
  title = 'Xác thực mã PIN giao dịch',
  description = 'Vui lòng nhập mã PIN bảo mật 6 số để tiếp tục giao dịch.',
  paymentId,
  amount,
  onSuccess,
  onCancel
}: PinModalProps) {
  const [pin, setPin] = useState<string[]>(Array(6).fill(''))
  const [showPin, setShowPin] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [, setAttemptsRemaining] = useState(5)
  const [isLocked, setIsLocked] = useState(false)
  const [lockCountdown, setLockCountdown] = useState(300)

  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Reset trạng thái khi mở modal
  useEffect(() => {
    if (open) {
      setPin(Array(6).fill(''))
      setErrorMsg(null)
      setIsLoading(false)
      // Focus vào ô đầu tiên sau khi modal mở
      setTimeout(() => {
        inputRefs.current[0]?.focus()
      }, 100)
    }
  }, [open])

  // Đếm ngược khi bị khóa mã PIN (PIN_LOCKED)
  useEffect(() => {
    if (!isLocked) return

    if (lockCountdown <= 0) {
      setIsLocked(false)
      setAttemptsRemaining(5)
      setLockCountdown(300)
      setErrorMsg(null)
      return
    }

    const timer = setInterval(() => {
      setLockCountdown((prev) => prev - 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [isLocked, lockCountdown])

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

  // Hàm xác thực mã PIN qua backend API
  const verifyPin = async (inputPin: string) => {
    setIsLoading(true)
    setErrorMsg(null)

    try {
      const res = await authApi.verifyPin({
        pin: inputPin,
        paymentId: paymentId || 'default',
        amount: amount || '0'
      })

      // Xóa mã PIN khỏi state ngay sau khi gửi thành công
      setPin(Array(6).fill(''))
      onSuccess(res.transactionToken)
      onOpenChange?.(false)
    } catch (err: unknown) {
      // Xóa mã PIN khỏi state ngay lập tức vì lý do bảo mật
      setPin(Array(6).fill(''))

      if (axios.isAxiosError(err)) {
        const errorData = err.response?.data?.error || err.response?.data
        const code = errorData?.code
        const details = errorData?.details || errorData

        if (code === 'PIN_LOCKED') {
          setIsLocked(true)
          const remainingSec =
            details?.remainingSeconds ||
            (details?.lockedUntil
              ? Math.max(1, Math.round((new Date(details.lockedUntil).getTime() - Date.now()) / 1000))
              : 300)
          setLockCountdown(remainingSec)
          setErrorMsg(errorData?.message || 'Tài khoản bị tạm khóa giao dịch do nhập sai mã PIN quá 5 lần.')
          return
        }

        if (code === 'INVALID_PIN' || code === 'PIN_INVALID') {
          const remaining = details?.remainingAttempts ?? details?.attemptsRemaining ?? details?.attemptsLeft
          if (typeof remaining === 'number') {
            setAttemptsRemaining(remaining)
            setErrorMsg(`Mã PIN không chính xác. Bạn còn ${remaining} lần thử.`)
          } else {
            setErrorMsg(errorData?.message || 'Mã PIN không chính xác.')
          }
          setTimeout(() => {
            inputRefs.current[0]?.focus()
          }, 50)
          return
        }

        if (code === 'PIN_NOT_SETUP' || code === 'PIN_NOT_SET') {
          setErrorMsg('Bạn chưa thiết lập mã PIN giao dịch. Vui lòng cài đặt mã PIN trong Cài đặt.')
          return
        }

        setErrorMsg(errorData?.message || errorMessage(code) || 'Xác thực mã PIN thất bại. Vui lòng thử lại.')
      } else {
        setErrorMsg('Không thể kết nối đến máy chủ. Vui lòng thử lại.')
      }
      setTimeout(() => {
        inputRefs.current[0]?.focus()
      }, 50)
    } finally {
      setIsLoading(false)
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
              {formatVnd(amount)}
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
                <span>Mã hóa bảo mật 2 lớp</span>
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
            Hủy bỏ giao dịch
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default PinModal
