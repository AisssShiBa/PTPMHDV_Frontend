import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Store,
  TrendingUp,
  Clock,
  QrCode,
  Printer,
  Download,
  Key,
  Copy,
  RotateCcw,
  Check,
  AlertTriangle,
  Send,
  ArrowLeft,
  Building2,
  Tag,
  Plus,
  ShieldCheck,
  FileText,
  DollarSign,
  CheckCircle2,
  ArrowUpRight
} from 'lucide-react'
import { formatVnd } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import { toast } from 'sonner'

interface RecentMerchantPayment {
  id: string
  transactionCode: string
  customerName: string
  paymentMethod: string
  amount: number
  fee: number
  netAmount: number
  time: string
  channel: 'Quầy thu ngân' | 'Website Online' | 'Ứng dụng App'
  status: 'SUCCESS'
}

interface MerchantVoucher {
  id: string
  code: string
  title: string
  discount: string
  minOrder: number
  usedCount: number
  totalLimit: number
  startDate: string
  endDate: string
  status: 'ACTIVE' | 'PENDING_APPROVAL' | 'EXPIRED'
}

const RECENT_PAYMENTS: RecentMerchantPayment[] = [
  {
    id: 'TXN-8821',
    transactionCode: 'FV20261106-9921',
    customerName: 'Nguyễn Văn An',
    paymentMethod: 'Ví FinVault',
    amount: 145000,
    fee: 1450,
    netAmount: 143550,
    time: '18:20 hôm nay',
    channel: 'Quầy thu ngân',
    status: 'SUCCESS'
  },
  {
    id: 'TXN-8820',
    transactionCode: 'FV20261106-9920',
    customerName: 'Lê Hoàng Long',
    paymentMethod: 'Ví FinVault (VietQR)',
    amount: 325000,
    fee: 3250,
    netAmount: 321750,
    time: '18:15 hôm nay',
    channel: 'Website Online',
    status: 'SUCCESS'
  },
  {
    id: 'TXN-8819',
    transactionCode: 'FV20261106-9919',
    customerName: 'Trần Thị Mai',
    paymentMethod: 'Ví FinVault',
    amount: 68000,
    fee: 680,
    netAmount: 67320,
    time: '18:02 hôm nay',
    channel: 'Quầy thu ngân',
    status: 'SUCCESS'
  },
  {
    id: 'TXN-8818',
    transactionCode: 'FV20261106-9918',
    customerName: 'Phạm Đức Minh',
    paymentMethod: 'Ví FinVault',
    amount: 190000,
    fee: 1900,
    netAmount: 188100,
    time: '17:45 hôm nay',
    channel: 'Quầy thu ngân',
    status: 'SUCCESS'
  }
]

const MERCHANT_VOUCHERS: MerchantVoucher[] = [
  {
    id: 'VOU-01',
    code: 'HIGHLANDS20K',
    title: 'Giảm 20.000 ₫ đồ uống yêu thích',
    discount: '-20.000 ₫',
    minOrder: 80000,
    usedCount: 342,
    totalLimit: 500,
    startDate: '01/11/2026',
    endDate: '30/11/2026',
    status: 'ACTIVE'
  },
  {
    id: 'VOU-02',
    code: 'COFFEEMORNING',
    title: 'Ưu đãi cà phê sáng 15%',
    discount: 'Giảm 15%',
    minOrder: 50000,
    usedCount: 180,
    totalLimit: 300,
    startDate: '05/11/2026',
    endDate: '15/11/2026',
    status: 'ACTIVE'
  },
  {
    id: 'VOU-03',
    code: 'BLACKFRIDAYFV',
    title: 'Đại tiệc Black Friday hoàn tiền 30k',
    discount: '-30.000 ₫',
    minOrder: 120000,
    usedCount: 0,
    totalLimit: 1000,
    startDate: '25/11/2026',
    endDate: '29/11/2026',
    status: 'PENDING_APPROVAL'
  }
]

export function MerchantPortalPage() {
  // Trạng thái tài khoản đối tác (dùng để chuyển đổi giữa Đã có đối tác & Chưa đăng ký)
  const [isRegistered, setIsRegistered] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'api' | 'vouchers'>('overview')
  const [selectedBranch, setSelectedBranch] = useState('ham-nghi')

  // Thông tin đối tác doanh nghiệp
  const merchantId = 'MCH-HIGHLANDS-01'
  const merchantName = 'Highlands Coffee Việt Nam'
  const taxId = '0303882910'
  const settlementBank = 'Vietcombank - CN Tân Bình'
  const settlementAccount = '0071001234567'

  // API Key & Webhook states
  const publicKey = 'pub_live_fv_88291039847192'
  const [maskedSecretKey, setMaskedSecretKey] = useState('sec_live_99482********************')
  const [webhookUrl, setWebhookUrl] = useState('https://api.highlandscoffee.com.vn/webhook/finvault-ipn')
  const [isPingingWebhook, setIsPingingWebhook] = useState(false)

  // One-time visible secret key modal (Prompt 0)
  const [newSecretKeyModalOpen, setNewSecretKeyModalOpen] = useState(false)
  const [generatedSecretKey, setGeneratedSecretKey] = useState('')
  const [copiedSecret, setCopiedSecret] = useState(false)
  const [copiedPublic, setCopiedPublic] = useState(false)
  const [copiedMerchantId, setCopiedMerchantId] = useState(false)

  // Modal tạo voucher mới
  const [newVoucherModalOpen, setNewVoucherModalOpen] = useState(false)
  const [voucherCode, setVoucherCode] = useState('')
  const [voucherDiscount, setVoucherDiscount] = useState('')
  const [voucherMinOrder, setVoucherMinOrder] = useState('100000')

  // Mở modal tạo lại secret key
  const handleRegenerateSecretKey = () => {
    const randomHex = Array.from({ length: 32 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('')
    const newKey = `sec_live_${randomHex}`
    setGeneratedSecretKey(newKey)
    setMaskedSecretKey(`sec_live_${newKey.slice(9, 14)}********************`)
    setNewSecretKeyModalOpen(true)
  }

  // Sao chép
  const handleCopy = (text: string, type: 'secret' | 'public' | 'mch') => {
    navigator.clipboard.writeText(text)
    if (type === 'secret') {
      setCopiedSecret(true)
      setTimeout(() => setCopiedSecret(false), 2000)
    } else if (type === 'public') {
      setCopiedPublic(true)
      setTimeout(() => setCopiedPublic(false), 2000)
    } else {
      setCopiedMerchantId(true)
      setTimeout(() => setCopiedMerchantId(false), 2000)
    }
    toast.success('Đã sao chép vào bộ nhớ tạm')
  }

  // Thử nghiệm gửi Webhook IPN
  const handlePingWebhook = () => {
    setIsPingingWebhook(true)
    setTimeout(() => {
      setIsPingingWebhook(false)
      toast.success('Webhook Ping thành công (HTTP 200 OK)!', {
        description: 'Hệ thống máy chủ Highlands Coffee đã nhận và xác thực chữ ký số HMAC-SHA256 thành công.'
      })
    }, 1000)
  }

  // Đăng ký voucher ưu đãi mới
  const handleCreateVoucher = (e: React.FormEvent) => {
    e.preventDefault()
    if (!voucherCode.trim() || !voucherDiscount.trim()) {
      toast.error('Vui lòng điền đầy đủ mã khuyến mãi và giá trị giảm')
      return
    }
    setNewVoucherModalOpen(false)
    toast.success('Chiến dịch khuyến mãi đã được gửi thẩm định!', {
      description: 'Đội ngũ FinVault sẽ kiểm duyệt nội dung và kích hoạt hiển thị trên Ứng dụng trong vòng 2 giờ.'
    })
    setVoucherCode('')
    setVoucherDiscount('')
  }

  // NẾU TÀI KHOẢN CHƯA ĐĂNG KÝ MERCHANT (Prompt 0: useMyMerchant returns null)
  if (!isRegistered) {
    return (
      <div className="max-w-5xl mx-auto space-y-8 pb-12">
        {/* Nút quay lại ví */}
        <div className="flex items-center justify-between">
          <Button asChild variant="outline" className="h-10 text-xs font-semibold gap-1.5 cursor-pointer">
            <Link to="/app">
              <ArrowLeft className="h-4 w-4" />
              <span>Ví cá nhân FinVault</span>
            </Link>
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={() => setIsRegistered(true)}
            className="text-xs text-primary font-semibold hover:underline"
          >
            Trải nghiệm tài khoản Doanh nghiệp (Đã duyệt)
          </Button>
        </div>

        {/* Hero Banner Onboarding */}
        <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-primary via-emerald-800 to-slate-900 text-white p-8 md:p-12 shadow-xl border border-primary/20">
          <div className="relative z-10 max-w-2xl space-y-4">
            <Badge className="bg-white/20 text-white hover:bg-white/30 backdrop-blur-md border-none text-xs font-bold gap-1.5 py-1 px-3">
              <Store className="h-3.5 w-3.5" />
              FINVAULT FOR BUSINESS
            </Badge>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight">
              Giải pháp Cổng thanh toán toàn diện cho Doanh nghiệp
            </h1>
            <p className="text-white/80 text-sm sm:text-base leading-relaxed">
              Chấp nhận thanh toán bằng ví điện tử FinVault và VietQR tại quầy thu ngân hoặc tích hợp vào website, ứng dụng kinh doanh của bạn. Phí ưu đãi chỉ từ 1%, quyết toán tự động về tài khoản ngân hàng doanh nghiệp mỗi ngày.
            </p>
            <div className="pt-4 flex flex-col sm:flex-row gap-3">
              <Button asChild className="h-12 px-6 rounded-xl bg-white text-slate-900 hover:bg-white/90 font-bold text-sm shadow-lg gap-2 cursor-pointer">
                <Link to="/merchant/register">
                  <span>Đăng ký mở Cổng Đối tác</span>
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                type="button"
                onClick={() => setIsRegistered(true)}
                variant="outline"
                className="h-12 px-6 rounded-xl bg-white/10 hover:bg-white/20 text-white border-white/20 font-semibold text-sm backdrop-blur-md cursor-pointer"
              >
                Xem Cổng quản trị mẫu
              </Button>
            </div>
          </div>
        </div>

        {/* Lợi ích khi trở thành đối tác FinVault */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-border shadow-sm p-6 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <QrCode className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-bold text-foreground">Standee QR tại quầy thanh toán</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Cung cấp mã QR để bàn thanh toán tức thì. Khách hàng quét mã bằng ứng dụng FinVault hoặc bất kỳ ứng dụng ngân hàng nào qua chuẩn VietQR Napas.
            </p>
          </Card>

          <Card className="border-border shadow-sm p-6 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Key className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-bold text-foreground">Tích hợp API trong 15 phút</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Kết nối cổng thanh toán trực tuyến vào website bán hàng, máy tính tiền POS hoặc ứng dụng di động với SDK hiện đại và Webhook thông báo tự động.
            </p>
          </Card>

          <Card className="border-border shadow-sm p-6 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Tag className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-bold text-foreground">Quảng bá & Phát hành Voucher</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Tiếp cận hàng triệu khách hàng thường xuyên của FinVault. Tạo voucher giảm giá hiển thị trực tiếp trên Trang chủ và mục Tiện ích ứng dụng.
            </p>
          </Card>
        </div>
      </div>
    )
  }

  // KHI TÀI KHOẢN ĐÃ LÀ MERCHANT ĐƯỢC DUYỆT (ACTIVE)
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header đối tác & Chi nhánh */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge className="bg-primary hover:bg-primary/90 text-primary-foreground border-none font-bold text-xs gap-1">
              <Store className="h-3.5 w-3.5" />
              FINVAULT MERCHANT
            </Badge>
            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-none text-xs font-semibold gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              Đã xác thực doanh nghiệp
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {merchantName}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Mã đối tác: <strong className="text-foreground font-mono">{merchantId}</strong> • MST: <span className="font-mono text-foreground">{taxId}</span> • Tài khoản thụ hưởng: <span className="font-semibold text-foreground">{settlementBank} ({settlementAccount})</span>
          </p>
        </div>

        {/* Bộ chọn chi nhánh & chuyển vai trò */}
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="h-10 px-3 rounded-xl border border-input bg-card text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer"
          >
            <option value="ham-nghi">Chi nhánh Hàm Nghi Q1 (Trụ sở chính)</option>
            <option value="nguyen-trai">Chi nhánh Nguyễn Trãi Q5</option>
            <option value="landmark81">Chi nhánh Landmark 81 Bình Thạnh</option>
          </select>

          <Button asChild variant="outline" className="h-10 text-xs font-semibold gap-1.5 cursor-pointer">
            <Link to="/app">
              <ArrowLeft className="h-4 w-4" />
              <span>Ví cá nhân</span>
            </Link>
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={() => setIsRegistered(false)}
            className="h-10 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
          >
            Mô phỏng chưa đăng ký
          </Button>
        </div>
      </div>

      {/* 4 Thẻ Chỉ số Thanh toán & Quyết toán (Settlement Metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Thẻ 1: Doanh thu hôm nay */}
        <Card className="border-border shadow-xs hover:border-primary/40 transition-all">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Doanh thu thu hộ hôm nay</span>
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-foreground tracking-tight">
              8.450.000 <span className="text-sm font-normal text-muted-foreground">₫</span>
            </div>
            <div className="flex items-center justify-between pt-3 mt-3 border-t border-border/60 text-xs">
              <div className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="h-3.5 w-3.5" />
                <span>+12% so với hôm qua</span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-muted font-medium text-muted-foreground">
                185 đơn
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Thẻ 2: Chờ quyết toán (T+1) */}
        <Card className="border-border shadow-xs hover:border-primary/40 transition-all">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Chờ quyết toán (T+1)</span>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 tracking-tight">
              7.605.000 <span className="text-sm font-normal text-muted-foreground">₫</span>
            </div>
            <div className="flex items-center justify-between pt-3 mt-3 border-t border-border/60 text-xs text-muted-foreground">
              <span>Chuyển về VCB 09:00 sáng mai</span>
              <span className="font-medium text-foreground">Phí: 1%</span>
            </div>
          </CardContent>
        </Card>

        {/* Thẻ 3: Đã thanh toán tháng này */}
        <Card className="border-border shadow-xs hover:border-primary/40 transition-all">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Đã quyết toán tháng 11</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-foreground tracking-tight">
              198.400.000 <span className="text-sm font-normal text-muted-foreground">₫</span>
            </div>
            <div className="flex items-center justify-between pt-3 mt-3 border-t border-border/60 text-xs text-muted-foreground">
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Tự động quyết toán T+1</span>
              <span>30 phiên</span>
            </div>
          </CardContent>
        </Card>

        {/* Thẻ 4: Tỷ lệ thành công */}
        <Card className="border-border shadow-xs hover:border-primary/40 transition-all">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Tỷ lệ thanh toán thành công</span>
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <ShieldCheck className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-foreground tracking-tight">
              99.8%
            </div>
            <div className="flex items-center justify-between pt-3 mt-3 border-t border-border/60 text-xs text-muted-foreground">
              <span>Độ trễ IPN Webhook</span>
              <span className="font-mono text-primary font-bold">240ms</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs điều hướng: 1. Doanh thu & Quầy thanh toán, 2. Khóa API & Webhook, 3. Voucher & Ưu đãi */}
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as 'overview' | 'api' | 'vouchers')} className="w-full">
        <TabsList className="grid w-full sm:w-[540px] grid-cols-3 mb-6">
          <TabsTrigger value="overview" className="text-xs sm:text-sm font-semibold gap-1.5 cursor-pointer">
            <TrendingUp className="h-4 w-4" />
            <span>Doanh số & Điểm bán</span>
          </TabsTrigger>
          <TabsTrigger value="api" className="text-xs sm:text-sm font-semibold gap-1.5 cursor-pointer">
            <Key className="h-4 w-4" />
            <span>Khóa API & Webhook</span>
          </TabsTrigger>
          <TabsTrigger value="vouchers" className="text-xs sm:text-sm font-semibold gap-1.5 cursor-pointer">
            <Tag className="h-4 w-4" />
            <span>Chiến dịch Voucher</span>
          </TabsTrigger>
        </TabsList>

        {/* ======================================================== */}
        {/* TAB 1: DOANH SỐ, BIỂU ĐỒ & ĐIỂM BÁN                      */}
        {/* ======================================================== */}
        <TabsContent value="overview" className="space-y-6 mt-0 animate-in fade-in-50 duration-200">
          {/* Biểu đồ doanh thu theo khung giờ */}
          <Card className="border-border shadow-xs">
            <CardHeader className="pb-2 border-b border-border/60">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base sm:text-lg">Biểu đồ dòng doanh thu theo khung giờ</CardTitle>
                  <CardDescription className="text-xs">
                    Theo dõi lưu lượng thanh toán thu hộ từ 07:00 đến 22:00 hôm nay tại chi nhánh Hàm Nghi Q1
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-primary inline-block" />
                    <span className="text-foreground font-semibold">Hôm nay</span>
                  </div>
                  <Badge variant="outline" className="text-[11px] font-semibold text-primary border-primary/30">
                    Cao điểm: 11:30 & 19:30
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="relative w-full h-64 sm:h-72">
                <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 900 240">
                  <defs>
                    <linearGradient id="merchantRevGradient" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#0F9D8A" stopOpacity="0.3" />
                      <stop offset="90%" stopColor="#0F9D8A" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Đường lưới ngang */}
                  <line stroke="currentColor" strokeOpacity="0.1" strokeDasharray="4 4" x1="40" x2="880" y1="20" y2="20" />
                  <line stroke="currentColor" strokeOpacity="0.1" strokeDasharray="4 4" x1="40" x2="880" y1="70" y2="70" />
                  <line stroke="currentColor" strokeOpacity="0.1" strokeDasharray="4 4" x1="40" x2="880" y1="120" y2="120" />
                  <line stroke="currentColor" strokeOpacity="0.1" strokeDasharray="4 4" x1="40" x2="880" y1="170" y2="170" />
                  <line stroke="currentColor" strokeOpacity="0.15" x1="40" x2="880" y1="210" y2="210" />

                  {/* Nhãn trục Y */}
                  <text fill="currentColor" opacity="0.6" fontSize="11" textAnchor="end" x="32" y="24">1.4M</text>
                  <text fill="currentColor" opacity="0.6" fontSize="11" textAnchor="end" x="32" y="74">1.0M</text>
                  <text fill="currentColor" opacity="0.6" fontSize="11" textAnchor="end" x="32" y="124">600k</text>
                  <text fill="currentColor" opacity="0.6" fontSize="11" textAnchor="end" x="32" y="174">200k</text>
                  <text fill="currentColor" opacity="0.6" fontSize="11" textAnchor="end" x="32" y="214">0 ₫</text>

                  {/* Vùng đổ màu */}
                  <path
                    d="M 60 185 C 100 170, 180 120, 240 90 C 270 70, 290 35, 330 40 C 370 45, 410 145, 470 140 C 520 135, 570 85, 620 55 C 660 30, 700 45, 750 90 C 790 130, 810 175, 840 195 L 840 210 L 60 210 Z"
                    fill="url(#merchantRevGradient)"
                  />

                  {/* Đường nét chính */}
                  <path
                    d="M 60 185 C 100 170, 180 120, 240 90 C 270 70, 290 35, 330 40 C 370 45, 410 145, 470 140 C 520 135, 570 85, 620 55 C 660 30, 700 45, 750 90 C 790 130, 810 175, 840 195"
                    fill="none"
                    stroke="#0F9D8A"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />

                  {/* Điểm cực đại Trưa & Tối */}
                  <circle cx="330" cy="40" r="5" fill="#0F9D8A" stroke="#ffffff" strokeWidth="2.5" />
                  <circle cx="650" cy="35" r="5" fill="#0F9D8A" stroke="#ffffff" strokeWidth="2.5" />
                </svg>
              </div>

              {/* Trục hoành các mốc giờ */}
              <div className="flex justify-between text-xs text-muted-foreground font-medium px-4 mt-2">
                <span>07:00</span>
                <span>09:00</span>
                <span className="text-primary font-bold">11:30 (Trưa)</span>
                <span>13:00</span>
                <span>15:00</span>
                <span>17:00</span>
                <span className="text-primary font-bold">19:30 (Tối)</span>
                <span>21:00</span>
                <span>22:00</span>
              </div>
            </CardContent>
          </Card>

          {/* Giao dịch gần nhất & Standee QR Quầy thu ngân */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Cột trái: Giao dịch thanh toán gần nhất (8 cột) */}
            <Card className="lg:col-span-8 border-border shadow-xs">
              <CardHeader className="pb-3 border-b border-border/60">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base sm:text-lg">Thanh toán thu hộ gần nhất</CardTitle>
                    <CardDescription className="text-xs">
                      Cập nhật trực tiếp thời gian thực từ quầy thu ngân và cổng thanh toán trực tuyến
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-500/30 gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    Đồng bộ tự động
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-2 divide-y divide-border/60">
                {RECENT_PAYMENTS.map((payment) => (
                  <div
                    key={payment.id}
                    className="py-3.5 flex items-center justify-between hover:bg-muted/40 px-2 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                        <Store className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-foreground">
                            {payment.customerName}
                          </span>
                          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-none text-[10px] font-semibold">
                            Thành công
                          </Badge>
                          <Badge variant="outline" className="text-[10px] text-muted-foreground font-mono">
                            {payment.channel}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Mã GD: <span className="font-mono text-foreground font-semibold">{payment.transactionCode}</span> • {payment.paymentMethod}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold font-mono text-emerald-600 dark:text-emerald-400 text-sm sm:text-base">
                        + {formatVnd(payment.amount)}
                      </div>
                      <span className="text-[11px] text-muted-foreground">Phí 1%: -{formatVnd(payment.fee)}</span>
                    </div>
                  </div>
                ))}

                <div className="pt-3 flex justify-between items-center text-xs text-muted-foreground">
                  <span>Hệ thống tự động đối soát định kỳ mỗi ngày qua FinVault Settlement.</span>
                  <span className="font-mono text-primary font-bold">4 giao dịch mới</span>
                </div>
              </CardContent>
            </Card>

            {/* Cột phải: Standee mã QR quầy thu ngân (4 cột) */}
            <Card className="lg:col-span-4 border-2 border-primary/30 shadow-md bg-card">
              <CardHeader className="pb-3 border-b border-border/60">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <QrCode className="h-4 w-4 text-primary" />
                    <span>Mã QR Quầy thu ngân</span>
                  </CardTitle>
                  <Badge className="bg-primary text-primary-foreground text-xs font-bold">QUẦY 01</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                {/* Khung Standee Quầy thu ngân */}
                <div className="p-4 rounded-2xl bg-white border border-border shadow-xs flex flex-col items-center text-center">
                  <div className="w-full bg-[#8B1A1A] py-1.5 px-3 rounded-lg text-white mb-3 font-bold text-xs tracking-wider flex items-center justify-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5" />
                    <span>HIGHLANDS COFFEE</span>
                  </div>

                  {/* QR SVG */}
                  <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-inner">
                    <svg className="w-36 h-36 text-slate-900" fill="currentColor" viewBox="0 0 160 160">
                      <rect x="10" y="10" width="40" height="40" rx="6" fill="#081e29" />
                      <rect x="18" y="18" width="24" height="24" rx="3" fill="#ffffff" />
                      <rect x="24" y="24" width="12" height="12" rx="2" fill="#0F9D8A" />

                      <rect x="110" y="10" width="40" height="40" rx="6" fill="#081e29" />
                      <rect x="118" y="18" width="24" height="24" rx="3" fill="#ffffff" />
                      <rect x="124" y="24" width="12" height="12" rx="2" fill="#0F9D8A" />

                      <rect x="10" y="110" width="40" height="40" rx="6" fill="#081e29" />
                      <rect x="18" y="118" width="24" height="24" rx="3" fill="#ffffff" />
                      <rect x="24" y="124" width="12" height="12" rx="2" fill="#0F9D8A" />

                      <rect x="60" y="12" width="8" height="8" />
                      <rect x="76" y="12" width="16" height="8" />
                      <rect x="60" y="28" width="12" height="12" />
                      <rect x="80" y="28" width="8" height="8" />
                      <rect x="68" y="44" width="12" height="8" />
                      <rect x="12" y="60" width="16" height="8" />
                      <rect x="36" y="60" width="12" height="12" />
                      <rect x="110" y="60" width="12" height="8" />
                      <rect x="130" y="60" width="16" height="12" />
                      <rect x="60" y="108" width="12" height="8" />
                      <rect x="78" y="112" width="18" height="8" />
                      <rect x="60" y="124" width="16" height="16" />
                      <rect x="112" y="112" width="16" height="8" />
                    </svg>
                  </div>

                  <div className="mt-2 text-xs">
                    <strong className="block text-foreground text-sm font-bold">QUÉT MÃ THANH TOÁN TẠI QUẦY</strong>
                    <span className="text-primary font-bold block mt-0.5">CHI NHÁNH HÀM NGHI Q1</span>
                    <span className="text-[10px] text-muted-foreground block mt-1">
                      Hỗ trợ Ví FinVault • VietQR 40+ Ngân hàng
                    </span>
                  </div>
                </div>

                {/* Các nút in & tải standee */}
                <div className="space-y-2 pt-1">
                  <Button
                    type="button"
                    onClick={() => window.print()}
                    className="w-full h-10 text-xs font-semibold gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Printer className="h-4 w-4" />
                    <span>In Standee Quầy Thu Ngân</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => toast.success('Đang tạo và tải file PDF standee chất lượng cao...')}
                    className="w-full h-10 text-xs font-semibold gap-1.5 cursor-pointer"
                  >
                    <Download className="h-4 w-4" />
                    <span>Tải file vector in ấn</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ======================================================== */}
        {/* TAB 2: KHÓA API & WEBHOOK IPN (DEVELOPER INTEGRATION)   */}
        {/* ======================================================== */}
        <TabsContent value="api" className="space-y-6 mt-0 animate-in fade-in-50 duration-200">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Cột trái: Quản lý API Key (7 cột) */}
            <Card className="lg:col-span-7 border-border shadow-xs">
              <CardHeader className="pb-3 border-b border-border/60">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <Key className="h-5 w-5 text-primary" />
                  <span>Khóa xác thực tích hợp (API Credentials)</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Sử dụng thông tin xác thực này để tích hợp cổng thanh toán FinVault vào Website, Máy POS hoặc Ứng dụng di động của bạn
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5 pt-4">
                {/* Merchant ID */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Merchant ID (Mã định danh đối tác)</Label>
                  <div className="flex gap-2">
                    <Input value={merchantId} readOnly className="h-11 font-mono font-bold bg-muted/50" />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleCopy(merchantId, 'mch')}
                      className="h-11 px-3 text-xs gap-1 cursor-pointer shrink-0"
                    >
                      {copiedMerchantId ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                      <span>Sao chép</span>
                    </Button>
                  </div>
                </div>

                {/* Public Client Key */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Client Public Key (Dùng trên Web / Frontend POS)</Label>
                  <div className="flex gap-2">
                    <Input value={publicKey} readOnly className="h-11 font-mono text-xs sm:text-sm bg-muted/50" />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleCopy(publicKey, 'public')}
                      className="h-11 px-3 text-xs gap-1 cursor-pointer shrink-0"
                    >
                      {copiedPublic ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                      <span>Sao chép</span>
                    </Button>
                  </div>
                </div>

                {/* Secret API Key (Prompt 0: Masked, One-time visible on generation) */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs font-semibold text-foreground">
                      Secret API Key (Khóa bí mật Backend - Ký số HMAC)
                    </Label>
                    <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/30">
                      Bảo mật cao cấp
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={maskedSecretKey}
                      readOnly
                      className="h-11 font-mono text-xs sm:text-sm bg-muted/50 text-muted-foreground"
                    />
                    <Button
                      type="button"
                      onClick={handleRegenerateSecretKey}
                      className="h-11 px-3 text-xs font-semibold gap-1.5 cursor-pointer shrink-0"
                    >
                      <RotateCcw className="h-4 w-4" />
                      <span>Tạo khóa mới</span>
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Vì lý do an toàn bảo mật, Secret Key chỉ được hiển thị đầy đủ một lần duy nhất lúc khởi tạo.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Cột phải: Cấu hình Webhook IPN (5 cột) */}
            <Card className="lg:col-span-5 border-border shadow-xs">
              <CardHeader className="pb-3 border-b border-border/60">
                <CardTitle className="text-base flex items-center gap-2">
                  <Send className="h-4 w-4 text-primary" />
                  <span>Webhook IPN (Thông báo kết quả giao dịch)</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  URL máy chủ của bạn để nhận thông báo tự động (Instant Payment Notification) khi khách hàng thanh toán thành công
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-4 text-xs sm:text-sm">
                <div className="space-y-1.5">
                  <Label htmlFor="webhookInput" className="text-xs font-semibold text-foreground">
                    Webhook Endpoint URL (HTTPS bắt buộc)
                  </Label>
                  <Input
                    id="webhookInput"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://your-domain.com/api/webhook"
                    className="h-11 font-mono text-xs"
                  />
                </div>

                <div className="space-y-2 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isPingingWebhook}
                    onClick={handlePingWebhook}
                    className="w-full h-10 text-xs font-semibold gap-1.5 cursor-pointer"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>{isPingingWebhook ? 'Đang gửi ping test...' : 'Kiểm tra kết nối Webhook (Ping Test)'}</span>
                  </Button>
                  <Button
                    type="button"
                    onClick={() => toast.success('Đã lưu cấu hình Webhook URL thành công!')}
                    className="w-full h-10 text-xs font-semibold gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>Lưu cấu hình Webhook</span>
                  </Button>
                </div>

                <div className="p-3.5 rounded-xl bg-muted/50 border border-border space-y-1.5 text-xs text-muted-foreground">
                  <strong className="text-foreground block">Đặc tả xác thực Webhook IPN:</strong>
                  <p>
                    Payload được ký số HMAC-SHA256 với Secret Key và gửi kèm trong HTTP Header <code className="text-primary font-mono font-bold">X-FinVault-Signature</code>.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ======================================================== */}
        {/* TAB 3: CHIẾN DỊCH VOUCHER & KHUYẾN MÃI (MARKETING)       */}
        {/* ======================================================== */}
        <TabsContent value="vouchers" className="space-y-6 mt-0 animate-in fade-in-50 duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-foreground">Chương trình Khuyến mãi & Giảm giá Đối tác</h2>
              <p className="text-xs text-muted-foreground">
                Tạo mã giảm giá để thu hút khách hàng thanh toán qua ví FinVault. Voucher được hiển thị trên Trang chủ và Tiện ích.
              </p>
            </div>
            <Button
              type="button"
              onClick={() => setNewVoucherModalOpen(true)}
              className="h-10 text-xs font-semibold gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Đăng ký Chiến dịch mới</span>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {MERCHANT_VOUCHERS.map((voucher) => (
              <Card key={voucher.id} className="border-border shadow-xs hover:border-primary/40 transition-all">
                <CardHeader className="pb-3 border-b border-border/60">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="font-mono font-bold text-primary border-primary/30 text-xs">
                      {voucher.code}
                    </Badge>
                    {voucher.status === 'ACTIVE' ? (
                      <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-none text-[10px] font-semibold">
                        Đang phát hành
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-none text-[10px] font-semibold">
                        Admin đang duyệt
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-base font-bold text-foreground pt-1">{voucher.title}</CardTitle>
                  <CardDescription className="text-xs font-semibold text-primary">
                    Ưu đãi: {voucher.discount} • Đơn tối thiểu: {formatVnd(voucher.minOrder)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Đã sử dụng</span>
                      <span className="font-semibold text-foreground font-mono">
                        {voucher.usedCount} / {voucher.totalLimit} lượt
                      </span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${(voucher.usedCount / voucher.totalLimit) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/60 text-[11px] text-muted-foreground">
                    <span>Hạn áp dụng:</span>
                    <span className="font-medium text-foreground">{voucher.startDate} - {voucher.endDate}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Banner đăng ký hiển thị Banner Banner Trang chủ */}
          <div className="p-5 rounded-2xl bg-muted/50 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Bạn muốn đặt Banner Thương hiệu trên Trang chủ FinVault?</h3>
                <p className="text-xs text-muted-foreground">
                  Gửi yêu cầu hợp tác truyền thông để thương hiệu Highlands Coffee xuất hiện tại vị trí nổi bật nhất.
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => toast.success('Đã gửi yêu cầu tư vấn vị trí Banner trang chủ tới Quản trị viên FinVault!')}
              className="text-xs font-semibold h-10 cursor-pointer shrink-0"
            >
              Gửi yêu cầu truyền thông
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* ======================================================== */}
      {/* MODAL HIỂN THỊ SECRET KEY 1 LẦN DUY NHẤT (PROMPT 0)     */}
      {/* ======================================================== */}
      <Dialog open={newSecretKeyModalOpen} onOpenChange={setNewSecretKeyModalOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader className="text-left space-y-2">
            <div className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              <DialogTitle className="text-base sm:text-lg font-bold">Khóa bí mật Secret Key mới</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Vui lòng sao chép và lưu trữ ngay. Khóa này chỉ hiển thị **DUY NHẤT 1 LẦN** và sẽ không thể xem lại sau khi đóng cửa sổ này.
            </DialogDescription>
          </DialogHeader>

          <div className="my-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3">
            <span className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 block">
              Secret API Key của bạn:
            </span>
            <div className="p-3 bg-background rounded-lg border border-border font-mono text-xs sm:text-sm font-bold text-foreground break-all select-all">
              {generatedSecretKey}
            </div>
          </div>

          <div className="flex gap-2.5 pt-2">
            <Button
              type="button"
              onClick={() => handleCopy(generatedSecretKey, 'secret')}
              className="flex-1 h-11 text-xs sm:text-sm font-semibold gap-1.5 shadow-xs cursor-pointer"
            >
              {copiedSecret ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              <span>{copiedSecret ? 'Đã sao chép khóa!' : 'Sao chép khóa Secret Key'}</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setNewSecretKeyModalOpen(false)}
              className="h-11 px-4 text-xs font-semibold cursor-pointer"
            >
              Tôi đã lưu an toàn
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ======================================================== */}
      {/* MODAL ĐĂNG KÝ VOUCHER KHUYẾN MÃI MỚI                     */}
      {/* ======================================================== */}
      <Dialog open={newVoucherModalOpen} onOpenChange={setNewVoucherModalOpen}>
        <DialogContent className="max-w-md p-6">
          <DialogHeader className="text-left space-y-1">
            <DialogTitle className="text-base sm:text-lg font-bold">Tạo Chiến dịch Khuyến mãi Đối tác</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Voucher sẽ được hiển thị trên Trang chủ và mục Tiện ích FinVault sau khi Admin duyệt.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateVoucher} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Mã khuyến mãi (Viết liền, không dấu)</Label>
              <Input
                placeholder="VD: HIGHLANDS30K"
                value={voucherCode}
                onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                className="h-11 font-mono uppercase text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Mức giảm giá</Label>
              <Input
                placeholder="VD: Giảm 30.000 ₫ hoặc Giảm 10%"
                value={voucherDiscount}
                onChange={(e) => setVoucherDiscount(e.target.value)}
                className="h-11 text-xs"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Đơn hàng tối thiểu (₫)</Label>
              <Input
                type="number"
                value={voucherMinOrder}
                onChange={(e) => setVoucherMinOrder(e.target.value)}
                className="h-11 text-xs font-mono"
                required
              />
            </div>

            <div className="p-3 bg-muted/60 rounded-xl text-xs text-muted-foreground">
              Chiến dịch sau khi tạo sẽ ở trạng thái <strong className="text-foreground">Chờ duyệt</strong>. Admin FinVault sẽ phản hồi trong vòng 24 giờ làm việc.
            </div>

            <div className="flex gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setNewVoucherModalOpen(false)}
                className="flex-1 h-11 text-xs font-semibold cursor-pointer"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                className="flex-1 h-11 text-xs font-semibold shadow-xs cursor-pointer"
              >
                Gửi Admin phê duyệt
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default MerchantPortalPage
