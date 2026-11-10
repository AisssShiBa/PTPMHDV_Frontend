import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  Info,
  Lock,
  Printer,
  Receipt,
  RotateCcw,
  Search,
  ShieldCheck,
  UserCheck,
  Wallet,
  AlertTriangle,
  Clock,
  RefreshCw
} from 'lucide-react'
import { useAuthStore } from '@/features/auth/stores/useAuthStore'
import { PinModal } from '@/features/auth/components/PinModal'
import { useWalletMe, walletKeys } from '@/features/wallet'
import { paymentApi, type P2pQuoteResult, type LimitExceededDetails } from '@/features/payment'
import { useRecipientLookup } from '@/features/user/hooks/useRecipientLookup'
import {
  formatVnd,
  formatDateTime,
  isValidMoneyInput,
  validateTransferAmount
} from '@/lib/format'
import { errorDetails } from '@/lib/apiResponse'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import axios from 'axios'

const QUICK_AMOUNTS = [
  { label: '50.000 ₫', value: '50000' },
  { label: '100.000 ₫', value: '100000' },
  { label: '200.000 ₫', value: '200000' },
  { label: '500.000 ₫', value: '500000' },
  { label: '1.000.000 ₫', value: '1000000' }
]

export function TransferPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const authUserId = user?.id || ''

  // Số dư ví thực tế từ GET /api/wallets/me
  const { data: wallet } = useWalletMe()
  const availableBalance = wallet?.availableBalance ?? wallet?.balance ?? user?.balance ?? '0'

  // Hook tra cứu người nhận chuẩn bảo mật (404 / 429 cooldown)
  const {
    query: recipientQuery,
    changeQuery: setRecipientQuery,
    recipient,
    error: recipientError,
    loading: isLookingUp,
    remaining: cooldownRemaining,
    lookup: triggerLookup
  } = useRecipientLookup(authUserId)

  // Step: 1 = Nhập dữ liệu & Báo giá, 2 = Xác nhận báo giá (60s), 3 = Biên lai hoàn tất
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1)

  // Query Client để cập nhật tức thì số dư và lịch sử giao dịch
  const queryClient = useQueryClient()

  // Form states
  const [amount, setAmount] = useState('50000')
  const [message, setMessage] = useState('Chuyển tiền FinVault')
  const [isQuoting, setIsQuoting] = useState(false)
  const [copiedTxn, setCopiedTxn] = useState(false)

  // Idempotency-Key được sinh mỗi khi khởi tạo ý định chuyển mới, giữ nguyên khi thử lại
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() => crypto.randomUUID())
  const [paymentId, setPaymentId] = useState<string | null>(null)
  const [isCheckingOut, setIsCheckingOut] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)

  // Trạng thái timeout / mạng
  const [processingState, setProcessingState] = useState<
    | null
    | {
        phase: 'checkout'
        message: string
      }
    | {
        phase: 'confirm'
        paymentId: string
        pollAttempts: number
        isPolling: boolean
        message: string
      }
  >(null)

  // Giao dịch thất bại
  const [failedTxn, setFailedTxn] = useState<{
    id: string
    status: string
    reason: string
  } | null>(null)

  // Quote state & 60s countdown
  const [quote, setQuote] = useState<P2pQuoteResult | null>(null)
  const [quoteCountdown, setQuoteCountdown] = useState<number>(60)
  const [limitExceededError, setLimitExceededError] = useState<{
    message: string
    limitType?: string
    limit?: string
    remaining?: string
  } | null>(null)

  // PIN Modal state
  const [pinModalOpen, setPinModalOpen] = useState(false)

  // Giao dịch đã hoàn tất
  const [completedTxn, setCompletedTxn] = useState<{
    id: string
    timestamp: string
    recipientName: string
    recipientPhone: string
    amount: string
    fee: string
    message: string
    token: string
  } | null>(null)

  // Đồng hồ đếm ngược 60s cho báo giá tại Bước 2
  useEffect(() => {
    if (currentStep !== 2 || !quote) return

    setQuoteCountdown(60)
    const timer = setInterval(() => {
      setQuoteCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [currentStep, quote])

  // Xử lý thay đổi số tiền chỉ nhận số nguyên
  const handleAmountChange = (val: string) => {
    const cleanDigits = val.replace(/\D/g, '')
    setAmount(cleanDigits)
    setLimitExceededError(null)
    setQuote(null)
    setPaymentId(null)
    setIdempotencyKey(crypto.randomUUID())
  }

  // Bước 1 -> Gọi Quote: POST /api/payments/p2p/quote
  const handleRequestQuote = async (e: React.FormEvent) => {
    e.preventDefault()
    setLimitExceededError(null)

    if (!recipient) {
      toast.error('Vui lòng kiểm tra và xác nhận người nhận tiền hợp lệ.')
      return
    }

    if (!isValidMoneyInput(amount)) {
      toast.error('Vui lòng nhập số tiền hợp lệ.')
      return
    }

    const valResult = validateTransferAmount(amount, availableBalance)
    if (!valResult.valid) {
      toast.error(valResult.error || 'Số tiền không hợp lệ.')
      return
    }

    setIsQuoting(true)
    try {
      const quoteRes = await paymentApi.p2pQuote({
        destinationUserId: recipient.authUserId,
        amount
      })
      setQuote(quoteRes)
      setCurrentStep(2)
      toast.success('Báo giá giao dịch thành công (có hiệu lực trong 60 giây).')
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 422) {
        const details = errorDetails<LimitExceededDetails>(err)
        if (details?.limitType) {
          let limitMsg = ''
          const limitFormatted = formatVnd(details.limit || '0')
          const remainingFormatted = formatVnd(details.remaining || '0')

          if (details.limitType === 'PER_TXN') {
            limitMsg = `Vượt quá hạn mức tối đa cho mỗi lần chuyển (${limitFormatted}). Bạn còn được chuyển tối đa ${remainingFormatted} trong lần này.`
          } else if (details.limitType === 'PER_DAY') {
            limitMsg = `Vượt quá hạn mức giao dịch trong ngày (${limitFormatted}). Hôm nay bạn chỉ còn được chuyển thêm ${remainingFormatted}.`
          } else if (details.limitType === 'PER_MONTH') {
            limitMsg = `Vượt quá hạn mức giao dịch trong tháng (${limitFormatted}). Trong tháng này bạn chỉ còn lại ${remainingFormatted}.`
          } else {
            limitMsg = `Giao dịch vượt quá hạn mức quy định (${limitFormatted}).`
          }

          setLimitExceededError({
            message: limitMsg,
            limitType: details.limitType,
            limit: details.limit,
            remaining: details.remaining
          })
          toast.error(limitMsg)
          return
        }
      }
      toast.error(err instanceof Error ? err.message : 'Không thể lấy báo giá giao dịch. Vui lòng thử lại.')
    } finally {
      setIsQuoting(false)
    }
  }

  // Làm mới lại báo giá khi hết hạn 60s
  const handleRefreshQuote = async () => {
    if (!recipient) return
    setIsQuoting(true)
    try {
      const quoteRes = await paymentApi.p2pQuote({
        destinationUserId: recipient.authUserId,
        amount
      })
      setQuote(quoteRes)
      setQuoteCountdown(60)
      setPaymentId(null)
      toast.success('Đã cập nhật báo giá giao dịch mới (60 giây).')
    } catch {
      toast.error('Không thể làm mới báo giá. Vui lòng quay lại Bước 1.')
      setCurrentStep(1)
    } finally {
      setIsQuoting(false)
    }
  }

  // Kiểm tra lỗi timeout hoặc sự cố mạng
  const isNetworkOrTimeout = (err: unknown): boolean => {
    if (axios.isAxiosError(err)) {
      if (err.code === 'ECONNABORTED' || err.message?.toLowerCase().includes('timeout')) return true
      if (!err.response) return true
      const status = err.response.status
      if (status === 504 || status === 502 || status === 503 || status === 408) return true
      const code = err.response.data?.error?.code || err.response.data?.code
      if (code === 'PAYMENT_PROCESSING' || code === 'GATEWAY_TIMEOUT') return true
    }
    return false
  }

  // Polling tra cứu trạng thái giao dịch khi confirm bị timeout (backoff 1s, 2s, 4s, tối đa 30s)
  const pollPaymentStatus = async (
    targetPaymentId: string,
    attempt = 0,
    startTime = Date.now()
  ) => {
    const elapsed = Date.now() - startTime
    // Nếu quá trần 30 giây mà trạng thái vẫn PENDING: giữ "Đang xử lý", hiển thị nút "Kiểm tra lại" và link sang Lịch sử
    if (elapsed >= 30000) {
      setProcessingState({
        phase: 'confirm',
        paymentId: targetPaymentId,
        pollAttempts: attempt,
        isPolling: false,
        message:
          'Giao dịch đang được tiếp tục xử lý. Bạn có thể bấm "Kiểm tra lại" hoặc theo dõi trạng thái giao dịch tại trang Lịch sử giao dịch.'
      })
      setIsConfirming(false)
      return
    }

    setProcessingState({
      phase: 'confirm',
      paymentId: targetPaymentId,
      pollAttempts: attempt,
      isPolling: true,
      message: 'Hệ thống đang kiểm tra trạng thái giao dịch...'
    })

    // Backoff: 1s, 2s, 4s (tối đa 4s mỗi bước)
    const delayMs = attempt === 0 ? 500 : Math.min(1000 * Math.pow(2, attempt - 1), 4000)
    await new Promise((resolve) => setTimeout(resolve, delayMs))

    try {
      const record = await paymentApi.getPaymentById(targetPaymentId)
      const st = record.status

      if (st === 'SUCCESS') {
        queryClient.invalidateQueries({ queryKey: walletKeys.all })
        setCompletedTxn({
          id: targetPaymentId,
          timestamp: record.createdAt || new Date().toISOString(),
          recipientName: recipient?.maskedName || 'Người nhận',
          recipientPhone: recipientQuery,
          amount: quote?.amount || amount,
          fee: quote?.fee || '0',
          message: message.trim() || 'Chuyển tiền FinVault',
          token: ''
        })
        setProcessingState(null)
        setIsConfirming(false)
        setCurrentStep(3)
        toast.success('Chuyển tiền thành công!', {
          description: `Đã gửi ${formatVnd(amount)} tới ${recipient?.maskedName}.`
        })
        return
      }

      if (st === 'FAILED' || st === 'EXPIRED' || st === 'CANCELLED') {
        setFailedTxn({
          id: targetPaymentId,
          status: st,
          reason:
            st === 'EXPIRED'
              ? 'Giao dịch đã hết thời gian hiệu lực.'
              : st === 'CANCELLED'
                ? 'Giao dịch đã bị hủy bỏ.'
                : 'Giao dịch không thành công hoặc bị từ chối từ hệ thống.'
        })
        setProcessingState(null)
        setIsConfirming(false)
        setCurrentStep(3)
        return
      }

      // Vẫn PENDING -> tiếp tục nhịp sau
      await pollPaymentStatus(targetPaymentId, attempt + 1, startTime)
    } catch {
      if (Date.now() - startTime < 30000) {
        await pollPaymentStatus(targetPaymentId, attempt + 1, startTime)
      } else {
        setProcessingState({
          phase: 'confirm',
          paymentId: targetPaymentId,
          pollAttempts: attempt,
          isPolling: false,
          message:
            'Giao dịch đang được tiếp tục xử lý. Bạn có thể bấm "Kiểm tra lại" hoặc theo dõi trạng thái giao dịch tại trang Lịch sử giao dịch.'
        })
        setIsConfirming(false)
      }
    }
  }

  // Bấm "Xác nhận chuyển tiền" tại Bước 2: gọi POST /api/payments/p2p/checkout kèm Idempotency-Key
  const handleStartCheckout = async () => {
    if (quoteCountdown <= 0) {
      toast.error('Báo giá đã hết hạn. Vui lòng lấy lại báo giá mới.')
      return
    }

    if (!recipient) {
      toast.error('Vui lòng chọn người nhận hợp lệ.')
      return
    }

    // Nếu đã checkout thành công trước đó (có paymentId) thì mở lại PinModal ngay
    if (paymentId) {
      setPinModalOpen(true)
      return
    }

    setIsCheckingOut(true)
    setProcessingState(null)
    try {
      const checkoutRes = await paymentApi.p2pCheckout(
        {
          destinationUserId: recipient.authUserId,
          amount,
          note: message.trim() || undefined
        },
        idempotencyKey
      )

      const pId = checkoutRes.paymentId || checkoutRes.id || ''
      setPaymentId(pId)
      setPinModalOpen(true)
    } catch (err: unknown) {
      if (isNetworkOrTimeout(err)) {
        setProcessingState({
          phase: 'checkout',
          message:
            'Yêu cầu chuyển tiền đang được xử lý hoặc gặp sự cố đường truyền mạng. Vui lòng bấm Thử lại để kiểm tra kết quả với cùng khóa giao dịch.'
        })
        return
      }

      if (axios.isAxiosError(err)) {
        const errorData = err.response?.data?.error || err.response?.data
        const code = errorData?.code
        const details = (errorDetails(err) || errorData?.details) as LimitExceededDetails | undefined

        if (code === 'LIMIT_EXCEEDED' && details) {
          const limitTypeLabel =
            details.limitType === 'PER_TXN'
              ? 'mỗi lần'
              : details.limitType === 'PER_DAY'
                ? 'mỗi ngày'
                : 'mỗi tháng'
          toast.error(
            `Vượt hạn mức ${limitTypeLabel}. Bạn còn được chuyển tối đa ${formatVnd(details.remaining)}.`
          )
          return
        }

        if (code === 'INSUFFICIENT_FUNDS') {
          toast.error('Số dư khả dụng trong ví không đủ để thực hiện giao dịch.')
          return
        }

        if (code === 'IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD') {
          setIdempotencyKey(crypto.randomUUID())
          toast.error('Khóa giao dịch bị trùng lặp với nội dung khác. Vui lòng thử lại.')
          return
        }

        toast.error(errorData?.message || 'Không thể tạo phiên chuyển tiền. Vui lòng thử lại.')
      } else {
        toast.error('Lỗi kết nối khi khởi tạo phiên giao dịch.')
      }
    } finally {
      setIsCheckingOut(false)
    }
  }

  // Khi nhập mã PIN thành công và nhận transactionToken: gọi POST /api/payments/:id/confirm
  const handlePinSuccess = async (transactionToken: string) => {
    if (!paymentId) {
      toast.error('Không tìm thấy mã giao dịch để xác nhận.')
      return
    }

    setIsConfirming(true)
    setPinModalOpen(false)
    setProcessingState(null)

    try {
      await paymentApi.confirmPayment(paymentId, transactionToken)

      // Cập nhật lại số dư ví và sổ cái tức thì
      queryClient.invalidateQueries({ queryKey: walletKeys.all })

      setCompletedTxn({
        id: paymentId,
        timestamp: new Date().toISOString(),
        recipientName: recipient?.maskedName || 'Người nhận',
        recipientPhone: recipientQuery,
        amount: quote?.amount || amount,
        fee: quote?.fee || '0',
        message: message.trim() || 'Chuyển tiền FinVault',
        token: transactionToken
      })

      setCurrentStep(3)
      toast.success('Chuyển tiền thành công!', {
        description: `Đã gửi ${formatVnd(amount)} tới ${recipient?.maskedName}.`
      })
    } catch (err: unknown) {
      if (isNetworkOrTimeout(err)) {
        // Confirm timeout/mạng: KHÔNG gọi confirm lại bằng token cũ
        // Chuyển sang poll GET /payments/:id
        await pollPaymentStatus(paymentId, 0, Date.now())
        return
      }

      if (axios.isAxiosError(err)) {
        const errorData = err.response?.data?.error || err.response?.data
        const code = errorData?.code

        if (code === 'TXN_TOKEN_EXPIRED') {
          toast.error('Mã xác thực giao dịch đã hết hạn. Vui lòng nhập lại mã PIN.')
          // Mở lại PinModal với cùng paymentId
          setPinModalOpen(true)
          return
        }

        if (code === 'PAYMENT_EXPIRED') {
          toast.error('Giao dịch đã hết thời gian giữ tiền (5 phút). Vui lòng thực hiện lại từ đầu.')
          handleResetNewTransfer()
          return
        }

        if (code === 'TXN_TOKEN_REUSED') {
          toast.error('Mã xác thực giao dịch đã được sử dụng. Vui lòng nhập lại mã PIN.')
          setPinModalOpen(true)
          return
        }

        if (code === 'TXN_TOKEN_MISMATCH') {
          toast.error('Mã xác thực không hợp lệ cho giao dịch này.')
          return
        }

        if (code === 'PAYMENT_NOT_PENDING') {
          toast.error('Giao dịch không còn ở trạng thái chờ xác nhận.')
          return
        }

        toast.error(errorData?.message || 'Xác nhận giao dịch thất bại. Vui lòng thử lại.')
      } else {
        toast.error('Lỗi kết nối khi xác nhận giao dịch.')
      }
    } finally {
      setIsConfirming(false)
    }
  }

  // Sao chép mã giao dịch
  const handleCopyTxnId = (id: string) => {
    navigator.clipboard.writeText(id)
    setCopiedTxn(true)
    toast.success('Đã sao chép mã giao dịch vào bộ nhớ tạm')
    setTimeout(() => setCopiedTxn(false), 2000)
  }

  // Reset form để làm giao dịch mới hoàn toàn
  const handleResetNewTransfer = () => {
    setCurrentStep(1)
    setQuote(null)
    setLimitExceededError(null)
    setAmount('50000')
    setMessage('Chuyển tiền FinVault')
    setCompletedTxn(null)
    setFailedTxn(null)
    setPaymentId(null)
    setProcessingState(null)
    setIdempotencyKey(crypto.randomUUID())
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header khu vực làm việc */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary text-xs font-semibold uppercase tracking-wider mb-1">
            <ShieldCheck className="h-4 w-4" />
            <span>Chuyển tiền P2P tức thì 24/7</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Chuyển tiền nội bộ & liên ví
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Giao dịch tức thì, miễn phí trọn đời tới mọi người dùng trong hệ sinh thái FinVault
          </p>
        </div>

        {/* Thẻ số dư ví hiện tại */}
        <div className="flex items-center gap-3 bg-card border border-border px-4 py-2.5 rounded-2xl shadow-sm self-start sm:self-auto">
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">Số dư khả dụng</div>
            <div className="text-base font-bold text-foreground">{formatVnd(availableBalance)}</div>
          </div>
        </div>
      </div>

      {/* Stepper chỉ dẫn 3 bước chuẩn Stitch */}
      <Card className="border-border shadow-sm">
        <CardContent className="p-4 sm:p-6">
          <div className="relative flex items-center justify-between max-w-2xl mx-auto">
            {/* Thanh nối tiến độ */}
            <div className="absolute left-6 right-6 top-5 -translate-y-1/2 h-0.5 bg-muted -z-0">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{
                  width: currentStep === 1 ? '0%' : currentStep === 2 ? '50%' : '100%'
                }}
              />
            </div>

            {/* Bước 1 */}
            <div className="relative z-10 flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors shadow-sm ring-4 ring-background ${
                  currentStep > 1
                    ? 'bg-primary text-primary-foreground'
                    : currentStep === 1
                    ? 'bg-primary text-primary-foreground ring-primary/20'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {currentStep > 1 ? <Check className="h-5 w-5" /> : '1'}
              </div>
              <span className="mt-2 text-xs sm:text-sm font-semibold text-foreground">
                1. Thông tin chuyển
              </span>
              <span className="text-[11px] text-muted-foreground hidden sm:inline">
                Người nhận & Báo giá
              </span>
            </div>

            {/* Bước 2 */}
            <div className="relative z-10 flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors shadow-sm ring-4 ring-background ${
                  currentStep > 2
                    ? 'bg-primary text-primary-foreground'
                    : currentStep === 2
                    ? 'bg-primary text-primary-foreground ring-primary/20'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {currentStep > 2 ? <Check className="h-5 w-5" /> : '2'}
              </div>
              <span className="mt-2 text-xs sm:text-sm font-semibold text-foreground">
                2. Xác nhận báo giá
              </span>
              <span className="text-[11px] text-muted-foreground hidden sm:inline">
                Đếm ngược 60s
              </span>
            </div>

            {/* Bước 3 */}
            <div className="relative z-10 flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors shadow-sm ring-4 ring-background ${
                  currentStep === 3
                    ? 'bg-primary text-primary-foreground ring-primary/20'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <span className="mt-2 text-xs sm:text-sm font-semibold text-foreground">
                3. Hoàn tất
              </span>
              <span className="text-[11px] text-muted-foreground hidden sm:inline">
                Biên lai giao dịch
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ======================================================== */}
      {/* BƯỚC 1: NHẬP THÔNG TIN NGƯỜI NHẬN, SỐ TIỀN & LẤY QUOTE   */}
      {/* ======================================================== */}
      {currentStep === 1 && (
        <form onSubmit={handleRequestQuote} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Cột trái: Form nhập chi tiết */}
          <div className="lg:col-span-8 space-y-6">
            {/* Khung 1: Người nhận */}
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                    <CardTitle className="text-base sm:text-lg">Người nhận tiền</CardTitle>
                  </div>
                  <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
                    Miễn phí chuyển 100%
                  </Badge>
                </div>
                <CardDescription className="text-xs">
                  Nhập số điện thoại hoặc email của người nhận trong hệ thống FinVault
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Input tìm kiếm người nhận */}
                <div className="space-y-1.5">
                  <Label htmlFor="recipient" className="text-xs font-semibold text-foreground">
                    Số điện thoại / Email người nhận
                  </Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="recipient"
                        value={recipientQuery}
                        onChange={(e) => setRecipientQuery(e.target.value)}
                        placeholder="Ví dụ: 0912345678 hoặc email@domain.com"
                        className="pl-10 h-11 text-base sm:text-sm font-medium"
                        autoComplete="off"
                        disabled={cooldownRemaining > 0}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={triggerLookup}
                      disabled={isLookingUp || cooldownRemaining > 0 || !recipientQuery.trim()}
                      className="h-11 px-4 text-xs font-semibold"
                    >
                      {isLookingUp ? 'Đang tìm...' : 'Kiểm tra'}
                    </Button>
                  </div>
                </div>

                {/* Thông báo lỗi tra cứu (404 hoặc 429) */}
                {cooldownRemaining > 0 && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 flex items-center gap-2">
                    <Clock className="h-4 w-4 shrink-0" />
                    <span>Bạn đang thao tác quá nhanh. Vui lòng chờ {cooldownRemaining}s trước khi thử lại.</span>
                  </div>
                )}

                {recipientError && cooldownRemaining === 0 && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span>{recipientError}</span>
                  </div>
                )}

                {/* Thẻ hiển thị người nhận hợp lệ */}
                {recipient && (
                  <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-between animate-in fade-in-50 duration-200">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                        <UserCheck className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-foreground">
                          {recipient.maskedName}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {recipientQuery}
                        </div>
                      </div>
                    </div>
                    <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30 gap-1 text-xs">
                      <Check className="h-3.5 w-3.5" />
                      Hợp lệ
                    </Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Khung 2: Số tiền & Lời nhắn */}
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                  <CardTitle className="text-base sm:text-lg">Số tiền & Lời nhắn</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Ô hiển thị số tiền lớn */}
                <div className="p-5 rounded-2xl bg-muted/40 border border-border/80 text-center">
                  <span className="text-xs text-muted-foreground block mb-2 font-medium">
                    Số tiền chuyển (VND)
                  </span>
                  <div className="flex items-center justify-center gap-2">
                    <Input
                      type="text"
                      inputMode="numeric"
                      value={amount}
                      onChange={(e) => handleAmountChange(e.target.value)}
                      placeholder="0"
                      className="text-center font-bold text-2xl sm:text-3xl text-primary border-none shadow-none bg-transparent focus-visible:ring-0 max-w-[280px] h-12"
                    />
                    <span className="text-xl sm:text-2xl font-bold text-primary">₫</span>
                  </div>

                  {amount && isValidMoneyInput(amount) && (
                    <p className="text-xs font-semibold text-primary/80 mt-1">
                      {formatVnd(amount)}
                    </p>
                  )}

                  {/* Nút chọn nhanh số tiền */}
                  <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
                    {QUICK_AMOUNTS.map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => handleAmountChange(item.value)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          amount === item.value
                            ? 'bg-primary text-primary-foreground shadow-xs'
                            : 'border border-border bg-card hover:bg-muted text-foreground'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>

                  {/* Cảnh báo lỗi LIMIT_EXCEEDED nếu có */}
                  {limitExceededError && (
                    <div className="mt-4 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-left text-xs text-rose-700 space-y-2">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                        <div>
                          <p className="font-semibold">{limitExceededError.message}</p>
                          <p className="text-[11px] text-muted-foreground mt-1">
                            Để tăng hạn mức giao dịch, bạn có thể hoàn tất nâng cấp định danh tài khoản.
                          </p>
                        </div>
                      </div>
                      <div className="pt-1">
                        <Button asChild size="sm" variant="outline" className="h-7 text-xs text-rose-700 border-rose-300 hover:bg-rose-100">
                          <Link to="/app/profile">Nâng cấp gói KYC ngay</Link>
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Thông tin số dư khả dụng */}
                  <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                    <Info className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>
                      Số dư khả dụng trong ví:{' '}
                      <strong className="text-foreground">{formatVnd(availableBalance)}</strong>
                    </span>
                  </div>
                </div>

                {/* Nhập lời nhắn */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="message" className="text-xs font-semibold text-foreground">
                      Lời nhắn tới người nhận
                    </Label>
                    <span className="text-[11px] text-muted-foreground">{message.length}/100 ký tự</span>
                  </div>
                  <Input
                    id="message"
                    maxLength={100}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Nhập nội dung chuyển tiền..."
                    className="h-11 text-sm"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cột phải: Tóm tắt & Nút chuyển tiếp */}
          <div className="lg:col-span-4 space-y-4">
            <Card className="border-border shadow-sm sticky top-24">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-primary" />
                  <span>Tóm tắt giao dịch</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="space-y-2.5 divide-y divide-border/60 text-xs sm:text-sm">
                  <div className="flex justify-between items-center py-1">
                    <span className="text-muted-foreground">Người nhận</span>
                    <span className="font-semibold text-foreground text-right truncate max-w-[180px]">
                      {recipient ? recipient.maskedName : 'Chưa chọn'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-muted-foreground">Số tiền</span>
                    <span className="font-bold text-foreground">{formatVnd(amount)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-muted-foreground">Phí giao dịch</span>
                    <span className="font-semibold text-emerald-600">0 ₫ (Miễn phí)</span>
                  </div>
                  <div className="flex justify-between items-center pt-3">
                    <span className="font-semibold text-foreground">Tổng tiền trừ ví</span>
                    <span className="text-base sm:text-lg font-bold text-primary">{formatVnd(amount)}</span>
                  </div>
                </div>

                {/* Nút hành động Bước 1 */}
                <Button
                  type="submit"
                  size="lg"
                  disabled={!recipient || !amount || !isValidMoneyInput(amount) || isQuoting}
                  className="w-full h-11 text-sm font-semibold gap-2 shadow-sm cursor-pointer"
                >
                  <span>{isQuoting ? 'Đang lấy báo giá...' : 'Tiếp tục kiểm tra'}</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>

                <p className="text-[11px] text-center text-muted-foreground">
                  Giao dịch được bảo mật và mã hóa đầu cuối bởi FinVault.
                </p>
              </CardContent>
            </Card>
          </div>
        </form>
      )}

      {/* ======================================================== */}
      {/* BƯỚC 2: XÁC NHẬN BÁO GIÁ (60S) & CHUẨN BỊ NHẬP PIN       */}
      {/* ======================================================== */}
      {currentStep === 2 && quote && (
        <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in-50 duration-200">
          <Card className="border-border shadow-md">
            <CardHeader className="text-center pb-4 border-b border-border">
              <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-2">
                <Receipt className="h-6 w-6" />
              </div>
              <CardTitle className="text-xl font-bold">Xác nhận báo giá chuyển tiền</CardTitle>
              <CardDescription className="text-xs">
                Vui lòng kiểm tra kỹ thông tin người nhận và số tiền trước khi thực hiện bước xác thực
              </CardDescription>

              {/* Đồng hồ đếm ngược 60s */}
              <div className="pt-3 flex items-center justify-center">
                {quoteCountdown > 0 ? (
                  <Badge variant="outline" className="px-3 py-1 gap-1.5 text-xs font-semibold border-amber-500/30 text-amber-600 bg-amber-500/10">
                    <Clock className="h-3.5 w-3.5 text-amber-500 animate-spin" />
                    <span>Báo giá có hiệu lực trong: {quoteCountdown} giây</span>
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="px-3 py-1 gap-1.5 text-xs font-semibold">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    <span>Báo giá đã hết hạn</span>
                  </Badge>
                )}
              </div>
            </CardHeader>

            <CardContent className="pt-6 space-y-6">
              {/* Thẻ thông tin số tiền */}
              <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 text-center">
                <span className="text-xs text-muted-foreground">Số tiền chuyển</span>
                <div className="text-3xl font-extrabold text-primary mt-1">{formatVnd(quote.amount)}</div>
                <Badge variant="outline" className="mt-2 text-xs text-emerald-600 border-emerald-500/30">
                  Phí giao dịch: {formatVnd(quote.fee)} (Miễn phí)
                </Badge>
              </div>

              {/* Bảng chi tiết thông tin */}
              <div className="space-y-3 rounded-xl border border-border p-4 bg-card text-sm">
                <div className="flex justify-between items-center text-xs sm:text-sm">
                  <span className="text-muted-foreground">Người nhận</span>
                  <div className="text-right">
                    <span className="font-bold text-foreground block">{recipient?.maskedName}</span>
                    <span className="text-xs text-muted-foreground font-mono">{recipientQuery}</span>
                  </div>
                </div>

                <div className="border-t border-border/60 pt-2.5 flex justify-between items-center text-xs sm:text-sm">
                  <span className="text-muted-foreground">Nguồn tiền</span>
                  <span className="font-medium text-foreground">Số dư ví FinVault ({formatVnd(availableBalance)})</span>
                </div>

                <div className="border-t border-border/60 pt-2.5 flex justify-between items-center text-xs sm:text-sm">
                  <span className="text-muted-foreground">Lời nhắn</span>
                  <span className="font-medium text-foreground text-right">{message || 'Chuyển tiền FinVault'}</span>
                </div>

                <div className="border-t border-border/60 pt-2.5 flex justify-between items-center text-xs sm:text-sm">
                  <span className="font-semibold text-foreground">Tổng trừ ví</span>
                  <span className="text-base font-bold text-primary">{formatVnd(quote.amount)}</span>
                </div>
              </div>

              {/* Cảnh báo khi báo giá đã hết hạn */}
              {quoteCountdown <= 0 && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 flex items-center justify-between">
                  <span>Báo giá 60 giây đã hết hạn. Vui lòng lấy lại báo giá mới để tiếp tục.</span>
                  <Button size="sm" onClick={handleRefreshQuote} disabled={isQuoting} className="h-7 text-xs font-semibold ml-2">
                    <RefreshCw className="h-3 w-3 mr-1" /> Lấy báo giá mới
                  </Button>
                </div>
              )}

              {/* Trạng thái đang xử lý do timeout hoặc mạng */}
              {processingState && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 space-y-3 animate-in fade-in-50 duration-200">
                  <div className="flex items-start gap-2.5">
                    {processingState.phase === 'confirm' && processingState.isPolling ? (
                      <RefreshCw className="h-5 w-5 text-amber-600 animate-spin shrink-0 mt-0.5" />
                    ) : (
                      <Clock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="font-bold text-sm">
                        {processingState.phase === 'checkout'
                          ? 'Đang xử lý, vui lòng không thực hiện lại'
                          : processingState.isPolling
                            ? 'Đang kiểm tra kết quả giao dịch...'
                            : 'Giao dịch đang xử lý'}
                      </p>
                      <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                        {processingState.message}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    {processingState.phase === 'checkout' && (
                      <Button
                        size="sm"
                        onClick={handleStartCheckout}
                        disabled={isCheckingOut}
                        className="h-8 text-xs font-semibold gap-1.5 cursor-pointer"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>{isCheckingOut ? 'Đang thử lại...' : 'Thử lại'}</span>
                      </Button>
                    )}

                    {processingState.phase === 'confirm' && !processingState.isPolling && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => pollPaymentStatus(processingState.paymentId, 0, Date.now())}
                          disabled={isConfirming}
                          className="h-8 text-xs font-semibold gap-1.5 cursor-pointer"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          <span>Kiểm tra lại</span>
                        </Button>
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs font-semibold border-amber-300 hover:bg-amber-100"
                        >
                          <Link to="/app/transactions">Xem Lịch sử giao dịch</Link>
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Nhóm nút hành động */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStep(1)}
                  className="h-11 font-semibold gap-2 cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Quay lại sửa</span>
                </Button>
                <Button
                  type="button"
                  onClick={handleStartCheckout}
                  disabled={isCheckingOut || isConfirming || quoteCountdown <= 0}
                  className="h-11 font-semibold gap-2 shadow-sm cursor-pointer"
                >
                  <Lock className="h-4 w-4" />
                  <span>
                    {isCheckingOut
                      ? 'Đang tạo phiên...'
                      : isConfirming
                        ? 'Đang xác nhận...'
                        : 'Xác nhận chuyển tiền'}
                  </span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ======================================================== */}
      {/* BƯỚC 3: BIÊN LAI CHUYỂN TIỀN THÀNH CÔNG                  */}
      {/* ======================================================== */}
      {currentStep === 3 && completedTxn && (
        <div className="max-w-xl mx-auto space-y-6 animate-in zoom-in-95 duration-200">
          <Card className="border-emerald-500/30 shadow-lg relative overflow-hidden bg-card">
            {/* Dải màu accent đầu biên lai */}
            <div className="h-2 w-full bg-emerald-500" />

            <CardContent className="pt-8 pb-8 px-6 text-center space-y-6">
              {/* Biểu tượng dấu tích xanh tròn lớn */}
              <div className="mx-auto h-16 w-16 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center shadow-inner">
                <CheckCircle2 className="h-10 w-10" />
              </div>

              <div>
                <h2 className="text-2xl font-bold tracking-tight text-foreground">
                  Chuyển tiền thành công!
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Tiền đã được gửi tức thì vào ví của người nhận
                </p>
              </div>

              {/* Hiển thị số tiền chuyển lớn */}
              <div className="py-3 px-4 rounded-2xl bg-muted/40 border border-border text-center">
                <span className="text-xs text-muted-foreground block">Số tiền giao dịch</span>
                <span className="text-3xl font-extrabold text-primary mt-0.5 block">
                  {formatVnd(completedTxn.amount)}
                </span>
              </div>

              {/* Thẻ chi tiết biên lai */}
              <div className="rounded-xl border border-border p-4 bg-background text-left space-y-3 text-xs sm:text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Mã giao dịch</span>
                  <div className="flex items-center gap-1.5 font-bold font-mono text-foreground">
                    <span>{completedTxn.id}</span>
                    <button
                      type="button"
                      aria-label="Sao chép mã giao dịch"
                      onClick={() => handleCopyTxnId(completedTxn.id)}
                      className="text-primary hover:text-primary/80 transition-colors p-1 cursor-pointer"
                    >
                      {copiedTxn ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="border-t border-border/60 pt-2.5 flex justify-between items-center">
                  <span className="text-muted-foreground">Thời gian thực hiện</span>
                  <span className="font-medium text-foreground">{formatDateTime(completedTxn.timestamp)}</span>
                </div>

                <div className="border-t border-border/60 pt-2.5 flex justify-between items-center">
                  <span className="text-muted-foreground">Người nhận</span>
                  <div className="text-right">
                    <span className="font-semibold text-foreground block">{completedTxn.recipientName}</span>
                    <span className="text-xs text-muted-foreground font-mono">{completedTxn.recipientPhone}</span>
                  </div>
                </div>

                <div className="border-t border-border/60 pt-2.5 flex justify-between items-center">
                  <span className="text-muted-foreground">Phương thức thanh toán</span>
                  <span className="font-medium text-foreground">Số dư ví FinVault</span>
                </div>

                <div className="border-t border-border/60 pt-2.5 flex justify-between items-center">
                  <span className="text-muted-foreground">Lời nhắn</span>
                  <span className="font-medium text-foreground text-right">{completedTxn.message}</span>
                </div>

                <div className="border-t border-border/60 pt-2.5 flex justify-between items-center">
                  <span className="text-muted-foreground">Phí dịch vụ</span>
                  <span className="font-semibold text-emerald-600">0 ₫ (Miễn phí)</span>
                </div>
              </div>

              {/* Các nút hành động cuối biên lai */}
              <div className="space-y-2.5 pt-2">
                <Button
                  type="button"
                  size="lg"
                  onClick={handleResetNewTransfer}
                  className="w-full h-11 text-sm font-semibold gap-2 shadow-sm cursor-pointer"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Chuyển tiếp giao dịch khác</span>
                </Button>

                <div className="grid grid-cols-2 gap-2.5">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => window.print()}
                    className="h-10 text-xs font-semibold gap-1.5 cursor-pointer"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span>In / Tải biên lai</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/app')}
                    className="h-10 text-xs font-semibold gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Về trang chủ</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ======================================================== */}
      {/* BƯỚC 3: MÀN HÌNH GIAO DỊCH THẤT BẠI                      */}
      {/* ======================================================== */}
      {currentStep === 3 && failedTxn && (
        <div className="max-w-xl mx-auto space-y-6 animate-in zoom-in-95 duration-200">
          <Card className="border-rose-500/30 shadow-lg relative overflow-hidden bg-card">
            <div className="h-2 w-full bg-rose-500" />
            <CardHeader className="text-center pb-4 pt-6">
              <div className="mx-auto h-16 w-16 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center mb-3">
                <AlertTriangle className="h-8 w-8" />
              </div>
              <Badge variant="destructive" className="mx-auto text-xs px-3 py-1 font-semibold">
                Giao dịch không thành công
              </Badge>
              <CardTitle className="text-xl font-bold mt-2 text-foreground">
                Thanh toán thất bại
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                {failedTxn.reason}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 px-6 sm:px-8 pb-8">
              <div className="rounded-xl border border-border p-4 bg-muted/20 space-y-3 text-xs sm:text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Mã giao dịch</span>
                  <span className="font-mono font-semibold text-foreground">{failedTxn.id}</span>
                </div>
                <div className="border-t border-border/60 pt-2 flex justify-between items-center">
                  <span className="text-muted-foreground">Trạng thái</span>
                  <span className="font-semibold text-rose-600">{failedTxn.status}</span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <Button
                  type="button"
                  onClick={handleResetNewTransfer}
                  className="h-10 text-xs font-semibold gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Chuyển tiền mới</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/app/transactions')}
                  className="h-10 text-xs font-semibold gap-1.5 cursor-pointer"
                >
                  <span>Xem lịch sử ví</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Shared PIN Modal: Kích hoạt tại Bước 2 */}
      <PinModal
        open={pinModalOpen}
        onOpenChange={setPinModalOpen}
        title="Xác thực mã PIN giao dịch"
        description={`Xác nhận chuyển ${formatVnd(amount)} tới ${recipient?.maskedName || 'người nhận'}.`}
        paymentId={paymentId || undefined}
        amount={amount}
        onSuccess={handlePinSuccess}
        onCancel={() => setPinModalOpen(false)}
      />
    </div>
  )
}

export default TransferPage
