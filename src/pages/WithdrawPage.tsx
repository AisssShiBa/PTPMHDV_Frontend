import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Wallet,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Copy,
  RotateCcw,
  ShieldCheck,
  Building,
  Check,
  Plus,
  Info,
  Lock,
  Printer,
  Sparkles
} from 'lucide-react'
import { useAuthStore } from '@/features/auth/stores/useAuthStore'
import { PinModal } from '@/features/auth/components/PinModal'
import { formatVnd, formatDateTime } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import { toast } from 'sonner'

interface LinkedBank {
  id: string
  bankName: string
  bankCode: string
  accountNumber: string
  accountHolder: string
  isDefault: boolean
  color: string
}

const INITIAL_BANKS: LinkedBank[] = [
  {
    id: 'bank_vcb',
    bankName: 'Vietcombank',
    bankCode: 'VCB',
    accountNumber: '**** 8829',
    accountHolder: 'AN NGUYEN',
    isDefault: true,
    color: '#005B38'
  },
  {
    id: 'bank_mbb',
    bankName: 'MBBank',
    bankCode: 'MB',
    accountNumber: '**** 3192',
    accountHolder: 'AN NGUYEN',
    isDefault: false,
    color: '#1B358F'
  },
  {
    id: 'bank_tcb',
    bankName: 'Techcombank',
    bankCode: 'TCB',
    accountNumber: '**** 5501',
    accountHolder: 'AN NGUYEN',
    isDefault: false,
    color: '#E31837'
  },
  {
    id: 'bank_acb',
    bankName: 'ACB Bank',
    bankCode: 'ACB',
    accountNumber: '**** 9910',
    accountHolder: 'AN NGUYEN',
    isDefault: false,
    color: '#004B91'
  }
]

const MIN_WITHDRAW = 50000
const MAX_PER_TXN = 50000000
const DAILY_LIMIT = 50000000
const DAILY_USED = 30300000 // Còn lại 19.700.000 ₫ như thiết kế Stitch

export function WithdrawPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  // Số dư ví hiện tại
  const availableBalance = Number(user?.balance || '1250000')
  const remainingDailyLimit = DAILY_LIMIT - DAILY_USED

  // Danh sách ngân hàng liên kết
  const [banks, setBanks] = useState<LinkedBank[]>(INITIAL_BANKS)
  const [selectedBankId, setSelectedBankId] = useState<string>('bank_vcb')

  // Số tiền rút & Form states
  const [amount, setAmount] = useState('500000')
  const [pinModalOpen, setPinModalOpen] = useState(false)
  const [addBankModalOpen, setAddBankModalOpen] = useState(false)
  const [newBankName, setNewBankName] = useState('VietinBank')
  const [newAccountNum, setNewAccountNum] = useState('')
  const [newHolderName, setNewHolderName] = useState('AN NGUYEN')
  const [copiedTxn, setCopiedTxn] = useState(false)

  // Kết quả giao dịch rút tiền
  const [completedTxn, setCompletedTxn] = useState<{
    id: string
    timestamp: string
    bank: LinkedBank
    amount: number
    fee: number
    newBalance: number
  } | null>(null)

  const selectedBank = banks.find((b) => b.id === selectedBankId) || banks[0]
  const numericAmount = Number(amount) || 0
  const isAmountValid =
    numericAmount >= MIN_WITHDRAW &&
    numericAmount <= availableBalance &&
    numericAmount <= remainingDailyLimit

  // Xử lý mở Modal PIN
  const handleOpenPinModal = (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedBank) {
      toast.error('Vui lòng chọn ngân hàng thụ hưởng.')
      return
    }

    if (numericAmount < MIN_WITHDRAW) {
      toast.error(`Số tiền rút tối thiểu là ${formatVnd(MIN_WITHDRAW)}.`)
      return
    }

    if (numericAmount > availableBalance) {
      toast.error(`Số dư khả dụng không đủ (${formatVnd(availableBalance)}).`)
      return
    }

    if (numericAmount > remainingDailyLimit) {
      toast.error(`Vượt quá hạn mức rút còn lại hôm nay (${formatVnd(remainingDailyLimit)}).`)
      return
    }

    setPinModalOpen(true)
  }

  // Khi PIN thành công
  const handlePinSuccess = () => {
    setPinModalOpen(false)
    const generatedId = `FV-${Math.floor(8000000 + Math.random() * 1000000)}`
    const nowIso = new Date().toISOString()
    const updatedBalance = availableBalance - numericAmount

    setCompletedTxn({
      id: generatedId,
      timestamp: nowIso,
      bank: selectedBank,
      amount: numericAmount,
      fee: 0,
      newBalance: updatedBalance
    })

    toast.success('Lệnh rút tiền đã được gửi thành công!', {
      description: `Tiền đang được chuyển về ${selectedBank.bankName} (${selectedBank.accountNumber}).`
    })
  }

  // Thêm ngân hàng liên kết mới
  const handleAddBank = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAccountNum.trim()) {
      toast.error('Vui lòng nhập số tài khoản ngân hàng.')
      return
    }

    const createdBank: LinkedBank = {
      id: `bank_${Date.now()}`,
      bankName: newBankName,
      bankCode: newBankName.slice(0, 3).toUpperCase(),
      accountNumber: `**** ${newAccountNum.slice(-4) || '9999'}`,
      accountHolder: newHolderName.toUpperCase(),
      isDefault: false,
      color: '#00685B'
    }

    setBanks((prev) => [...prev, createdBank])
    setSelectedBankId(createdBank.id)
    setAddBankModalOpen(false)
    setNewAccountNum('')
    toast.success(`Đã thêm liên kết ngân hàng ${createdBank.bankName}`)
  }

  // Sao chép mã GD
  const handleCopyTxnId = (id: string) => {
    navigator.clipboard.writeText(id)
    setCopiedTxn(true)
    toast.success('Đã sao chép mã giao dịch')
    setTimeout(() => setCopiedTxn(false), 2000)
  }

  // Reset form rút tiền mới
  const handleResetWithdraw = () => {
    setCompletedTxn(null)
    setAmount('500000')
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header khu vực làm việc */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary text-xs font-semibold uppercase tracking-wider mb-1">
            <ShieldCheck className="h-4 w-4" />
            <span>Chuyển tiền liên ngân hàng 24/7 Napas</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Rút tiền về tài khoản ngân hàng
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Rút tiền từ ví FinVault về tài khoản ngân hàng liên kết an toàn, tức thì
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

      {/* ======================================================== */}
      {/* DẢI TRẠNG THÁI MINH BẠCH TIẾN TRÌNH RÚT TIỀN (STITCH)     */}
      {/* ======================================================== */}
      {!completedTxn && (
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3 border-b border-border/60">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <span>Trạng thái lệnh rút tiền gần nhất</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Theo dõi minh bạch tiến trình chuyển tiền về tài khoản ngân hàng của bạn
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-[11px] font-normal text-muted-foreground hidden sm:inline-flex">
                Cập nhật tự động
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {/* Thẻ 1: Đang xử lý */}
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <Badge className="bg-amber-500/20 text-amber-800 dark:text-amber-300 border-none text-[11px] font-bold gap-1">
                      <Clock className="h-3 w-3 animate-spin" />
                      Đang xử lý
                    </Badge>
                    <span className="text-[11px] text-amber-800 dark:text-amber-300 font-medium">Vừa xong</span>
                  </div>
                  <p className="text-base font-bold text-amber-900 dark:text-amber-200">-500.000 ₫</p>
                  <p className="text-xs text-amber-800 dark:text-amber-300 mt-1 leading-relaxed">
                    Ngân hàng đang xác nhận, tiền sẽ về tài khoản trong 1 - 3 phút.
                  </p>
                </div>
                <div className="mt-2.5 pt-2 border-t border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-300 flex justify-between">
                  <span>VCB *8829</span>
                  <span className="font-mono">#FV-8921849</span>
                </div>
              </div>

              {/* Thẻ 2: Thành công */}
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <Badge className="bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 border-none text-[11px] font-bold gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Thành công
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">10:15 Hôm nay</span>
                  </div>
                  <p className="text-base font-bold text-emerald-700 dark:text-emerald-300">-500.000 ₫</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Đã chuyển tiền vào tài khoản Vietcombank **** 8829.
                  </p>
                </div>
                <div className="mt-2.5 pt-2 border-t border-emerald-500/20 text-[11px] text-muted-foreground flex justify-between items-center">
                  <span>Mã GD: #FV-8874102</span>
                  <span className="font-medium text-emerald-700 dark:text-emerald-400">Đã nhận</span>
                </div>
              </div>

              {/* Thẻ 3: Hoàn tiền */}
              <div className="p-3.5 rounded-xl bg-muted/60 border border-border flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <Badge variant="outline" className="text-[11px] font-bold text-muted-foreground">
                      Đã hoàn tiền
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">Hôm qua</span>
                  </div>
                  <p className="text-base font-bold text-foreground">Hoàn lại 500.000 ₫</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Hệ thống ngân hàng bảo trì định kỳ, tiền đã được cộng lại ví.
                  </p>
                </div>
                <div className="mt-2.5 pt-2 border-t border-border text-[11px] text-muted-foreground flex justify-between">
                  <span>Số dư đã hoàn đủ</span>
                  <span className="font-mono">#FV-8851029</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ======================================================== */}
      {/* FORM RÚT TIỀN CHÍNH (2-COLUMN BENTO LAYOUT)              */}
      {/* ======================================================== */}
      {!completedTxn ? (
        <form onSubmit={handleOpenPinModal} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Cột trái: Ngân hàng thụ hưởng & Số tiền cần rút (7 cột) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Thẻ 1: Ngân hàng thụ hưởng */}
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base sm:text-lg">Ngân hàng thụ hưởng</CardTitle>
                    <CardDescription className="text-xs">
                      Chuyển khoản nhận ngay 24/7 an toàn và chuẩn xác
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setAddBankModalOpen(true)}
                    className="text-xs text-primary gap-1 cursor-pointer font-semibold"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Thêm ngân hàng</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Ngân hàng đang chọn */}
                <div className="p-4 rounded-xl border-2 border-primary bg-primary/5 flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-3.5">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-xs tracking-tighter shadow-xs"
                      style={{ backgroundColor: selectedBank.color }}
                    >
                      {selectedBank.bankCode}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground">{selectedBank.bankName}</span>
                        {selectedBank.isDefault && (
                          <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                            Mặc định
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs font-mono text-muted-foreground mt-0.5">
                        {selectedBank.accountNumber} <span className="font-sans font-medium text-foreground">| {selectedBank.accountHolder}</span>
                      </p>
                    </div>
                  </div>
                  <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                    <Check className="h-3.5 w-3.5" />
                  </div>
                </div>

                {/* Danh sách ngân hàng đã liên kết để đổi nhanh */}
                <div className="pt-2 border-t border-border/60">
                  <Label className="text-xs font-medium text-muted-foreground block mb-2">
                    Hoặc chọn nhanh tài khoản ngân hàng đã lưu:
                  </Label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {banks.map((bank) => (
                      <button
                        key={bank.id}
                        type="button"
                        onClick={() => setSelectedBankId(bank.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
                          selectedBankId === bank.id
                            ? 'border-primary bg-primary/10 text-primary font-semibold shadow-xs'
                            : 'border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <div
                          className="w-6 h-6 rounded-md flex items-center justify-center text-white text-[9px] font-bold shrink-0"
                          style={{ backgroundColor: bank.color }}
                        >
                          {bank.bankCode}
                        </div>
                        <div className="truncate text-xs">
                          <p className="font-medium truncate">{bank.bankName}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">{bank.accountNumber}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Thẻ 2: Số tiền cần rút */}
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base sm:text-lg">Số tiền cần rút</CardTitle>
                  <span className="text-xs text-muted-foreground font-medium">
                    Số dư: <strong className="text-foreground">{formatVnd(availableBalance)}</strong>
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Input số tiền lớn */}
                <div className="p-4 sm:p-5 rounded-2xl bg-muted/40 border border-border text-center">
                  <span className="text-xs text-muted-foreground block mb-2 font-medium">
                    Nhập số tiền cần rút (VND)
                  </span>
                  <div className="flex items-center justify-center gap-2">
                    <Input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0"
                      min={MIN_WITHDRAW}
                      max={availableBalance}
                      className="text-center font-bold text-2xl sm:text-3xl text-primary border-none shadow-none bg-transparent focus-visible:ring-0 max-w-[280px] h-12"
                    />
                    <span className="text-xl sm:text-2xl font-bold text-primary">₫</span>
                  </div>

                  {/* Nút chọn nhanh */}
                  <div className="flex items-center justify-center gap-2 mt-4 flex-wrap">
                    {[
                      { label: '200.000 ₫', value: '200000' },
                      { label: '500.000 ₫', value: '500000' },
                      { label: '1.000.000 ₫', value: '1000000' },
                      { label: `Tất cả (${formatVnd(availableBalance)})`, value: String(availableBalance) }
                    ].map((item) => (
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

                  {/* Thông tin hạn mức ngày */}
                  <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                    <Info className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span>
                      Hạn mức rút còn lại hôm nay:{' '}
                      <strong className="text-foreground">{formatVnd(remainingDailyLimit)}</strong>{' '}
                      (Cấp 2 tối đa {formatVnd(MAX_PER_TXN)}/lần)
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cột phải: Chi tiết giao dịch & Nút xác nhận PIN (5 cột) */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="border-border shadow-sm sticky top-24">
              <CardHeader className="pb-3 border-b border-border/60">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building className="h-4 w-4 text-primary" />
                  <span>Chi tiết giao dịch rút tiền</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4 text-sm">
                <div className="space-y-2.5 divide-y divide-border/60 text-xs sm:text-sm">
                  <div className="flex justify-between items-center py-1">
                    <span className="text-muted-foreground">Nguồn tiền trích nợ</span>
                    <span className="font-semibold text-foreground">Ví FinVault chính</span>
                  </div>

                  <div className="flex justify-between items-center py-2">
                    <span className="text-muted-foreground">Tài khoản nhận</span>
                    <span className="font-semibold text-foreground text-right truncate max-w-[180px]">
                      {selectedBank.bankName} ({selectedBank.accountNumber})
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-2">
                    <span className="text-muted-foreground">Số tiền rút</span>
                    <span className="font-bold text-foreground">{formatVnd(numericAmount)}</span>
                  </div>

                  <div className="flex justify-between items-center py-2">
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground">Phí rút tiền</span>
                      <Sparkles className="h-3 w-3 text-emerald-600" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="line-through text-muted-foreground text-xs">3.300 ₫</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">0 ₫ (Miễn phí)</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center py-2">
                    <span className="text-muted-foreground">Thời gian xử lý</span>
                    <span className="font-medium text-primary text-xs flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      Nhận ngay sau 1 - 3 phút
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-3">
                    <span className="font-semibold text-foreground">Tổng tiền trừ ví</span>
                    <span className="text-lg font-bold text-primary">{formatVnd(numericAmount)}</span>
                  </div>
                </div>

                {/* Nút kích hoạt PIN */}
                <Button
                  type="submit"
                  size="lg"
                  disabled={!isAmountValid}
                  className="w-full h-12 text-sm font-semibold gap-2 shadow-md cursor-pointer"
                >
                  <Lock className="h-4 w-4" />
                  <span>Xác nhận rút {formatVnd(numericAmount)}</span>
                </Button>

                <p className="text-[11px] text-center text-muted-foreground">
                  Giao dịch chuyển tiền liên ngân hàng 24/7 được bảo vệ bởi chuẩn mã hóa FinVault.
                </p>
              </CardContent>
            </Card>
          </div>
        </form>
      ) : (
        /* ======================================================== */
        /* BIÊN LAI RÚT TIỀN THÀNH CÔNG (SUCCESS RECEIPT)           */
        /* ======================================================== */
        <div className="max-w-xl mx-auto space-y-6 animate-in zoom-in-95 duration-200">
          <Card className="border-emerald-500/30 shadow-lg relative overflow-hidden bg-card">
            <div className="h-2 w-full bg-emerald-500" />
            <CardContent className="pt-8 pb-8 px-6 text-center space-y-6">
              <div className="mx-auto h-16 w-16 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner">
                <CheckCircle2 className="h-10 w-10" />
              </div>

              <div>
                <h2 className="text-2xl font-bold tracking-tight text-foreground">
                  Lệnh rút tiền thành công!
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Tiền đang được chuyển ngay về tài khoản ngân hàng của bạn
                </p>
              </div>

              {/* Số tiền rút lớn */}
              <div className="py-3 px-4 rounded-2xl bg-muted/40 border border-border text-center">
                <span className="text-xs text-muted-foreground block">Số tiền rút</span>
                <span className="text-3xl font-extrabold text-primary mt-0.5 block">
                  -{formatVnd(completedTxn.amount)}
                </span>
              </div>

              {/* Chi tiết biên lai */}
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
                  <span className="text-muted-foreground">Ngân hàng nhận</span>
                  <div className="text-right">
                    <span className="font-semibold text-foreground block">
                      {completedTxn.bank.bankName} ({completedTxn.bank.accountNumber})
                    </span>
                    <span className="text-xs text-muted-foreground">{completedTxn.bank.accountHolder}</span>
                  </div>
                </div>

                <div className="border-t border-border/60 pt-2.5 flex justify-between items-center">
                  <span className="text-muted-foreground">Phí rút tiền</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">0 ₫ (Miễn phí)</span>
                </div>

                <div className="border-t border-border/60 pt-2.5 flex justify-between items-center">
                  <span className="text-muted-foreground">Thời gian dự kiến nhận</span>
                  <span className="font-medium text-primary">Sau 1 - 3 phút (24/7)</span>
                </div>

                <div className="border-t border-border/60 pt-2.5 flex justify-between items-center">
                  <span className="font-semibold text-foreground">Số dư ví còn lại</span>
                  <span className="text-base font-bold text-foreground">{formatVnd(completedTxn.newBalance)}</span>
                </div>
              </div>

              {/* Các nút hành động cuối biên lai */}
              <div className="space-y-2.5 pt-2">
                <Button
                  type="button"
                  size="lg"
                  onClick={handleResetWithdraw}
                  className="w-full h-11 text-sm font-semibold gap-2 shadow-sm cursor-pointer"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Rút tiếp giao dịch khác</span>
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

      {/* Shared PIN Modal: Kích hoạt khi bấm rút tiền */}
      <PinModal
        open={pinModalOpen}
        onOpenChange={setPinModalOpen}
        title="Xác thực mã PIN rút tiền"
        description={`Xác nhận rút ${formatVnd(numericAmount)} về ${selectedBank.bankName} (${selectedBank.accountNumber}).`}
        amount={amount}
        onSuccess={handlePinSuccess}
        onCancel={() => setPinModalOpen(false)}
      />

      {/* Modal: Thêm liên kết ngân hàng mới */}
      <Dialog open={addBankModalOpen} onOpenChange={setAddBankModalOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Thêm tài khoản ngân hàng liên kết</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Liên kết tài khoản chính chủ để rút tiền nhanh chóng 24/7
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddBank} className="space-y-4 pt-2">
            <div className="space-y-1.5 text-left">
              <Label htmlFor="bankSelect" className="text-xs font-semibold">
                Ngân hàng thụ hưởng
              </Label>
              <select
                id="bankSelect"
                value={newBankName}
                onChange={(e) => setNewBankName(e.target.value)}
                className="w-full h-11 px-3 rounded-xl border border-input bg-background text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none"
              >
                <option value="VietinBank">VietinBank (Ngân hàng TMCP Công Thương VN)</option>
                <option value="Agribank">Agribank (Ngân hàng Nông nghiệp & PTNT)</option>
                <option value="VPBank">VPBank (Ngân hàng TMCP Việt Nam Thịnh Vượng)</option>
                <option value="HDBank">HDBank (Ngân hàng TMCP Phát triển TP.HCM)</option>
                <option value="Sacombank">Sacombank (Ngân hàng Sài Gòn Thương Tín)</option>
                <option value="TPBank">TPBank (Ngân hàng Tiên Phong)</option>
              </select>
            </div>

            <div className="space-y-1.5 text-left">
              <Label htmlFor="accNum" className="text-xs font-semibold">
                Số tài khoản ngân hàng
              </Label>
              <Input
                id="accNum"
                placeholder="Nhập số tài khoản ngân hàng..."
                value={newAccountNum}
                onChange={(e) => setNewAccountNum(e.target.value)}
                className="h-11 font-mono"
                required
              />
            </div>

            <div className="space-y-1.5 text-left">
              <Label htmlFor="holderName" className="text-xs font-semibold">
                Tên chủ tài khoản (Viết hoa không dấu)
              </Label>
              <Input
                id="holderName"
                value={newHolderName}
                onChange={(e) => setNewHolderName(e.target.value)}
                className="h-11 uppercase font-semibold"
                required
              />
            </div>

            <div className="pt-2 flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddBankModalOpen(false)}
                className="w-1/2 h-11 text-xs font-semibold cursor-pointer"
              >
                Hủy bỏ
              </Button>
              <Button type="submit" className="w-1/2 h-11 text-xs font-semibold shadow-sm cursor-pointer">
                Lưu liên kết
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default WithdrawPage
