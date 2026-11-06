import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
  Wallet
} from 'lucide-react'
import { useAuthStore } from '@/features/auth/stores/useAuthStore'
import { PinModal } from '@/features/auth/components/PinModal'
import { formatVnd, formatDateTime } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

// Danh bạ mẫu chuẩn để người dùng trải nghiệm tức thì không cần gõ phím
interface RecipientPreset {
  name: string
  identifier: string
  tier: string
  accountType: string
  verified: boolean
}

const PRESET_RECIPIENTS: RecipientPreset[] = [
  {
    name: 'Trần Văn Bình',
    identifier: '0912345345',
    tier: 'Cấp 1 (Đã xác minh CMND/CCCD)',
    accountType: 'Ví cá nhân',
    verified: true
  },
  {
    name: 'Lê Hoàng Khoa',
    identifier: '0987654321',
    tier: 'Cấp 2 (Xác thực sinh trắc học)',
    accountType: 'Ví cá nhân',
    verified: true
  },
  {
    name: 'Highlands Coffee',
    identifier: '0933889900',
    tier: 'Doanh nghiệp đối tác',
    accountType: 'Cổng Merchant',
    verified: true
  }
]

const QUICK_AMOUNTS = [
  { label: '50.000 ₫', value: '50000' },
  { label: '100.000 ₫', value: '100000' },
  { label: '200.000 ₫', value: '200000' },
  { label: '500.000 ₫', value: '500000' },
  { label: '1.000.000 ₫', value: '1000000' }
]

const DAILY_LIMIT_TOTAL = 20000000
const DAILY_LIMIT_USED = 300000

export function TransferPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  // Số dư khả dụng thực tế của tài khoản hiện tại
  const availableBalance = Number(user?.balance || '1250000')
  const remainingDailyLimit = DAILY_LIMIT_TOTAL - DAILY_LIMIT_USED

  // Step: 1 = Nhập dữ liệu, 2 = Xác nhận chi tiết, 3 = Biên lai thành công
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1)

  // Form states
  const [recipientInput, setRecipientInput] = useState('0912345345')
  const [amount, setAmount] = useState('60000')
  const [message, setMessage] = useState('Chuyển tiền FinVault')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [copiedTxn, setCopiedTxn] = useState(false)

  // PIN Modal state
  const [pinModalOpen, setPinModalOpen] = useState(false)

  // Giao dịch đã hoàn tất
  const [completedTxn, setCompletedTxn] = useState<{
    id: string
    timestamp: string
    recipientName: string
    recipientPhone: string
    amount: string
    fee: number
    message: string
    token: string
  } | null>(null)

  // Tự động nhận diện thông tin người nhận theo thời gian thực (Prompt 0)
  const resolveRecipient = (input: string): RecipientPreset => {
    const trimmed = input.trim()
    const found = PRESET_RECIPIENTS.find(
      (r) => r.identifier === trimmed || r.name.toLowerCase() === trimmed.toLowerCase()
    )
    if (found) return found

    if (trimmed.length >= 9) {
      return {
        name: `Khách hàng FinVault (${trimmed.slice(0, 3)}***${trimmed.slice(-3)})`,
        identifier: trimmed,
        tier: 'Cấp 1 (Đã xác minh)',
        accountType: 'Ví cá nhân',
        verified: true
      }
    }

    return {
      name: '',
      identifier: trimmed,
      tier: '',
      accountType: '',
      verified: false
    }
  }

  const activeRecipient = resolveRecipient(recipientInput)
  const numericAmount = Number(amount) || 0
  const isAmountValid = numericAmount > 0 && numericAmount <= availableBalance && numericAmount <= remainingDailyLimit

  // Xử lý chuyển sang Bước 2: Xem lại & Xác nhận
  const handleProceedToConfirm = (e: React.FormEvent) => {
    e.preventDefault()

    if (!activeRecipient.verified) {
      toast.error('Vui lòng nhập số điện thoại hoặc mã ví người nhận hợp lệ.')
      return
    }

    if (numericAmount <= 0) {
      toast.error('Vui lòng nhập số tiền hợp lệ lớn hơn 0 ₫.')
      return
    }

    if (numericAmount > availableBalance) {
      toast.error(`Số dư khả dụng không đủ (${formatVnd(availableBalance)}).`)
      return
    }

    if (numericAmount > remainingDailyLimit) {
      toast.error(`Vượt quá hạn mức chuyển trong ngày (${formatVnd(remainingDailyLimit)}).`)
      return
    }

    setCurrentStep(2)
  }

  // Mở modal nhập mã PIN (Bước 3)
  const handleOpenPinModal = () => {
    setPinModalOpen(true)
  }

  // Khi nhập mã PIN thành công và nhận single-use token
  const handlePinSuccess = (transactionToken: string) => {
    setIsSubmitting(true)
    setPinModalOpen(false)

    // Tạo mã giao dịch chuẩn FinVault
    const generatedTxnId = `FV${Date.now().toString().slice(-8)}${Math.floor(1000 + Math.random() * 9000)}`
    const nowIso = new Date().toISOString()

    setTimeout(() => {
      setCompletedTxn({
        id: generatedTxnId,
        timestamp: nowIso,
        recipientName: activeRecipient.name,
        recipientPhone: activeRecipient.identifier,
        amount: amount,
        fee: 0,
        message: message.trim() || 'Chuyển tiền FinVault',
        token: transactionToken
      })
      setIsSubmitting(false)
      setCurrentStep(3)
      toast.success('Chuyển tiền thành công!', {
        description: `Đã gửi ${formatVnd(numericAmount)} tới ${activeRecipient.name}.`
      })
    }, 600)
  }

  // Sao chép mã giao dịch
  const handleCopyTxnId = (id: string) => {
    navigator.clipboard.writeText(id)
    setCopiedTxn(true)
    toast.success('Đã sao chép mã giao dịch vào bộ nhớ tạm')
    setTimeout(() => setCopiedTxn(false), 2000)
  }

  // Reset form để làm giao dịch mới
  const handleResetNewTransfer = () => {
    setCurrentStep(1)
    setAmount('60000')
    setMessage('Chuyển tiền FinVault')
    setCompletedTxn(null)
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
                Người nhận & Số tiền
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
                2. Xác nhận
              </span>
              <span className="text-[11px] text-muted-foreground hidden sm:inline">
                Kiểm tra thông tin
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
      {/* BƯỚC 1: NHẬP THÔNG TIN NGƯỜI NHẬN & SỐ TIỀN             */}
      {/* ======================================================== */}
      {currentStep === 1 && (
        <form onSubmit={handleProceedToConfirm} className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
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
                  Nhập số điện thoại, email hoặc số tài khoản ví FinVault của người nhận
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Input tìm kiếm người nhận */}
                <div className="space-y-1.5">
                  <Label htmlFor="recipient" className="text-xs font-semibold text-foreground">
                    Số điện thoại / Mã ví FinVault
                  </Label>
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="recipient"
                      value={recipientInput}
                      onChange={(e) => setRecipientInput(e.target.value)}
                      placeholder="Ví dụ: 0912345345 hoặc mã ví"
                      className="pl-10 h-11 text-base sm:text-sm font-medium"
                      autoComplete="off"
                    />
                  </div>
                </div>

                {/* Các người nhận mẫu để bấm nhanh trải nghiệm (Prompt 0) */}
                <div className="space-y-1.5">
                  <div className="text-[11px] font-medium text-muted-foreground">Chọn nhanh người nhận mẫu:</div>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_RECIPIENTS.map((item) => (
                      <button
                        key={item.identifier}
                        type="button"
                        onClick={() => setRecipientInput(item.identifier)}
                        className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
                          recipientInput === item.identifier
                            ? 'border-primary bg-primary/10 text-primary font-semibold shadow-xs'
                            : 'border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted'
                        }`}
                      >
                        {item.name} ({item.identifier})
                      </button>
                    ))}
                  </div>
                </div>

                {/* Thẻ xem trước định danh người nhận tự động (Realtime Preview) */}
                {activeRecipient.verified ? (
                  <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-between animate-in fade-in-50 duration-200">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                        <UserCheck className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-foreground">
                          {activeRecipient.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {activeRecipient.accountType} • {activeRecipient.tier}
                        </div>
                      </div>
                    </div>
                    <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-1 text-xs">
                      <Check className="h-3.5 w-3.5" />
                      Hợp lệ
                    </Badge>
                  </div>
                ) : recipientInput.length > 0 ? (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 flex items-center gap-2">
                    <Info className="h-4 w-4 shrink-0" />
                    <span>Đang tìm kiếm... Vui lòng nhập tối thiểu 9 số để tra cứu thông tin người nhận.</span>
                  </div>
                ) : null}
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
                {/* Ô hiển thị số tiền lớn tương tự Stitch */}
                <div className="p-5 rounded-2xl bg-muted/40 border border-border/80 text-center">
                  <span className="text-xs text-muted-foreground block mb-2 font-medium">
                    Số tiền chuyển (VND)
                  </span>
                  <div className="flex items-center justify-center gap-2">
                    <Input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0"
                      className="text-center font-bold text-2xl sm:text-3xl text-primary border-none shadow-none bg-transparent focus-visible:ring-0 max-w-[280px] h-12"
                    />
                    <span className="text-xl sm:text-2xl font-bold text-primary">₫</span>
                  </div>

                  {/* Nút chọn nhanh số tiền (Quick Amount Pills) */}
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

                  {/* Cảnh báo hạn mức ngày */}
                  <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                    <Info className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>
                      Hạn mức ngày còn lại:{' '}
                      <strong className="text-foreground">{formatVnd(remainingDailyLimit)}</strong> /{' '}
                      {formatVnd(DAILY_LIMIT_TOTAL)}
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
                      {activeRecipient.verified ? activeRecipient.name : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-muted-foreground">Số tiền</span>
                    <span className="font-bold text-foreground">{formatVnd(numericAmount)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-muted-foreground">Phí giao dịch</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">0 ₫ (Miễn phí)</span>
                  </div>
                  <div className="flex justify-between items-center pt-3">
                    <span className="font-semibold text-foreground">Tổng tiền trừ ví</span>
                    <span className="text-base sm:text-lg font-bold text-primary">{formatVnd(numericAmount)}</span>
                  </div>
                </div>

                {/* Nút hành động Bước 1 */}
                <Button
                  type="submit"
                  size="lg"
                  disabled={!activeRecipient.verified || !isAmountValid}
                  className="w-full h-11 text-sm font-semibold gap-2 shadow-sm cursor-pointer"
                >
                  <span>Tiếp tục kiểm tra</span>
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
      {/* BƯỚC 2: XÁC NHẬN GIAO DỊCH & BẤM NHẬP PIN                */}
      {/* ======================================================== */}
      {currentStep === 2 && (
        <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in-50 duration-200">
          <Card className="border-border shadow-md">
            <CardHeader className="text-center pb-4 border-b border-border">
              <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-2">
                <Receipt className="h-6 w-6" />
              </div>
              <CardTitle className="text-xl font-bold">Xác nhận chuyển tiền</CardTitle>
              <CardDescription className="text-xs">
                Vui lòng kiểm tra kỹ thông tin người nhận và số tiền trước khi nhập mã PIN bảo mật
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {/* Thẻ thông tin số tiền */}
              <div className="p-4 rounded-2xl bg-primary/5 border border-primary/20 text-center">
                <span className="text-xs text-muted-foreground">Số tiền chuyển</span>
                <div className="text-3xl font-extrabold text-primary mt-1">{formatVnd(numericAmount)}</div>
                <Badge variant="outline" className="mt-2 text-xs text-emerald-600 border-emerald-500/30">
                  Miễn phí giao dịch trọn đời
                </Badge>
              </div>

              {/* Bảng chi tiết thông tin */}
              <div className="space-y-3 rounded-xl border border-border p-4 bg-card text-sm">
                <div className="flex justify-between items-center text-xs sm:text-sm">
                  <span className="text-muted-foreground">Người nhận</span>
                  <div className="text-right">
                    <span className="font-bold text-foreground block">{activeRecipient.name}</span>
                    <span className="text-xs text-muted-foreground font-mono">{activeRecipient.identifier}</span>
                  </div>
                </div>

                <div className="border-t border-border/60 pt-2.5 flex justify-between items-center text-xs sm:text-sm">
                  <span className="text-muted-foreground">Loại tài khoản</span>
                  <span className="font-medium text-foreground">{activeRecipient.accountType}</span>
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
                  <span className="text-base font-bold text-primary">{formatVnd(numericAmount)}</span>
                </div>
              </div>

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
                  onClick={handleOpenPinModal}
                  disabled={isSubmitting}
                  className="h-11 font-semibold gap-2 shadow-sm cursor-pointer"
                >
                  <Lock className="h-4 w-4" />
                  <span>Nhập mã PIN để chuyển</span>
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
              {/* Biểu tượng dấu tích xanh tròn lớn chuẩn Stitch */}
              <div className="mx-auto h-16 w-16 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner">
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
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">0 ₫ (Miễn phí)</span>
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

      {/* Shared PIN Modal: Kích hoạt tại Bước 3 */}
      <PinModal
        open={pinModalOpen}
        onOpenChange={setPinModalOpen}
        title="Xác thực mã PIN giao dịch"
        description={`Xác nhận chuyển ${formatVnd(numericAmount)} tới ${activeRecipient.name}.`}
        amount={amount}
        onSuccess={handlePinSuccess}
        onCancel={() => setPinModalOpen(false)}
      />
    </div>
  )
}

export default TransferPage
