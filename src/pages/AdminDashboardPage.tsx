import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Users,
  DollarSign,
  Activity,
  AlertTriangle,
  TrendingUp,
  ShieldAlert,
  Download,
  UserCheck,
  Scale,
  CreditCard,
  Lock,
  ChevronRight
} from 'lucide-react'
import { formatVnd } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner'

interface RiskAlertItem {
  id: string
  walletId: string
  userName: string
  phone: string
  riskType: string
  severity: 'HIGH' | 'MEDIUM' | 'LOW'
  amount?: number
  time: string
  isLocked: boolean
}

const INITIAL_RISK_ALERTS: RiskAlertItem[] = [
  {
    id: 'RISK-01',
    walletId: 'WAL-881920',
    userName: 'Vũ Mạnh Cường',
    phone: '0912 ••• 441',
    riskType: 'Đăng nhập từ 3 dải IP khác nhau trong 5 phút',
    severity: 'HIGH',
    time: '10 phút trước',
    isLocked: false
  },
  {
    id: 'RISK-02',
    walletId: 'WAL-772911',
    userName: 'Trần Gia Hưng',
    phone: '0988 ••• 192',
    riskType: 'Giao dịch chuyển tiền vượt hạn mức KYC Cấp 1',
    amount: 150000000,
    severity: 'MEDIUM',
    time: '25 phút trước',
    isLocked: false
  },
  {
    id: 'RISK-03',
    walletId: 'WAL-661029',
    userName: 'Đỗ Thị Lan',
    phone: '0903 ••• 882',
    riskType: 'Nhập sai mã PIN 3 lần liên tiếp tại máy POS',
    severity: 'LOW',
    time: '45 phút trước',
    isLocked: true
  }
]

export function AdminDashboardPage() {
  const navigate = useNavigate()
  const [timeFilter, setTimeFilter] = useState<'24h' | '7d' | '30d'>('24h')
  const [riskAlerts, setRiskAlerts] = useState<RiskAlertItem[]>(INITIAL_RISK_ALERTS)

  // Khóa / Mở khóa ví rủi ro
  const handleToggleLock = (id: string) => {
    setRiskAlerts((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nextStatus = !item.isLocked
          toast[nextStatus ? 'error' : 'success'](
            nextStatus
              ? `Đã tạm khóa ví ${item.walletId} để kiểm tra rủi ro`
              : `Đã mở khóa an toàn cho ví ${item.walletId}`
          )
          return { ...item, isLocked: nextStatus }
        }
        return item
      })
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Quản trị & Bộ lọc thời gian */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge className="bg-destructive hover:bg-destructive/90 text-destructive-foreground border-none font-bold text-xs">
              FINVAULT OPERATIONS
            </Badge>
            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-none text-xs font-semibold gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Giám sát thời gian thực
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Tổng quan Vận hành & Quản trị Rủi ro
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Theo dõi dòng tiền toàn hệ thống, kiểm soát hồ sơ định danh và cảnh báo an ninh tài chính.
          </p>
        </div>

        {/* Bộ lọc 24h/7d/30d & Nút tải báo cáo */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center p-1 bg-muted/60 rounded-xl border border-border">
            <button
              type="button"
              onClick={() => setTimeFilter('24h')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                timeFilter === '24h'
                  ? 'bg-card text-foreground shadow-xs font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              24 giờ qua
            </button>
            <button
              type="button"
              onClick={() => setTimeFilter('7d')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                timeFilter === '7d'
                  ? 'bg-card text-foreground shadow-xs font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              7 ngày qua
            </button>
            <button
              type="button"
              onClick={() => setTimeFilter('30d')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                timeFilter === '30d'
                  ? 'bg-card text-foreground shadow-xs font-bold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Tháng này
            </button>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => toast.success('Đang tạo và tải file báo cáo tổng hợp hệ thống (PDF)...')}
            className="h-10 text-xs font-semibold gap-1.5 cursor-pointer"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Xuất báo cáo</span>
          </Button>
        </div>
      </div>

      {/* 4 Thẻ Chỉ số Vĩ mô (Macro Operations Metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Thẻ 1: Khối lượng giao dịch */}
        <Card className="border-border shadow-xs hover:border-primary/40 transition-all">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Khối lượng giao dịch 24h</span>
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-foreground tracking-tight">
              3.240.850.000 <span className="text-sm font-normal text-muted-foreground">₫</span>
            </div>
            <div className="flex items-center justify-between pt-3 mt-3 border-t border-border/60 text-xs">
              <div className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="h-3.5 w-3.5" />
                <span>+14.2% so với hôm qua</span>
              </div>
              <span className="text-muted-foreground font-mono">14.820 GD</span>
            </div>
          </CardContent>
        </Card>

        {/* Thẻ 2: Người dùng hoạt động */}
        <Card className="border-border shadow-xs hover:border-primary/40 transition-all">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Tổng người dùng hoạt động</span>
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-foreground tracking-tight">
              128.450 <span className="text-sm font-normal text-muted-foreground">ví</span>
            </div>
            <div className="flex items-center justify-between pt-3 mt-3 border-t border-border/60 text-xs text-muted-foreground">
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">+1.280 đăng ký mới</span>
              <span>Kích hoạt 96%</span>
            </div>
          </CardContent>
        </Card>

        {/* Thẻ 3: Tỷ lệ SLA thành công */}
        <Card className="border-border shadow-xs hover:border-primary/40 transition-all">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Tỷ lệ thành công (SLA)</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Activity className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-foreground tracking-tight">
              99.94%
            </div>
            <div className="flex items-center justify-between pt-3 mt-3 border-t border-border/60 text-xs text-muted-foreground">
              <span>Độ trễ trung bình:</span>
              <span className="font-mono text-primary font-bold">180ms</span>
            </div>
          </CardContent>
        </Card>

        {/* Thẻ 4: Việc cần Admin can thiệp */}
        <Card className="border-border shadow-xs hover:border-destructive/40 transition-all bg-destructive/5 border-destructive/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-destructive">Cần Admin xử lý ngay</span>
              <div className="p-2 rounded-xl bg-destructive/15 text-destructive">
                <AlertTriangle className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-destructive tracking-tight">
              15 <span className="text-sm font-normal text-muted-foreground">yêu cầu</span>
            </div>
            <div className="flex items-center justify-between pt-3 mt-3 border-t border-destructive/20 text-xs">
              <span className="text-muted-foreground">12 KYC • 3 nạp tiền treo</span>
              <span className="text-destructive font-semibold">Ưu tiên xử lý</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lối tắt 3 nghiệp vụ chính của Quản trị viên */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card
          onClick={() => navigate('/admin/kyc')}
          className="border-border shadow-xs hover:border-primary/40 transition-all cursor-pointer p-4 flex items-center justify-between group bg-card"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <strong className="text-sm font-bold text-foreground group-hover:text-primary transition-colors block">
                Thẩm định Hồ sơ KYC
              </strong>
              <span className="text-xs text-muted-foreground">12 hồ sơ CCCD & khuôn mặt chờ duyệt</span>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
        </Card>

        <Card
          onClick={() => navigate('/admin/reconciliation')}
          className="border-border shadow-xs hover:border-primary/40 transition-all cursor-pointer p-4 flex items-center justify-between group bg-card"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <strong className="text-sm font-bold text-foreground group-hover:text-blue-600 transition-colors block">
                Đối soát Tài chính Napas & VNPAY
              </strong>
              <span className="text-xs text-muted-foreground">Phiên T+1 khớp 100% không lệch tiền</span>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
        </Card>

        <Card
          onClick={() => navigate('/admin/topups')}
          className="border-border shadow-xs hover:border-primary/40 transition-all cursor-pointer p-4 flex items-center justify-between group bg-card"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <strong className="text-sm font-bold text-foreground group-hover:text-amber-600 transition-colors block">
                Quản lý Nạp tiền & Tra soát
              </strong>
              <span className="text-xs text-muted-foreground">3 giao dịch cần xác nhận lại mã tham chiếu</span>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
        </Card>
      </div>

      {/* Biểu đồ dòng tiền và Phân bổ danh mục */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Biểu đồ dòng tiền 24h (8 cột) */}
        <Card className="lg:col-span-8 border-border shadow-xs">
          <CardHeader className="pb-2 border-b border-border/60">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base sm:text-lg">Biểu đồ Lưu lượng Dòng tiền (24h)</CardTitle>
                <CardDescription className="text-xs">
                  Tổng hợp dòng tiền nạp vào, chuyển khoản P2P và thanh toán đối tác trên toàn hệ thống
                </CardDescription>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary inline-block" />
                  <span className="text-foreground font-semibold">Khối lượng</span>
                </div>
                <Badge variant="outline" className="text-[11px] font-semibold text-primary border-primary/30">
                  Đỉnh: 12:00 & 19:30
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="relative w-full h-64 sm:h-72">
              <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 900 240">
                <defs>
                  <linearGradient id="adminVolumeGrad" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#0F9D8A" stopOpacity="0.25" />
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
                <text fill="currentColor" opacity="0.6" fontSize="11" textAnchor="end" x="32" y="24">350M</text>
                <text fill="currentColor" opacity="0.6" fontSize="11" textAnchor="end" x="32" y="74">250M</text>
                <text fill="currentColor" opacity="0.6" fontSize="11" textAnchor="end" x="32" y="124">150M</text>
                <text fill="currentColor" opacity="0.6" fontSize="11" textAnchor="end" x="32" y="174">50M</text>
                <text fill="currentColor" opacity="0.6" fontSize="11" textAnchor="end" x="32" y="214">0 ₫</text>

                {/* Vùng đổ màu */}
                <path
                  d="M 60 190 C 120 180, 180 140, 240 100 C 290 60, 340 30, 400 45 C 460 60, 500 130, 560 110 C 620 90, 680 40, 740 35 C 800 30, 830 140, 860 180 L 860 210 L 60 210 Z"
                  fill="url(#adminVolumeGrad)"
                />

                {/* Đường nét chính */}
                <path
                  d="M 60 190 C 120 180, 180 140, 240 100 C 290 60, 340 30, 400 45 C 460 60, 500 130, 560 110 C 620 90, 680 40, 740 35 C 800 30, 830 140, 860 180"
                  fill="none"
                  stroke="#0F9D8A"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />

                {/* Điểm cực đại Trưa & Tối */}
                <circle cx="400" cy="45" r="5" fill="#0F9D8A" stroke="#ffffff" strokeWidth="2.5" />
                <circle cx="740" cy="35" r="5" fill="#0F9D8A" stroke="#ffffff" strokeWidth="2.5" />
              </svg>
            </div>

            {/* Trục hoành các mốc giờ */}
            <div className="flex justify-between text-xs text-muted-foreground font-medium px-4 mt-2">
              <span>00:00</span>
              <span>04:00</span>
              <span>08:00</span>
              <span className="text-primary font-bold">12:00 (Trưa)</span>
              <span>16:00</span>
              <span className="text-primary font-bold">19:30 (Tối)</span>
              <span>22:00</span>
              <span>24:00</span>
            </div>
          </CardContent>
        </Card>

        {/* Phân bổ theo danh mục giao dịch (4 cột) */}
        <Card className="lg:col-span-4 border-border shadow-xs">
          <CardHeader className="pb-3 border-b border-border/60">
            <CardTitle className="text-base">Cơ cấu Doanh số Dịch vụ</CardTitle>
            <CardDescription className="text-xs">Tỷ trọng các luồng tiền trong ngày</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            {/* Mục 1: Chuyển tiền P2P */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-foreground">Chuyển tiền P2P</span>
                <span className="font-mono text-primary">42% (1.361.000.000 ₫)</span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: '42%' }} />
              </div>
            </div>

            {/* Mục 2: Nạp tiền VNPAY */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-foreground">Nạp tiền VNPAY</span>
                <span className="font-mono text-blue-600 dark:text-blue-400">31% (1.004.000.000 ₫)</span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: '31%' }} />
              </div>
            </div>

            {/* Mục 3: Cổng thanh toán Merchant */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-foreground">Cổng đối tác Merchant</span>
                <span className="font-mono text-amber-600 dark:text-amber-400">18% (583.000.000 ₫)</span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: '18%' }} />
              </div>
            </div>

            {/* Mục 4: Hóa đơn & Tiện ích */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-foreground">Hóa đơn & Tiện ích</span>
                <span className="font-mono text-muted-foreground">9% (292.850.000 ₫)</span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-muted-foreground/60 rounded-full" style={{ width: '9%' }} />
              </div>
            </div>

            <div className="p-3 bg-muted/50 rounded-xl text-xs text-muted-foreground mt-4 space-y-1">
              <span className="font-bold text-foreground block">Đánh giá vận hành:</span>
              <p>Khối lượng P2P và Cổng Merchant tăng trưởng 12% so với tuần trước. Không phát hiện tắc nghẽn hàng đợi (Queue Latency 14ms).</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bảng Cảnh báo Rủi ro & Gian lận (Risk & Fraud Alerts) */}
      <Card className="border-border shadow-xs">
        <CardHeader className="pb-3 border-b border-border/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-destructive" />
                <span>Cảnh báo An ninh & Gian lận Tài chính (Risk Intelligence)</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Hệ thống giám sát tự động gắn cờ các phiên đăng nhập hoặc giao dịch bất thường cần rà soát
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs text-destructive border-destructive/30 font-semibold gap-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>{riskAlerts.filter((r) => !r.isLocked).length} cảnh báo đang mở</span>
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-2 divide-y divide-border/60">
          {riskAlerts.map((item) => (
            <div
              key={item.id}
              className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/40 px-2 rounded-xl transition-colors"
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    item.severity === 'HIGH'
                      ? 'bg-destructive/10 text-destructive border border-destructive/20'
                      : item.severity === 'MEDIUM'
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                      : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                  }`}
                >
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-foreground">{item.userName}</span>
                    <span className="font-mono text-xs text-muted-foreground font-semibold">({item.walletId})</span>
                    <Badge
                      className={`border-none text-[10px] font-bold ${
                        item.severity === 'HIGH'
                          ? 'bg-destructive/15 text-destructive'
                          : item.severity === 'MEDIUM'
                          ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                          : 'bg-blue-500/15 text-blue-700 dark:text-blue-400'
                      }`}
                    >
                      {item.severity === 'HIGH' ? 'RỦI RO CAO' : item.severity === 'MEDIUM' ? 'CẢNH BÁO' : 'LƯU Ý'}
                    </Badge>
                    {item.isLocked && (
                      <Badge variant="outline" className="text-[10px] text-destructive border-destructive/30">
                        ĐÃ KHÓA TẠM THỜI
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-foreground mt-0.5">
                    {item.riskType}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    SĐT: {item.phone} • Phát hiện lúc: <span className="font-semibold">{item.time}</span>
                    {item.amount && ` • Giá trị GD: ${formatVnd(item.amount)}`}
                  </p>
                </div>
              </div>

              {/* Các nút hành động */}
              <div className="flex items-center gap-2 sm:self-center shrink-0">
                <Button
                  type="button"
                  variant={item.isLocked ? 'outline' : 'destructive'}
                  size="sm"
                  onClick={() => handleToggleLock(item.id)}
                  className="h-8 text-xs font-semibold gap-1 cursor-pointer"
                >
                  <Lock className="h-3.5 w-3.5" />
                  <span>{item.isLocked ? 'Mở khóa ví' : 'Khóa tạm thời'}</span>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs font-semibold cursor-pointer"
                >
                  <Link to="/admin/reconciliation">Tra soát</Link>
                </Button>
              </div>
            </div>
          ))}

          <div className="pt-3 flex justify-between items-center text-xs text-muted-foreground">
            <span>Hệ thống giám sát rủi ro tự động quét 100% giao dịch theo thời gian thực (Zero False-positive Policy).</span>
            <span className="font-mono text-primary font-bold">3/3 sự kiện</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default AdminDashboardPage
