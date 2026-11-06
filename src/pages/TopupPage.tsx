import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Wallet,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Copy,
  RotateCcw,
  ShieldCheck,
  TrendingUp,
  Check,
  CreditCard,
  Sparkles,
  PlusCircle,
  Info,
  Building2,
  Loader2
} from 'lucide-react'
import { useAuthStore } from '@/features/auth/stores/useAuthStore'
import { formatVnd, formatDateTime } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import { toast } from 'sonner'

const QUICK_AMOUNTS = [
  { label: '100.000 ₫', value: '100000' },
  { label: '200.000 ₫', value: '200000' },
  { label: '500.000 ₫', value: '500000' },
  { label: '1.000.000 ₫', value: '1000000' },
  { label: '2.000.000 ₫', value: '2000000' }
]

const MIN_TOPUP = 10000
const MAX_TOPUP = 50000000

type PaymentSubMethod = 'VNPAY_QR' | 'ATM' | 'INT_CARD'
type TopupStatus = 'IDLE' | 'VNPAY_MODAL' | 'PENDING' | 'SUCCESS' | 'FAILED'

export function TopupPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  // Số dư ví hiện tại
  const currentBalance = Number(user?.balance || '1250000')

  // Trạng thái form
  const [amount, setAmount] = useState('100000')
  const [selectedSubMethod, setSelectedSubMethod] = useState<PaymentSubMethod>('VNPAY_QR')
  const [status, setStatus] = useState<TopupStatus>('IDLE')
  const [copiedTxn, setCopiedTxn] = useState(false)

  // Kết quả giao dịch sau khi hoàn tất
  const [txnResult, setTxnResult] = useState<{
    txnRef: string
    vnpOrderInfo: string
    amount: number
    timestamp: string
    methodName: string
    bankCode?: string
    newBalance: number
  } | null>(null)

  const numericAmount = Number(amount) || 0
  const isAmountValid = numericAmount >= MIN_TOPUP && numericAmount <= MAX_TOPUP
  const expectedNewBalance = currentBalance + (isAmountValid ? numericAmount : 0)

  // Mở cổng VNPAY
  const handleOpenVnpayGateway = () => {
    if (!isAmountValid) {
      if (numericAmount < MIN_TOPUP) {
        toast.error(`Số tiền nạp tối thiểu là ${formatVnd(MIN_TOPUP)}.`)
      } else {
        toast.error(`Số tiền nạp tối đa là ${formatVnd(MAX_TOPUP)}.`)
      }
      return
    }
    setStatus('VNPAY_MODAL')
  }

  // Giả lập thanh toán VNPAY thành công
  const handleSimulateVnpaySuccess = () => {
    setStatus('PENDING')
    const randomRef = `VNP-${new Date().getFullYear()}${String(Date.now()).slice(-8)}`
    const nowIso = new Date().toISOString()

    setTimeout(() => {
      const updatedBalance = currentBalance + numericAmount
      setTxnResult({
        txnRef: randomRef,
        vnpOrderInfo: `Nap tien FinVault ${formatVnd(numericAmount)}`,
        amount: numericAmount,
        timestamp: nowIso,
        methodName:
          selectedSubMethod === 'VNPAY_QR'
            ? 'VNPAY-QR (Quét mã ứng dụng ngân hàng)'
            : selectedSubMethod === 'ATM'
            ? 'Thẻ ATM nội địa (Napas 40+ ngân hàng)'
            : 'Thẻ thanh toán quốc tế (Visa / Mastercard / JCB)',
        bankCode: selectedSubMethod === 'ATM' ? 'NCB' : 'VNPAY',
        newBalance: updatedBalance
      })
      setStatus('SUCCESS')
      toast.success('Nạp tiền vào ví thành công!', {
        description: `Đã cộng ${formatVnd(numericAmount)} vào số dư ví của bạn.`
      })
    }, 1000)
  }

  // Giả lập giao dịch thất bại / hủy thanh toán
  const handleSimulateVnpayCancel = () => {
    setStatus('PENDING')
    setTimeout(() => {
      setStatus('FAILED')
      toast.error('Giao dịch nạp tiền chưa hoàn tất', {
        description: 'Bạn đã hủy thao tác hoặc phiên giao dịch tại cổng VNPAY đã kết thúc.'
      })
    }, 800)
  }

  // Sao chép mã tham chiếu
  const handleCopyTxnRef = (ref: string) => {
    navigator.clipboard.writeText(ref)
    setCopiedTxn(true)
    toast.success('Đã sao chép mã tham chiếu VNPAY')
    setTimeout(() => setCopiedTxn(false), 2000)
  }

  // Làm giao dịch nạp tiền mới
  const handleResetTopup = () => {
    setStatus('IDLE')
    setAmount('100000')
    setTxnResult(null)
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header khu vực làm việc */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary text-xs font-semibold uppercase tracking-wider mb-1">
            <ShieldCheck className="h-4 w-4" />
            <span>Cổng liên kết đối tác VNPAY</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Nạp tiền vào ví
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Nạp tiền tức thì qua cổng thanh toán VNPAY, miễn phí giao dịch 100%
          </p>
        </div>

        {/* Thẻ số dư ví hiện tại */}
        <div className="flex items-center gap-3 bg-card border border-border px-4 py-2.5 rounded-2xl shadow-sm self-start sm:self-auto">
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">Số dư khả dụng</div>
            <div className="text-base font-bold text-foreground">{formatVnd(currentBalance)}</div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* GIAO DIỆN CHÍNH: FORM CHỌN SỐ TIỀN & PHƯƠNG THỨC         */}
      {/* ======================================================== */}
      {status === 'IDLE' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-in fade-in-50 duration-200">
          {/* Cột trái: Form nhập số tiền và chọn phương thức (8 cột) */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-6">
            {/* Thẻ 1: Số tiền nạp */}
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                    <CardTitle className="text-base sm:text-lg">Số tiền muốn nạp</CardTitle>
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">
                    Tối thiểu: {formatVnd(MIN_TOPUP)}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Input số tiền lớn */}
                <div className="p-4 sm:p-5 rounded-2xl bg-muted/40 border border-border text-center">
                  <span className="text-xs text-muted-foreground block mb-2 font-medium">
                    Nhập số tiền nạp (VND)
                  </span>
                  <div className="flex items-center justify-center gap-2">
                    <Input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0"
                      min={MIN_TOPUP}
                      max={MAX_TOPUP}
                      className="text-center font-bold text-2xl sm:text-3xl text-primary border-none shadow-none bg-transparent focus-visible:ring-0 max-w-[280px] h-12"
                    />
                    <span className="text-xl sm:text-2xl font-bold text-primary">₫</span>
                  </div>

                  {/* Nút chọn nhanh số tiền */}
                  <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
                    {QUICK_AMOUNTS.map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setAmount(item.value)}
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
                </div>
              </CardContent>
            </Card>

            {/* Thẻ 2: Phương thức thanh toán VNPAY */}
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                    <CardTitle className="text-base sm:text-lg">Phương thức thanh toán</CardTitle>
                  </div>
                  <Badge variant="outline" className="text-xs text-primary border-primary/30 gap-1 font-semibold">
                    <Sparkles className="h-3 w-3" />
                    Tức thì
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Lựa chọn 1: VNPAY-QR */}
                <div
                  onClick={() => setSelectedSubMethod('VNPAY_QR')}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3.5 ${
                    selectedSubMethod === 'VNPAY_QR'
                      ? 'border-primary bg-primary/5 shadow-xs'
                      : 'border-border bg-card hover:bg-muted/40'
                  }`}
                >
                  <div className="mt-0.5">
                    <div
                      className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                        selectedSubMethod === 'VNPAY_QR'
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-muted-foreground'
                      }`}
                    >
                      {selectedSubMethod === 'VNPAY_QR' && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                    </div>
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-0.5 px-2 py-0.5 rounded bg-blue-600/10 border border-blue-600/20 text-xs font-black">
                        <span className="text-blue-600">VN</span>
                        <span className="text-red-600">PAY</span>
                      </div>
                      <span className="font-semibold text-sm text-foreground">Ứng dụng thanh toán VNPAY-QR</span>
                      <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-none text-[10px] ml-auto">
                        Khuyên dùng
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Mở ứng dụng ngân hàng hoặc ví VNPAY để quét mã QR thanh toán tức thì.
                    </p>
                  </div>
                </div>

                {/* Lựa chọn 2: Thẻ ATM & Tài khoản ngân hàng nội địa */}
                <div
                  onClick={() => setSelectedSubMethod('ATM')}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3.5 ${
                    selectedSubMethod === 'ATM'
                      ? 'border-primary bg-primary/5 shadow-xs'
                      : 'border-border bg-card hover:bg-muted/40'
                  }`}
                >
                  <div className="mt-0.5">
                    <div
                      className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                        selectedSubMethod === 'ATM'
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-muted-foreground'
                      }`}
                    >
                      {selectedSubMethod === 'ATM' && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                    </div>
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-primary" />
                      <span className="font-semibold text-sm text-foreground">Thẻ ATM & Tài khoản nội địa</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Hỗ trợ hơn 40 ngân hàng qua cổng Napas: Vietcombank, Techcombank, MB, BIDV, ACB...
                    </p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {['Vietcombank', 'Techcombank', 'MBBank', 'BIDV', '+40 ngân hàng'].map((bank) => (
                        <span
                          key={bank}
                          className="px-2 py-0.5 bg-muted rounded text-[11px] text-muted-foreground font-medium"
                        >
                          {bank}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Lựa chọn 3: Thẻ quốc tế Visa, Mastercard */}
                <div
                  onClick={() => setSelectedSubMethod('INT_CARD')}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3.5 ${
                    selectedSubMethod === 'INT_CARD'
                      ? 'border-primary bg-primary/5 shadow-xs'
                      : 'border-border bg-card hover:bg-muted/40'
                  }`}
                >
                  <div className="mt-0.5">
                    <div
                      className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                        selectedSubMethod === 'INT_CARD'
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-muted-foreground'
                      }`}
                    >
                      {selectedSubMethod === 'INT_CARD' && <div className="h-1.5 w-1.5 rounded-full bg-white" />}
                    </div>
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-primary" />
                      <span className="font-semibold text-sm text-foreground">Thẻ quốc tế (Visa, Mastercard, JCB)</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Thanh toán an toàn qua chuẩn 3D-Secure của các tổ chức thẻ quốc tế.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Thẻ 3: Chi tiết nguồn tiền & Biến động số dư */}
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                  <CardTitle className="text-base sm:text-lg">Chi tiết biến động số dư</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 divide-y divide-border/60 text-sm">
                <div className="flex justify-between items-center pt-1 text-xs sm:text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                    Số dư ví hiện tại
                  </span>
                  <span className="font-semibold text-foreground">{formatVnd(currentBalance)}</span>
                </div>

                <div className="flex justify-between items-center pt-3 text-xs sm:text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <PlusCircle className="h-4 w-4 text-emerald-600" />
                    Số tiền sẽ nạp
                  </span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    + {formatVnd(numericAmount)}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-3 text-xs sm:text-sm">
                  <span className="text-muted-foreground">Phí giao dịch FinVault</span>
                  <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-500/30">
                    0 ₫ (Miễn phí 100%)
                  </Badge>
                </div>

                <div className="flex justify-between items-center pt-4 -mx-6 px-6 py-3.5 bg-muted/40 rounded-b-xl border-t border-border">
                  <div>
                    <div className="text-xs text-muted-foreground font-medium">Dự kiến số dư sau nạp</div>
                    <div className="text-xl sm:text-2xl font-bold text-primary">
                      {formatVnd(expectedNewBalance)}
                    </div>
                  </div>
                  <div className="flex items-center text-primary text-xs font-semibold gap-1">
                    <TrendingUp className="h-4 w-4" />
                    <span>Cập nhật tức thời</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Nút chính chuyển tiếp */}
            <div className="pt-2">
              <Button
                type="button"
                size="lg"
                disabled={!isAmountValid}
                onClick={handleOpenVnpayGateway}
                className="w-full h-12 text-sm font-semibold gap-2 shadow-md cursor-pointer"
              >
                <span>Tiếp tục tới VNPAY</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
              <p className="text-center text-xs text-muted-foreground mt-2.5 flex items-center justify-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-primary" />
                <span>Bạn sẽ được kết nối an toàn với giao diện thanh toán bảo mật của đối tác VNPAY</span>
              </p>
            </div>
          </div>

          {/* Cột phải: Hướng dẫn & Tiện ích (4 cột) */}
          <div className="lg:col-span-5 xl:col-span-4 space-y-6">
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <span>Cam kết giao dịch an toàn</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3.5 text-xs text-muted-foreground">
                <div className="flex items-start gap-2.5">
                  <div className="h-6 w-6 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <strong className="text-foreground block">Xác thực tức thì</strong>
                    Tiền được cộng ngay vào ví FinVault sau khi VNPAY xác nhận giao dịch thành công.
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="h-6 w-6 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <strong className="text-foreground block">Hoàn toàn miễn phí</strong>
                    FinVault không thu bất kỳ khoản phụ phí nào đối với các giao dịch nạp tiền qua VNPAY.
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <div className="h-6 w-6 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <strong className="text-foreground block">Hỗ trợ 24/7</strong>
                    Mọi vấn đề về giao dịch liên kết ngân hàng đều được ghi nhận và tra soát tự động.
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="border-border shadow-sm">
              <CardContent className="p-4 space-y-2">
                <div className="text-xs font-semibold text-foreground mb-1">Các thao tác nhanh khác:</div>
                <Button
                  asChild
                  variant="outline"
                  className="w-full justify-start text-xs font-medium h-9 cursor-pointer"
                >
                  <Link to="/app/transfer">
                    <ArrowRight className="h-3.5 w-3.5 mr-2 text-primary" />
                    Chuyển tiền nội bộ P2P
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="w-full justify-start text-xs font-medium h-9 cursor-pointer"
                >
                  <Link to="/app/transactions">
                    <Clock className="h-3.5 w-3.5 mr-2 text-primary" />
                    Xem lịch sử nạp rút
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TRẠNG THÁI: ĐANG XỬ LÝ (PENDING IPN)                     */}
      {/* ======================================================== */}
      {status === 'PENDING' && (
        <div className="max-w-md mx-auto text-center py-12 space-y-4 animate-in fade-in-50 duration-200">
          <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Đang xác nhận với cổng VNPAY</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Hệ thống đang đồng bộ dữ liệu giao dịch từ cổng thanh toán. Vui lòng giữ màn hình trong giây lát...
          </p>
        </div>
      )}

      {/* ======================================================== */}
      {/* TRẠNG THÁI: NẠP THÀNH CÔNG (SUCCESS RECEIPT)             */}
      {/* ======================================================== */}
      {status === 'SUCCESS' && txnResult && (
        <div className="max-w-xl mx-auto space-y-6 animate-in zoom-in-95 duration-200">
          <Card className="border-emerald-500/30 shadow-lg relative overflow-hidden bg-card">
            <div className="h-2 w-full bg-emerald-500" />
            <CardContent className="pt-8 pb-8 px-6 text-center space-y-6">
              <div className="mx-auto h-16 w-16 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner">
                <CheckCircle2 className="h-10 w-10" />
              </div>

              <div>
                <h2 className="text-2xl font-bold tracking-tight text-foreground">
                  Nạp tiền thành công!
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Số tiền đã được cộng ngay vào số dư khả dụng ví FinVault
                </p>
              </div>

              {/* Số tiền nạp lớn */}
              <div className="py-3 px-4 rounded-2xl bg-muted/40 border border-border text-center">
                <span className="text-xs text-muted-foreground block">Số tiền nạp</span>
                <span className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                  +{formatVnd(txnResult.amount)}
                </span>
              </div>

              {/* Chi tiết biên lai */}
              <div className="rounded-xl border border-border p-4 bg-background text-left space-y-3 text-xs sm:text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Mã tham chiếu VNPAY</span>
                  <div className="flex items-center gap-1.5 font-bold font-mono text-foreground">
                    <span>{txnResult.txnRef}</span>
                    <button
                      type="button"
                      aria-label="Sao chép mã tham chiếu"
                      onClick={() => handleCopyTxnRef(txnResult.txnRef)}
                      className="text-primary hover:text-primary/80 transition-colors p-1 cursor-pointer"
                    >
                      {copiedTxn ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="border-t border-border/60 pt-2.5 flex justify-between items-center">
                  <span className="text-muted-foreground">Thời gian thực hiện</span>
                  <span className="font-medium text-foreground">{formatDateTime(txnResult.timestamp)}</span>
                </div>

                <div className="border-t border-border/60 pt-2.5 flex justify-between items-center">
                  <span className="text-muted-foreground">Phương thức nạp</span>
                  <span className="font-medium text-foreground text-right">{txnResult.methodName}</span>
                </div>

                <div className="border-t border-border/60 pt-2.5 flex justify-between items-center">
                  <span className="text-muted-foreground">Phí giao dịch</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">0 ₫ (Miễn phí)</span>
                </div>

                <div className="border-t border-border/60 pt-2.5 flex justify-between items-center">
                  <span className="font-semibold text-foreground">Số dư ví sau nạp</span>
                  <span className="text-base font-bold text-primary">{formatVnd(txnResult.newBalance)}</span>
                </div>
              </div>

              {/* Các nút hành động */}
              <div className="space-y-2.5 pt-2">
                <Button
                  type="button"
                  size="lg"
                  onClick={handleResetTopup}
                  className="w-full h-11 text-sm font-semibold gap-2 shadow-sm cursor-pointer"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Nạp tiếp giao dịch khác</span>
                </Button>

                <div className="grid grid-cols-2 gap-2.5">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/app/transactions')}
                    className="h-10 text-xs font-semibold gap-1.5 cursor-pointer"
                  >
                    <Clock className="h-3.5 w-3.5" />
                    <span>Lịch sử giao dịch</span>
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
      {/* TRẠNG THÁI: NẠP THẤT BẠI (FAILED)                        */}
      {/* ======================================================== */}
      {status === 'FAILED' && (
        <div className="max-w-xl mx-auto space-y-6 animate-in zoom-in-95 duration-200">
          <Card className="border-destructive/30 shadow-lg relative overflow-hidden bg-card">
            <div className="h-2 w-full bg-destructive" />
            <CardContent className="pt-8 pb-8 px-6 text-center space-y-6">
              <div className="mx-auto h-16 w-16 rounded-full bg-destructive/15 text-destructive flex items-center justify-center shadow-inner">
                <XCircle className="h-10 w-10" />
              </div>

              <div>
                <h2 className="text-2xl font-bold tracking-tight text-foreground">
                  Giao dịch nạp tiền chưa thành công
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Giao dịch đã bị hủy hoặc phiên làm việc tại cổng VNPAY đã kết thúc.
                </p>
              </div>

              <div className="rounded-xl border border-border p-4 bg-background text-left space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Số tiền yêu cầu</span>
                  <span className="font-semibold text-foreground">{formatVnd(numericAmount)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Trạng thái</span>
                  <Badge variant="destructive" className="text-xs">Chưa hoàn tất</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Số dư ví hiện tại</span>
                  <span className="font-semibold text-foreground">{formatVnd(currentBalance)}</span>
                </div>
              </div>

              <div className="space-y-2.5 pt-2">
                <Button
                  type="button"
                  size="lg"
                  onClick={handleResetTopup}
                  className="w-full h-11 text-sm font-semibold gap-2 shadow-sm cursor-pointer"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Thử lại giao dịch</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate('/app')}
                  className="w-full h-10 text-xs font-semibold gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Về trang tổng quan ví</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ======================================================== */}
      {/* DIALOG GIẢ LẬP CỔNG VNPAY TRẢ VỀ                         */}
      {/* ======================================================== */}
      <Dialog
        open={status === 'VNPAY_MODAL'}
        onOpenChange={(open) => {
          if (!open) setStatus('IDLE')
        }}
      >
        <DialogContent className="max-w-md p-6">
          <DialogHeader className="text-center space-y-2">
            <div className="mx-auto flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600/10 border border-blue-600/20 w-fit">
              <span className="font-black text-blue-600 tracking-tighter text-lg">VN</span>
              <span className="font-black text-red-600 tracking-tighter text-lg">PAY</span>
            </div>
            <DialogTitle className="text-lg font-bold text-foreground">
              Cổng thanh toán điện tử VNPAY
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Xác nhận thanh toán đơn hàng nạp ví FinVault
            </DialogDescription>
          </DialogHeader>

          <div className="my-4 p-4 rounded-xl bg-muted/50 border border-border space-y-2 text-xs sm:text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Đơn vị thụ hưởng:</span>
              <span className="font-bold text-foreground">Ví điện tử FinVault</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Số tiền thanh toán:</span>
              <span className="font-extrabold text-base text-primary">{formatVnd(numericAmount)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Phương thức:</span>
              <span className="font-medium text-foreground">
                {selectedSubMethod === 'VNPAY_QR'
                  ? 'VNPAY-QR'
                  : selectedSubMethod === 'ATM'
                  ? 'Thẻ ATM nội địa'
                  : 'Thẻ quốc tế'}
              </span>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <Button
              type="button"
              onClick={handleSimulateVnpaySuccess}
              className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm gap-2 cursor-pointer"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Xác nhận nạp tiền thành công</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handleSimulateVnpayCancel}
              className="w-full h-11 text-destructive hover:bg-destructive/10 font-medium text-xs sm:text-sm gap-2 cursor-pointer"
            >
              <XCircle className="h-4 w-4" />
              <span>Hủy bỏ thanh toán</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default TopupPage
