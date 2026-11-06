import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Smartphone,
  Receipt,
  Zap,
  Droplets,
  Wifi,
  Search,
  CheckCircle2,
  ShieldCheck,
  Check,
  Printer,
  RotateCcw,
  ArrowLeft,
  Sparkles,
  Wallet,
  User,
  Copy
} from 'lucide-react'
import { useAuthStore } from '@/features/auth/stores/useAuthStore'
import { PinModal } from '@/features/auth/components/PinModal'
import { formatVnd, formatDateTime } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

type MainUtilityTab = 'TOPUP' | 'BILLS'
type TelcoProvider = 'VIETTEL' | 'MOBIFONE' | 'VINAPHONE'
type BillServiceType = 'ELECTRIC' | 'WATER' | 'INTERNET'

interface TelcoDenom {
  original: number
  discountPercent: number
  popular?: boolean
}

const TELCO_DENOMS: TelcoDenom[] = [
  { original: 20000, discountPercent: 3 },
  { original: 50000, discountPercent: 3 },
  { original: 100000, discountPercent: 3, popular: true },
  { original: 200000, discountPercent: 3 },
  { original: 500000, discountPercent: 3 }
]

interface BillLookupResult {
  customerCode: string
  customerName: string
  period: string
  address: string
  dueDate: string
  amount: number
  providerName: string
}

export function UtilitiesPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  // Số dư ví hiện tại
  const availableBalance = Number(user?.balance || '1250000')

  // Tab chính: 'TOPUP' (Nạp điện thoại) | 'BILLS' (Hóa đơn sinh hoạt)
  const [activeTab, setActiveTab] = useState<MainUtilityTab>('TOPUP')

  // Trạng thái TAB 1: Nạp điện thoại
  const [phoneNumber, setPhoneNumber] = useState('0987345888')
  const [selectedTelco, setSelectedTelco] = useState<TelcoProvider>('VIETTEL')
  const [selectedDenom, setSelectedDenom] = useState<number>(100000)

  // Trạng thái TAB 2: Thanh toán hóa đơn
  const [billType, setBillType] = useState<BillServiceType>('ELECTRIC')
  const [customerCode, setCustomerCode] = useState('PE0100028491')
  const [isSearchingBill, setIsSearchingBill] = useState(false)
  const [billResult, setBillResult] = useState<BillLookupResult | null>({
    customerCode: 'PE0100028491',
    customerName: 'Nguyễn Văn An',
    period: 'Tháng 10/2026 (Điện sinh hoạt)',
    address: 'Quận 1, TP. Hồ Chí Minh',
    dueDate: '25/10/2026',
    amount: 420000,
    providerName: 'Điện lực EVN Toàn quốc'
  })

  // Trạng thái xác thực PIN & Biên lai thành công
  const [pinModalOpen, setPinModalOpen] = useState(false)
  const [completedTxn, setCompletedTxn] = useState<{
    id: string
    timestamp: string
    title: string
    serviceDetails: string
    amount: number
    discount: number
    finalAmount: number
    newBalance: number
  } | null>(null)
  const [copiedTxn, setCopiedTxn] = useState(false)

  // Tính toán số tiền thanh toán
  const activeDenomItem = TELCO_DENOMS.find((d) => d.original === selectedDenom) || TELCO_DENOMS[2]
  const topupDiscount = Math.round(activeDenomItem.original * (activeDenomItem.discountPercent / 100))
  const topupFinalAmount = activeDenomItem.original - topupDiscount

  const currentPayAmount = activeTab === 'TOPUP' ? topupFinalAmount : billResult?.amount || 0
  const currentDiscount = activeTab === 'TOPUP' ? topupDiscount : 0
  const currentServiceName =
    activeTab === 'TOPUP'
      ? `Nạp ĐT ${selectedTelco} (${phoneNumber})`
      : `${billResult?.providerName} - ${billResult?.customerCode}`

  const isBalanceSufficient = availableBalance >= currentPayAmount

  // Tra cứu hóa đơn mẫu
  const handleLookupBill = () => {
    if (!customerCode.trim()) {
      toast.error('Vui lòng nhập mã khách hàng hoặc mã danh bộ.')
      return
    }

    setIsSearchingBill(true)
    setTimeout(() => {
      setIsSearchingBill(false)
      if (billType === 'ELECTRIC') {
        setBillResult({
          customerCode: customerCode.trim(),
          customerName: 'Nguyễn Văn An',
          period: 'Tháng 10/2026 (Điện sinh hoạt)',
          address: 'Quận 1, TP. Hồ Chí Minh',
          dueDate: '25/10/2026',
          amount: 420000,
          providerName: 'Tổng công ty Điện lực EVN'
        })
      } else if (billType === 'WATER') {
        setBillResult({
          customerCode: customerCode.trim(),
          customerName: 'Nguyễn Văn An',
          period: 'Kỳ nước 10/2026',
          address: 'Quận 1, TP. Hồ Chí Minh',
          dueDate: '28/10/2026',
          amount: 115000,
          providerName: 'Tổng công ty Cấp nước Sawaco'
        })
      } else {
        setBillResult({
          customerCode: customerCode.trim(),
          customerName: 'Nguyễn Văn An',
          period: 'Cước Internet cáp quang 10/2026',
          address: 'Quận 1, TP. Hồ Chí Minh',
          dueDate: '30/10/2026',
          amount: 220000,
          providerName: 'Internet FPT Telecom'
        })
      }
      toast.success('Đã tìm thấy thông tin hóa đơn cước!')
    }, 600)
  }

  // Đổi loại hóa đơn
  const handleSelectBillType = (type: BillServiceType) => {
    setBillType(type)
    if (type === 'ELECTRIC') {
      setCustomerCode('PE0100028491')
    } else if (type === 'WATER') {
      setCustomerCode('SW02001928')
    } else {
      setCustomerCode('FPT-HCM-8821')
    }
    setBillResult(null)
  }

  // Mở PIN Modal
  const handleOpenPin = () => {
    if (activeTab === 'TOPUP') {
      if (!phoneNumber || phoneNumber.length < 10) {
        toast.error('Vui lòng nhập số điện thoại hợp lệ (tối thiểu 10 số).')
        return
      }
    } else {
      if (!billResult) {
        toast.error('Vui lòng tra cứu hóa đơn trước khi thanh toán.')
        return
      }
    }

    if (!isBalanceSufficient) {
      toast.error(`Số dư khả dụng không đủ (${formatVnd(availableBalance)}). Vui lòng nạp thêm tiền.`)
      return
    }

    setPinModalOpen(true)
  }

  // Khi nhập PIN thành công
  const handlePinSuccess = () => {
    setPinModalOpen(false)
    const randomId = `FV-${Math.floor(8000000 + Math.random() * 1000000)}`
    const nowIso = new Date().toISOString()
    const updatedBalance = availableBalance - currentPayAmount

    setCompletedTxn({
      id: randomId,
      timestamp: nowIso,
      title: activeTab === 'TOPUP' ? 'Nạp tiền điện thoại thành công!' : 'Thanh toán hóa đơn thành công!',
      serviceDetails: currentServiceName,
      amount: activeTab === 'TOPUP' ? selectedDenom : currentPayAmount,
      discount: currentDiscount,
      finalAmount: currentPayAmount,
      newBalance: updatedBalance
    })

    toast.success('Giao dịch đã được thanh toán thành công!')
  }

  // Sao chép mã GD
  const handleCopyTxnId = (id: string) => {
    navigator.clipboard.writeText(id)
    setCopiedTxn(true)
    toast.success('Đã sao chép mã giao dịch')
    setTimeout(() => setCopiedTxn(false), 2000)
  }

  // Làm giao dịch mới
  const handleResetFlow = () => {
    setCompletedTxn(null)
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header khu vực làm việc */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary text-xs font-semibold uppercase tracking-wider mb-1">
            <Receipt className="h-4 w-4" />
            <span>Tiện ích đời sống & Viễn thông</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Thanh toán hóa đơn & Nạp điện thoại
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Nạp tiền điện thoại chiết khấu tức thì 3% và thanh toán hóa đơn sinh hoạt tiện lợi, nhanh chóng
          </p>
        </div>

        {/* Thẻ số dư ví */}
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

      {/* 2 Tabs lớn đầu trang chuẩn Stitch */}
      {!completedTxn && (
        <div className="flex items-center gap-3 border-b border-border pb-4">
          <Button
            type="button"
            onClick={() => setActiveTab('TOPUP')}
            className={`h-11 px-5 rounded-xl font-semibold text-xs sm:text-sm gap-2 cursor-pointer transition-all ${
              activeTab === 'TOPUP'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <Smartphone className="h-4 w-4" />
            <span>Nạp điện thoại di động</span>
          </Button>

          <Button
            type="button"
            onClick={() => setActiveTab('BILLS')}
            className={`h-11 px-5 rounded-xl font-semibold text-xs sm:text-sm gap-2 cursor-pointer transition-all ${
              activeTab === 'BILLS'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <Receipt className="h-4 w-4" />
            <span>Thanh toán hóa đơn sinh hoạt</span>
          </Button>
        </div>
      )}

      {/* ======================================================== */}
      {/* NỘI DUNG CHÍNH (2-COLUMN BENTO GRID)                     */}
      {/* ======================================================== */}
      {!completedTxn ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* CỘT TRÁI (Form nhập liệu - 7 cột) */}
          <div className="lg:col-span-7 space-y-6">
            {/* ================= TAB 1: NẠP ĐIỆN THOẠI ================= */}
            {activeTab === 'TOPUP' && (
              <Card className="border-border shadow-sm animate-in fade-in-50 duration-200">
                <CardHeader className="pb-4 border-b border-border/60">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-primary inline-block" />
                      <span>Thông tin nạp tiền di động</span>
                    </CardTitle>
                    <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-none text-xs font-semibold gap-1">
                      <Sparkles className="h-3 w-3" />
                      Chiết khấu 3% tức thì
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5 pt-4">
                  {/* Ô nhập số điện thoại */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="phoneInput" className="text-xs font-semibold text-foreground">
                        Số điện thoại người nhận
                      </Label>
                      <button
                        type="button"
                        onClick={() => setPhoneNumber('0987345888')}
                        className="text-primary hover:underline text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <User className="h-3.5 w-3.5" />
                        <span>Dùng số của tôi (0987***888)</span>
                      </button>
                    </div>
                    <div className="relative">
                      <Input
                        id="phoneInput"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                        placeholder="Nhập số điện thoại (10 chữ số)..."
                        className="h-11 text-base sm:text-sm font-medium pr-10"
                        maxLength={11}
                      />
                      <Smartphone className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>

                  {/* Chọn nhà mạng */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-foreground">Chọn nhà mạng viễn thông</Label>
                    <div className="grid grid-cols-3 gap-3">
                      {/* Viettel */}
                      <button
                        type="button"
                        onClick={() => setSelectedTelco('VIETTEL')}
                        className={`p-3 rounded-xl border-2 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer relative ${
                          selectedTelco === 'VIETTEL'
                            ? 'border-primary bg-primary/10 shadow-xs'
                            : 'border-border bg-card hover:bg-muted'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-xs tracking-tighter">
                          VT
                        </div>
                        <span className={`text-xs font-bold ${selectedTelco === 'VIETTEL' ? 'text-primary' : 'text-foreground'}`}>
                          Viettel
                        </span>
                        {selectedTelco === 'VIETTEL' && (
                          <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary text-white flex items-center justify-center">
                            <Check className="h-2.5 w-2.5" />
                          </div>
                        )}
                      </button>

                      {/* Mobifone */}
                      <button
                        type="button"
                        onClick={() => setSelectedTelco('MOBIFONE')}
                        className={`p-3 rounded-xl border-2 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer relative ${
                          selectedTelco === 'MOBIFONE'
                            ? 'border-primary bg-primary/10 shadow-xs'
                            : 'border-border bg-card hover:bg-muted'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs tracking-tighter">
                          MB
                        </div>
                        <span className={`text-xs font-bold ${selectedTelco === 'MOBIFONE' ? 'text-primary' : 'text-foreground'}`}>
                          Mobifone
                        </span>
                        {selectedTelco === 'MOBIFONE' && (
                          <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary text-white flex items-center justify-center">
                            <Check className="h-2.5 w-2.5" />
                          </div>
                        )}
                      </button>

                      {/* Vinaphone */}
                      <button
                        type="button"
                        onClick={() => setSelectedTelco('VINAPHONE')}
                        className={`p-3 rounded-xl border-2 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer relative ${
                          selectedTelco === 'VINAPHONE'
                            ? 'border-primary bg-primary/10 shadow-xs'
                            : 'border-border bg-card hover:bg-muted'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-full bg-sky-500 text-white flex items-center justify-center font-bold text-xs tracking-tighter">
                          VN
                        </div>
                        <span className={`text-xs font-bold ${selectedTelco === 'VINAPHONE' ? 'text-primary' : 'text-foreground'}`}>
                          Vinaphone
                        </span>
                        {selectedTelco === 'VINAPHONE' && (
                          <div className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary text-white flex items-center justify-center">
                            <Check className="h-2.5 w-2.5" />
                          </div>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Chọn mệnh giá */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label className="text-xs font-semibold text-foreground">Chọn mệnh giá tiền nạp</Label>
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                        Chiết khấu 3% trừ trực tiếp
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {TELCO_DENOMS.map((denom) => {
                        const discountedPrice = denom.original - Math.round(denom.original * (denom.discountPercent / 100))
                        const isSelected = selectedDenom === denom.original
                        return (
                          <button
                            key={denom.original}
                            type="button"
                            onClick={() => setSelectedDenom(denom.original)}
                            className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                              isSelected
                                ? 'border-primary bg-primary/10 shadow-xs'
                                : 'border-border bg-card hover:bg-muted'
                            }`}
                          >
                            {denom.popular && (
                              <span className="absolute -top-2 right-2 bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-xs">
                                Phổ biến
                              </span>
                            )}
                            <span className={`text-sm font-bold ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                              {formatVnd(denom.original)}
                            </span>
                            <span className="text-xs text-muted-foreground mt-0.5">
                              Trả: <strong className="text-foreground">{formatVnd(discountedPrice)}</strong>
                            </span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Dòng ưu đãi */}
                  <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3">
                    <Sparkles className="h-5 w-5 text-emerald-600 shrink-0" />
                    <div className="text-xs text-muted-foreground">
                      <strong className="text-foreground block">Ưu đãi hoàn tiền 3% (tiết kiệm {formatVnd(topupDiscount)})</strong>
                      Áp dụng trực tiếp vào giao dịch nạp tiền hôm nay cho thành viên FinVault Cấp 2.
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ================= TAB 2: THANH TOÁN HÓA ĐƠN ================= */}
            {activeTab === 'BILLS' && (
              <Card className="border-border shadow-sm animate-in fade-in-50 duration-200">
                <CardHeader className="pb-4 border-b border-border/60">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-primary inline-block" />
                      <span>Tra cứu hóa đơn sinh hoạt</span>
                    </CardTitle>
                    <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-500/30 font-semibold">
                      Miễn phí thu hộ 0 ₫
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5 pt-4">
                  {/* Chọn loại dịch vụ */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-foreground">Chọn loại hóa đơn cần thanh toán</Label>
                    <div className="grid grid-cols-3 gap-3">
                      {/* Tiền điện */}
                      <button
                        type="button"
                        onClick={() => handleSelectBillType('ELECTRIC')}
                        className={`p-3 rounded-xl border-2 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          billType === 'ELECTRIC'
                            ? 'border-primary bg-primary/10 shadow-xs'
                            : 'border-border bg-card hover:bg-muted'
                        }`}
                      >
                        <div className="w-9 h-9 rounded-full bg-amber-500/15 text-amber-600 flex items-center justify-center">
                          <Zap className="h-5 w-5" />
                        </div>
                        <span className={`text-xs font-bold ${billType === 'ELECTRIC' ? 'text-primary' : 'text-foreground'}`}>
                          Tiền Điện
                        </span>
                        <span className="text-[10px] text-muted-foreground">EVN Toàn quốc</span>
                      </button>

                      {/* Tiền nước */}
                      <button
                        type="button"
                        onClick={() => handleSelectBillType('WATER')}
                        className={`p-3 rounded-xl border-2 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          billType === 'WATER'
                            ? 'border-primary bg-primary/10 shadow-xs'
                            : 'border-border bg-card hover:bg-muted'
                        }`}
                      >
                        <div className="w-9 h-9 rounded-full bg-blue-500/15 text-blue-600 flex items-center justify-center">
                          <Droplets className="h-5 w-5" />
                        </div>
                        <span className={`text-xs font-bold ${billType === 'WATER' ? 'text-primary' : 'text-foreground'}`}>
                          Tiền Nước
                        </span>
                        <span className="text-[10px] text-muted-foreground">Sawaco / Cấp nước</span>
                      </button>

                      {/* Internet */}
                      <button
                        type="button"
                        onClick={() => handleSelectBillType('INTERNET')}
                        className={`p-3 rounded-xl border-2 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          billType === 'INTERNET'
                            ? 'border-primary bg-primary/10 shadow-xs'
                            : 'border-border bg-card hover:bg-muted'
                        }`}
                      >
                        <div className="w-9 h-9 rounded-full bg-indigo-500/15 text-indigo-600 flex items-center justify-center">
                          <Wifi className="h-5 w-5" />
                        </div>
                        <span className={`text-xs font-bold ${billType === 'INTERNET' ? 'text-primary' : 'text-foreground'}`}>
                          Internet & TV
                        </span>
                        <span className="text-[10px] text-muted-foreground">FPT / VNPT / Viettel</span>
                      </button>
                    </div>
                  </div>

                  {/* Mã khách hàng & nút tra cứu */}
                  <div className="space-y-1.5">
                    <Label htmlFor="custCode" className="text-xs font-semibold text-foreground">
                      Mã khách hàng / Mã danh bộ
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="custCode"
                        value={customerCode}
                        onChange={(e) => setCustomerCode(e.target.value)}
                        placeholder="Ví dụ: PE0100028491..."
                        className="h-11 font-mono uppercase"
                      />
                      <Button
                        type="button"
                        disabled={isSearchingBill}
                        onClick={handleLookupBill}
                        className="h-11 px-4 text-xs font-semibold gap-1.5 cursor-pointer shrink-0"
                      >
                        <Search className="h-4 w-4" />
                        <span>Tra cứu</span>
                      </Button>
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      Mã khách hàng in trên hóa đơn giấy hoặc tin nhắn SMS thông báo cước.
                    </span>
                  </div>

                  {/* Kết quả tra cứu cước */}
                  {billResult && (
                    <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3 animate-in fade-in-50 duration-200">
                      <div className="flex items-center justify-between pb-2 border-b border-primary/15">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-primary" />
                          <span className="font-bold text-sm text-foreground">
                            Đã tìm thấy hóa đơn {billResult.providerName}
                          </span>
                        </div>
                        <Badge className="bg-amber-500/20 text-amber-800 dark:text-amber-300 border-none text-[10px] font-bold">
                          Chưa thanh toán
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-muted-foreground block">Tên khách hàng:</span>
                          <span className="font-bold text-foreground">{billResult.customerName}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Kỳ hóa đơn:</span>
                          <span className="font-semibold text-foreground">{billResult.period}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Địa chỉ:</span>
                          <span className="text-foreground">{billResult.address}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block">Hạn thanh toán:</span>
                          <span className="text-destructive font-semibold">{billResult.dueDate}</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-primary/15 flex items-baseline justify-between">
                        <span className="text-xs font-semibold text-muted-foreground">Số tiền cước:</span>
                        <span className="text-xl font-bold text-primary">{formatVnd(billResult.amount)}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Ghi chú an toàn */}
            <div className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border text-xs text-muted-foreground shadow-xs">
              <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
              <span>
                Mọi giao dịch thanh toán tại FinVault đều được mã hóa an toàn và gửi biên lai điện tử tức thì về hòm thư người dùng.
              </span>
            </div>
          </div>

          {/* CỘT PHẢI: CHI TIẾT THANH TOÁN & NÚT BẤM (5 cột) */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="border-border shadow-sm sticky top-24">
              <CardHeader className="pb-3 border-b border-border/60">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Chi tiết thanh toán</span>
                  <Receipt className="h-4 w-4 text-primary" />
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3.5 pt-4 text-xs sm:text-sm">
                {/* Nguồn thanh toán */}
                <div className="flex items-center justify-between py-1">
                  <span className="text-muted-foreground">Nguồn thanh toán:</span>
                  <div className="text-right">
                    <span className="font-semibold text-foreground block">Ví FinVault chính</span>
                    <span className="text-[11px] text-muted-foreground">(Số dư: {formatVnd(availableBalance)})</span>
                  </div>
                </div>

                {/* Dịch vụ */}
                <div className="flex items-center justify-between py-2 border-t border-border/60">
                  <span className="text-muted-foreground">Dịch vụ:</span>
                  <span className="font-semibold text-foreground text-right truncate max-w-[200px]">
                    {currentServiceName}
                  </span>
                </div>

                {/* Mệnh giá gốc */}
                <div className="flex items-center justify-between py-2 border-t border-border/60">
                  <span className="text-muted-foreground">Giá gốc:</span>
                  <span className="font-semibold text-foreground">
                    {formatVnd(activeTab === 'TOPUP' ? selectedDenom : billResult?.amount || 0)}
                  </span>
                </div>

                {/* Chiết khấu nếu có */}
                {currentDiscount > 0 && (
                  <div className="flex items-center justify-between py-2 border-t border-border/60 text-emerald-600 dark:text-emerald-400">
                    <span className="font-medium">Ưu đãi hoàn tiền (3%):</span>
                    <span className="font-bold">- {formatVnd(currentDiscount)}</span>
                  </div>
                )}

                {/* Phí */}
                <div className="flex items-center justify-between py-2 border-t border-border/60">
                  <span className="text-muted-foreground">Phí giao dịch:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">0 ₫ (Miễn phí)</span>
                </div>

                {/* Tổng thanh toán */}
                <div className="pt-3 border-t-2 border-dashed border-border/80">
                  <div className="flex items-baseline justify-between">
                    <span className="font-bold text-foreground">Tổng tiền thanh toán:</span>
                    <span className="text-2xl font-extrabold text-primary">{formatVnd(currentPayAmount)}</span>
                  </div>
                  <div className="text-right mt-1 text-[11px] text-muted-foreground">
                    Số dư còn lại dự kiến:{' '}
                    <strong className="text-foreground">
                      {formatVnd(Math.max(0, availableBalance - currentPayAmount))}
                    </strong>
                  </div>
                </div>

                {/* Nút bấm thanh toán */}
                <Button
                  type="button"
                  size="lg"
                  disabled={!isBalanceSufficient || currentPayAmount <= 0}
                  onClick={handleOpenPin}
                  className="w-full h-12 text-sm font-semibold gap-2 shadow-md cursor-pointer mt-2"
                >
                  <Receipt className="h-4 w-4" />
                  <span>Thanh toán ngay {formatVnd(currentPayAmount)}</span>
                </Button>

                {!isBalanceSufficient && (
                  <p className="text-[11px] text-center text-destructive font-medium">
                    Số dư ví không đủ để thanh toán. Vui lòng nạp thêm tiền.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        /* ======================================================== */
        /* BIÊN LAI THANH TOÁN TIỆN ÍCH THÀNH CÔNG                  */
        /* ======================================================== */
        <div className="max-w-xl mx-auto space-y-6 animate-in zoom-in-95 duration-200">
          <Card className="border-emerald-500/30 shadow-lg relative overflow-hidden bg-card">
            <div className="h-2 w-full bg-emerald-500" />
            <CardContent className="pt-8 pb-8 px-6 text-center space-y-6">
              <div className="mx-auto h-16 w-16 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner">
                <CheckCircle2 className="h-10 w-10" />
              </div>

              <div>
                <h2 className="text-2xl font-bold tracking-tight text-foreground">{completedTxn.title}</h2>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  Giao dịch tiện ích đã được hoàn tất và ghi nhận ngay lập tức
                </p>
              </div>

              {/* Số tiền thanh toán */}
              <div className="py-3 px-4 rounded-2xl bg-muted/40 border border-border text-center">
                <span className="text-xs text-muted-foreground block">Số tiền đã thanh toán</span>
                <span className="text-3xl font-extrabold text-primary mt-0.5 block">
                  {formatVnd(completedTxn.finalAmount)}
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
                  <span className="text-muted-foreground">Dịch vụ</span>
                  <span className="font-semibold text-foreground text-right truncate max-w-[220px]">
                    {completedTxn.serviceDetails}
                  </span>
                </div>

                {completedTxn.discount > 0 && (
                  <div className="border-t border-border/60 pt-2.5 flex justify-between items-center">
                    <span className="text-muted-foreground">Chiết khấu ưu đãi</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      - {formatVnd(completedTxn.discount)}
                    </span>
                  </div>
                )}

                <div className="border-t border-border/60 pt-2.5 flex justify-between items-center">
                  <span className="text-muted-foreground">Nguồn thanh toán</span>
                  <span className="font-medium text-foreground">Số dư ví FinVault</span>
                </div>

                <div className="border-t border-border/60 pt-2.5 flex justify-between items-center">
                  <span className="text-muted-foreground">Phí giao dịch</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">0 ₫ (Miễn phí)</span>
                </div>

                <div className="border-t border-border/60 pt-2.5 flex justify-between items-center">
                  <span className="font-semibold text-foreground">Số dư ví khả dụng mới</span>
                  <span className="text-base font-bold text-primary">{formatVnd(completedTxn.newBalance)}</span>
                </div>
              </div>

              {/* Các nút hành động */}
              <div className="space-y-2.5 pt-2">
                <Button
                  type="button"
                  size="lg"
                  onClick={handleResetFlow}
                  className="w-full h-11 text-sm font-semibold gap-2 shadow-sm cursor-pointer"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Thực hiện giao dịch khác</span>
                </Button>

                <div className="grid grid-cols-2 gap-2.5">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => window.print()}
                    className="h-10 text-xs font-semibold gap-1.5 cursor-pointer"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    <span>In biên lai</span>
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

      {/* Shared PIN Modal: Kích hoạt khi bấm Thanh toán */}
      <PinModal
        open={pinModalOpen}
        onOpenChange={setPinModalOpen}
        title="Xác thực mã PIN thanh toán"
        description={`Xác nhận thanh toán ${formatVnd(currentPayAmount)} cho dịch vụ ${currentServiceName}.`}
        amount={String(currentPayAmount)}
        onSuccess={handlePinSuccess}
        onCancel={() => setPinModalOpen(false)}
      />
    </div>
  )
}

export default UtilitiesPage
