import { useState } from 'react'
import {
  Scale,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  DollarSign,
  Edit3,
  Shield,
  FileCheck,
  Lock
} from 'lucide-react'
import { formatVnd } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface IncidentItem {
  id: string
  type: 'BALANCE_DRIFT' | 'PENDING_TIMEOUT'
  walletId: string
  userName: string
  discrepancyText: string
  ledgerDetail: string
  suggestedAmount: number
  suggestedType: 'DEBIT' | 'CREDIT'
  isResolved: boolean
}

const INITIAL_INCIDENTS: IncidentItem[] = [
  {
    id: 'INC-01',
    type: 'BALANCE_DRIFT',
    walletId: 'w_8f3a9921',
    userName: 'Nguyễn Văn Bình',
    discrepancyText: 'Số dư lệch +50.000 ₫ so với tổng sổ cái',
    ledgerDetail: 'Sổ cái: 2.450.000 ₫ | Thực tế tài khoản: 2.400.000 ₫',
    suggestedAmount: 50000,
    suggestedType: 'DEBIT',
    isResolved: false
  },
  {
    id: 'INC-02',
    type: 'PENDING_TIMEOUT',
    walletId: 'w_9c1b8472',
    userName: 'Lê Thị Mai',
    discrepancyText: 'Giao dịch treo trạng thái quá 24h chờ xác nhận (500.000 ₫)',
    ledgerDetail: 'Lệnh nạp tiền qua cổng chưa nhận IPN xác nhận từ ngân hàng đối tác',
    suggestedAmount: 500000,
    suggestedType: 'CREDIT',
    isResolved: false
  }
]

export function AdminReconciliationPage() {
  const [incidents, setIncidents] = useState<IncidentItem[]>(INITIAL_INCIDENTS)
  const [isRunningRecon, setIsRunningRecon] = useState(false)
  const [lastRunTime, setLastRunTime] = useState('16:30:00')

  // Form tạo bút toán điều chỉnh
  const [selectedIncidentId, setSelectedIncidentId] = useState<string>('INC-01')
  const [activeWalletDisplay, setActiveWalletDisplay] = useState('w_8f3a9921 (Nguyễn Văn Bình)')
  const [adjustType, setAdjustType] = useState<'DEBIT' | 'CREDIT'>('DEBIT')
  const [adjustAmount, setAdjustAmount] = useState('50000')
  const [adjustReason, setAdjustReason] = useState(
    'Hoàn tiền lệnh lỗi theo biên bản đối soát định kỳ #BB-2026-9912'
  )

  // Chọn sự vụ để nạp vào form
  const handleSelectIncident = (item: IncidentItem) => {
    setSelectedIncidentId(item.id)
    setActiveWalletDisplay(`${item.walletId} (${item.userName})`)
    setAdjustType(item.suggestedType)
    setAdjustAmount(item.suggestedAmount.toString())
    setAdjustReason(
      item.type === 'BALANCE_DRIFT'
        ? `Điều chỉnh số dư lệch theo biên bản kiểm toán #${item.id}`
        : `Hoàn tất hạch toán lệnh nạp treo #${item.id} sau khi đối chiếu ngân hàng`
    )
    toast.info(`Đã tải dữ liệu sự vụ ${item.walletId} vào mẫu bút toán điều chỉnh`)
  }

  // Chạy đối soát toàn hệ thống
  const handleRunReconciliation = () => {
    setIsRunningRecon(true)
    setTimeout(() => {
      setIsRunningRecon(false)
      const now = new Date()
      const timeString = now.toLocaleTimeString('vi-VN', { hour12: false })
      setLastRunTime(timeString)
      toast.success('Hoàn tất quét kiểm tra đối soát toàn hệ thống!', {
        description: 'Đã rà soát 158.420 ví hoạt động. Toàn bộ giao dịch T+1 đã được đối chiếu với cổng thanh toán.'
      })
    }, 1200)
  }

  // Ký duyệt & Tạo bút toán đảo
  const handleSubmitEntry = (e: React.FormEvent) => {
    e.preventDefault()
    if (!adjustReason.trim()) {
      toast.error('Vui lòng nhập lý do cụ thể và mã biên bản đối soát (Bắt buộc)')
      return
    }

    setIncidents((prev) =>
      prev.map((item) =>
        item.id === selectedIncidentId ? { ...item, isResolved: true } : item
      )
    )

    toast.success('Ký duyệt & Tạo bút toán điều chỉnh thành công!', {
      description: `Đã tạo bút toán ${adjustType === 'DEBIT' ? 'Ghi Nợ (-)' : 'Ghi Có (+)'} ${formatVnd(
        Number(adjustAmount) || 0
      )} cho ví ${activeWalletDisplay}. Ghi nhận vĩnh viễn vào Nhật ký kiểm toán.`
    })
  }

  // Tổng tiền lệch
  const activeIncidents = incidents.filter((i) => !i.isResolved)
  const totalDifference = activeIncidents.reduce(
    (acc, cur) => (cur.suggestedType === 'DEBIT' ? acc + cur.suggestedAmount : acc - cur.suggestedAmount),
    0
  )

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header & Nút chạy đối soát */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge className="bg-primary hover:bg-primary/90 text-primary-foreground border-none font-bold text-xs gap-1">
              <Scale className="h-3.5 w-3.5" />
              FINANCIAL RECONCILIATION
            </Badge>
            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-none text-xs font-semibold gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Chu kỳ đối soát T+1
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Đối soát Tài chính & Cân đối Số dư Sổ cái
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Hệ thống tự động phát hiện và lập báo cáo sai lệch. Mọi thao tác điều chỉnh số dư do Kiểm soát viên ký duyệt bút toán đảo đối ứng.
          </p>
        </div>

        {/* Nút hành động chính: Chạy đối soát */}
        <Button
          type="button"
          disabled={isRunningRecon}
          onClick={handleRunReconciliation}
          className="h-12 px-6 rounded-xl text-xs sm:text-sm font-bold gap-2 shadow-xs cursor-pointer"
        >
          <RefreshCw className={`h-4 w-4 ${isRunningRecon ? 'animate-spin' : ''}`} />
          <span>{isRunningRecon ? 'Đang quét đối soát...' : 'Chạy kiểm tra đối soát'}</span>
        </Button>
      </div>

      {/* 4 Thẻ Tổng quan (Reconciliation KPI Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Thẻ 1: Số ví đã kiểm tra */}
        <Card className="border-border shadow-xs hover:border-primary/40 transition-all">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Số ví đã kiểm tra</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-foreground tracking-tight">
              158.420 <span className="text-sm font-normal text-muted-foreground">ví</span>
            </div>
            <div className="pt-3 mt-3 border-t border-border/60 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
              Toàn bộ tài khoản người dùng hoạt động
            </div>
          </CardContent>
        </Card>

        {/* Thẻ 2: Số bất thường phát hiện */}
        <Card className="border-border shadow-xs hover:border-amber-500/40 transition-all bg-amber-500/5 border-amber-500/30">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-amber-700 dark:text-amber-400">Số bất thường cần xử lý</span>
              <div className="p-2 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 tracking-tight">
              {activeIncidents.length} <span className="text-sm font-normal text-muted-foreground">sự vụ</span>
            </div>
            <div className="pt-3 mt-3 border-t border-amber-500/20 text-xs text-destructive font-semibold">
              Cần lập biên bản & xử lý hạch toán
            </div>
          </CardContent>
        </Card>

        {/* Thẻ 3: Lần chạy gần nhất */}
        <Card className="border-border shadow-xs hover:border-primary/40 transition-all">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Lần chạy đối soát gần nhất</span>
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-foreground tracking-tight font-mono">
              {lastRunTime}
            </div>
            <div className="pt-3 mt-3 border-t border-border/60 text-xs text-muted-foreground">
              Chu kỳ kiểm toán định kỳ phiên T+1
            </div>
          </CardContent>
        </Card>

        {/* Thẻ 4: Tổng chênh lệch số dư */}
        <Card className="border-border shadow-xs hover:border-primary/40 transition-all">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Tổng chênh lệch số dư</span>
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-foreground tracking-tight font-mono">
              {totalDifference >= 0 ? `+${formatVnd(totalDifference)}` : formatVnd(totalDifference)}
            </div>
            <div className="pt-3 mt-3 border-t border-border/60 text-xs text-muted-foreground">
              {totalDifference !== 0 ? 'Sổ cái ghi nhận cao hơn thực tế' : 'Đã cân đối 100%'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bố cục chính 2 cột: Bảng bất thường (7 cột) & Khung tạo bút toán (5 cột) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ======================================================== */}
        {/* CỘT TRÁI: DANH SÁCH BẤT THƯỜNG CẦN XỬ LÝ (7 CỘT)         */}
        {/* ======================================================== */}
        <Card className="lg:col-span-7 border-border shadow-xs overflow-hidden">
          <CardHeader className="pb-3 border-b border-border/60 bg-muted/30">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-foreground">
                  Danh sách bất thường phát hiện ({incidents.length} sự vụ)
                </CardTitle>
                <CardDescription className="text-xs">
                  Chọn sự vụ bên dưới để tải dữ liệu vào mẫu tạo bút toán đảo đối ứng
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-xs text-destructive border-destructive/30 font-semibold font-mono">
                {activeIncidents.length} cần xử lý
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-0 divide-y divide-border/60">
            {incidents.map((item) => {
              const isSelected = item.id === selectedIncidentId
              return (
                <div
                  key={item.id}
                  className={`p-4 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-primary/10 border-l-4 border-primary'
                      : 'hover:bg-muted/40'
                  }`}
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        className={`font-mono text-[10px] font-bold border-none ${
                          item.type === 'BALANCE_DRIFT'
                            ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300'
                            : 'bg-blue-500/15 text-blue-800 dark:text-blue-300'
                        }`}
                      >
                        {item.type}
                      </Badge>
                      <span className="font-mono text-xs font-bold text-foreground">{item.walletId}</span>
                      <span className="text-xs text-muted-foreground font-medium">({item.userName})</span>
                      {item.isResolved && (
                        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-none text-[10px] font-bold">
                          ĐÃ HẠCH TOÁN
                        </Badge>
                      )}
                    </div>

                    <div className="text-xs sm:text-sm font-semibold text-foreground">
                      {item.discrepancyText}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {item.ledgerDetail}
                    </p>
                  </div>

                  <div className="sm:self-center shrink-0">
                    <Button
                      type="button"
                      variant={isSelected ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleSelectIncident(item)}
                      className="h-9 text-xs font-semibold gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                      <span>{item.isResolved ? 'Xem lại' : 'Tạo bút toán'}</span>
                    </Button>
                  </div>
                </div>
              )
            })}

            <div className="p-4 bg-muted/40 text-xs text-muted-foreground flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary shrink-0" />
              <span>Tất cả sự vụ đối soát đều được gắn cờ cảnh báo và lưu vết độc lập phục vụ kiểm toán tài chính.</span>
            </div>
          </CardContent>
        </Card>

        {/* ======================================================== */}
        {/* CỘT PHẢI: KHUNG TẠO BÚT TOÁN ĐIỀU CHỈNH (5 CỘT)          */}
        {/* ======================================================== */}
        <Card className="lg:col-span-5 border-border shadow-xs overflow-hidden">
          <CardHeader className="pb-3 border-b border-border/60 bg-muted/30">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  <FileCheck className="h-4 w-4 text-primary" />
                  <span>Tạo bút toán điều chỉnh</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Kiểm soát viên thực hiện hạch toán cân đối số dư
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-[10px] text-amber-700 dark:text-amber-400 border-amber-500/30 font-semibold">
                Bắt buộc lý do
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-5">
            <form onSubmit={handleSubmitEntry} className="space-y-4">
              {/* Mã ví đang xử lý */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Mã ví đang xử lý</Label>
                <div className="relative">
                  <Input
                    value={activeWalletDisplay}
                    readOnly
                    className="h-11 font-mono font-bold text-xs bg-muted/60"
                  />
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                </div>
              </div>

              {/* Loại điều chỉnh nghiệp vụ: Ghi Nợ vs Ghi Có */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Loại điều chỉnh nghiệp vụ</Label>
                <div className="grid grid-cols-2 gap-2.5">
                  <div
                    onClick={() => setAdjustType('DEBIT')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-center gap-2 text-xs font-semibold ${
                      adjustType === 'DEBIT'
                        ? 'border-2 border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:bg-muted/40'
                    }`}
                  >
                    <input
                      type="radio"
                      name="adjust_type"
                      checked={adjustType === 'DEBIT'}
                      onChange={() => setAdjustType('DEBIT')}
                      className="text-primary focus:ring-primary h-3.5 w-3.5"
                    />
                    <span>Ghi Nợ (Giảm số dư)</span>
                  </div>

                  <div
                    onClick={() => setAdjustType('CREDIT')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-center gap-2 text-xs font-semibold ${
                      adjustType === 'CREDIT'
                        ? 'border-2 border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:bg-muted/40'
                    }`}
                  >
                    <input
                      type="radio"
                      name="adjust_type"
                      checked={adjustType === 'CREDIT'}
                      onChange={() => setAdjustType('CREDIT')}
                      className="text-primary focus:ring-primary h-3.5 w-3.5"
                    />
                    <span>Ghi Có (Tăng số dư)</span>
                  </div>
                </div>
              </div>

              {/* Số tiền điều chỉnh */}
              <div className="space-y-1.5">
                <Label htmlFor="adjustAmountInput" className="text-xs font-semibold text-muted-foreground">
                  Số tiền điều chỉnh (₫)
                </Label>
                <div className="relative">
                  <Input
                    id="adjustAmountInput"
                    type="number"
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(e.target.value)}
                    className="h-11 font-mono font-bold text-base pr-10"
                    required
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                    ₫
                  </span>
                </div>
              </div>

              {/* Lý do điều chỉnh & Mã tham chiếu (Bắt buộc) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="reasonArea" className="text-xs font-semibold text-muted-foreground">
                    Lý do điều chỉnh & Mã tham chiếu <span className="text-destructive font-bold">*</span>
                  </Label>
                  <span className="text-[11px] text-destructive font-bold">Bắt buộc</span>
                </div>
                <textarea
                  id="reasonArea"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  rows={3}
                  placeholder="Nhập lý do cụ thể và mã biên bản đối soát (Vd: Hoàn tiền lệnh lỗi theo biên bản #BB-2026-9912)..."
                  className="w-full p-3 rounded-xl border border-input bg-card text-xs focus:ring-1 focus:ring-primary outline-none"
                  required
                />
              </div>

              {/* Lưu ý kiểm toán */}
              <div className="p-3 rounded-xl bg-muted/50 border border-border flex items-start gap-2 text-xs text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <p>
                  Hành động này được ký số điện tử và ghi nhận vĩnh viễn vào <strong className="text-foreground">Nhật ký kiểm toán</strong>.
                </p>
              </div>

              {/* Nút Ký duyệt & Tạo bút toán */}
              <Button
                type="submit"
                className="w-full h-11 text-xs sm:text-sm font-bold gap-2 shadow-xs cursor-pointer"
              >
                <FileCheck className="h-4 w-4" />
                <span>Ký duyệt & Tạo bút toán</span>
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default AdminReconciliationPage
