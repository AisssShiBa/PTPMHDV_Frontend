import { useState, useMemo } from 'react'
import {
  Search,
  Calendar,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  Clock,
  XCircle,
  Copy,
  Printer,
  RotateCcw,
  Receipt,
  ArrowUpRight,
  ArrowDownLeft,
  Zap,
  Coffee,
  Building,
  Check,
  ShieldCheck
} from 'lucide-react'
import { formatVnd, formatDateTime } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import { toast } from 'sonner'

export type TransactionType = 'ALL' | 'TRANSFER' | 'TOPUP' | 'WITHDRAW' | 'PAYMENT' | 'UTILITY'
export type TransactionStatus = 'ALL' | 'SUCCESS' | 'PENDING' | 'FAILED'
export type DateRangeFilter = '30_DAYS' | '7_DAYS' | 'THIS_MONTH' | 'ALL_TIME'

export interface TransactionItem {
  id: string
  title: string
  description: string
  type: TransactionType
  status: 'SUCCESS' | 'PENDING' | 'FAILED'
  amount: number // Dương nếu nạp/nhận, âm nếu chi/rút
  timestamp: string
  source: string
  target: string
  refCode: string
  fee: number
  note?: string
}

const SAMPLE_TRANSACTIONS: TransactionItem[] = [
  {
    id: 'FT231024-884210',
    title: 'Chuyển tiền cho Trần Văn Bình',
    description: 'Chuyển tiền ăn trưa',
    type: 'TRANSFER',
    status: 'SUCCESS',
    amount: -60000,
    timestamp: '2026-10-24T14:30:00Z',
    source: 'Số dư ví FinVault',
    target: 'Ví FinVault (Trần Văn Bình - 0912***345)',
    refCode: 'REF231024982143',
    fee: 0,
    note: 'Chuyển tiền ăn trưa nhé'
  },
  {
    id: 'FT231024-091544',
    title: 'Nạp tiền ví VNPAY',
    description: 'Thẻ ATM nội địa MB Bank (*4589)',
    type: 'TOPUP',
    status: 'SUCCESS',
    amount: 100000,
    timestamp: '2026-10-24T09:15:00Z',
    source: 'Thẻ ATM MB Bank (*4589)',
    target: 'Số dư ví FinVault',
    refCode: 'VNP-20261024-984210',
    fee: 0,
    note: 'Nạp tiền vào ví FinVault'
  },
  {
    id: 'FT231023-772911',
    title: 'Thanh toán Highlands Coffee',
    description: 'Cửa hàng Hàm Nghi Quận 1',
    type: 'PAYMENT',
    status: 'SUCCESS',
    amount: -45000,
    timestamp: '2026-10-23T18:20:00Z',
    source: 'Số dư ví FinVault',
    target: 'Cổng Merchant Highlands Coffee',
    refCode: 'HL-20261023-0091',
    fee: 0,
    note: 'Hóa đơn 01 Cà phê sữa đá size L'
  },
  {
    id: 'FT231023-551029',
    title: 'Nạp ĐT Viettel',
    description: 'Số thuê bao: 0984.***.889',
    type: 'UTILITY',
    status: 'SUCCESS',
    amount: -50000,
    timestamp: '2026-10-23T11:05:00Z',
    source: 'Số dư ví FinVault',
    target: 'Viettel Telecom',
    refCode: 'VT-20261023-5510',
    fee: 0,
    note: 'Nạp thẻ trực tiếp thuê bao trả trước'
  },
  {
    id: 'FT231020-119488',
    title: 'Tiền điện EVN tháng 10',
    description: 'Mã khách hàng: PE02001928340',
    type: 'UTILITY',
    status: 'SUCCESS',
    amount: -420000,
    timestamp: '2026-10-20T08:00:00Z',
    source: 'Số dư ví FinVault',
    target: 'Tổng công ty Điện lực TP.HCM',
    refCode: 'EVN-202610-8812',
    fee: 0,
    note: 'Thanh toán hóa đơn điện kỳ 10/2026'
  },
  {
    id: 'FT231019-338291',
    title: 'Rút tiền về Vietcombank',
    description: 'STK: 007100099**** - VCB',
    type: 'WITHDRAW',
    status: 'PENDING',
    amount: -500000,
    timestamp: '2026-10-19T09:00:00Z',
    source: 'Số dư ví FinVault',
    target: 'Vietcombank (STK: 007100099****)',
    refCode: 'NPS-20261019-3382',
    fee: 0,
    note: 'Rút tiền về tài khoản ngân hàng liên kết'
  },
  {
    id: 'FT231018-120934',
    title: 'Nhận tiền từ Lê Hoàng Khoa',
    description: 'Tiền ăn tối nhóm',
    type: 'TRANSFER',
    status: 'SUCCESS',
    amount: 200000,
    timestamp: '2026-10-18T21:40:00Z',
    source: 'Ví FinVault (Lê Hoàng Khoa - 0987***321)',
    target: 'Số dư ví FinVault',
    refCode: 'P2P-20261018-1209',
    fee: 0,
    note: 'Gửi cậu tiền lẩu hôm qua nha'
  },
  {
    id: 'FT231015-449102',
    title: 'Rút tiền về Techcombank',
    description: 'Ngân hàng bảo trì định kỳ',
    type: 'WITHDRAW',
    status: 'FAILED',
    amount: -200000,
    timestamp: '2026-10-15T15:20:00Z',
    source: 'Số dư ví FinVault',
    target: 'Techcombank (*5501)',
    refCode: 'NPS-20261015-4491',
    fee: 0,
    note: 'Hệ thống đối tác gián đoạn, tiền đã hoàn đủ về ví'
  }
]

export function TransactionsPage() {
  // Bộ lọc
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<TransactionType>('ALL')
  const [statusFilter, setStatusFilter] = useState<TransactionStatus>('ALL')
  const [dateRange, setDateRange] = useState<DateRangeFilter>('30_DAYS')

  // Giao dịch được chọn xem chi tiết biên lai
  const [selectedTxn, setSelectedTxn] = useState<TransactionItem | null>(null)
  const [copiedId, setCopiedId] = useState(false)

  // Phân trang
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 6

  // Lọc danh sách giao dịch
  const filteredTransactions = useMemo(() => {
    return SAMPLE_TRANSACTIONS.filter((item) => {
      // Lọc từ khóa
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase()
        const matchesTitle = item.title.toLowerCase().includes(query)
        const matchesDesc = item.description.toLowerCase().includes(query)
        const matchesId = item.id.toLowerCase().includes(query)
        if (!matchesTitle && !matchesDesc && !matchesId) return false
      }

      // Lọc theo loại GD
      if (typeFilter !== 'ALL' && item.type !== typeFilter) {
        return false
      }

      // Lọc theo trạng thái
      if (statusFilter !== 'ALL' && item.status !== statusFilter) {
        return false
      }

      return true
    })
  }, [searchTerm, typeFilter, statusFilter])

  // Dữ liệu trang hiện tại
  const totalItems = filteredTransactions.length
  const totalPages = Math.ceil(totalItems / pageSize) || 1
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  // Reset bộ lọc
  const handleResetFilters = () => {
    setSearchTerm('')
    setTypeFilter('ALL')
    setStatusFilter('ALL')
    setDateRange('30_DAYS')
    setCurrentPage(1)
    toast.info('Đã đặt lại toàn bộ điều kiện lọc')
  }

  // Sao chép mã GD
  const handleCopyTxnId = (id: string) => {
    navigator.clipboard.writeText(id)
    setCopiedId(true)
    toast.success('Đã sao chép mã giao dịch')
    setTimeout(() => setCopiedId(false), 2000)
  }

  // Icon hiển thị theo loại giao dịch
  const renderTxnIcon = (txn: TransactionItem) => {
    switch (txn.type) {
      case 'TRANSFER':
        return txn.amount < 0 ? (
          <div className="w-10 h-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
            <ArrowUpRight className="h-5 w-5" />
          </div>
        ) : (
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <ArrowDownLeft className="h-5 w-5" />
          </div>
        )
      case 'TOPUP':
        return (
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <ArrowDownLeft className="h-5 w-5" />
          </div>
        )
      case 'WITHDRAW':
        return (
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Building className="h-5 w-5" />
          </div>
        )
      case 'PAYMENT':
        return (
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Coffee className="h-5 w-5" />
          </div>
        )
      case 'UTILITY':
        return (
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
            <Zap className="h-5 w-5" />
          </div>
        )
      default:
        return (
          <div className="w-10 h-10 rounded-xl bg-muted text-foreground flex items-center justify-center shrink-0">
            <Receipt className="h-5 w-5" />
          </div>
        )
    }
  }

  // Huy hiệu trạng thái
  const renderStatusBadge = (status: TransactionItem['status']) => {
    switch (status) {
      case 'SUCCESS':
        return (
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-none text-xs gap-1 font-semibold">
            <Check className="h-3 w-3" />
            Thành công
          </Badge>
        )
      case 'PENDING':
        return (
          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-none text-xs gap-1 font-semibold">
            <Clock className="h-3 w-3 animate-spin" />
            Đang xử lý
          </Badge>
        )
      case 'FAILED':
        return (
          <Badge className="bg-destructive/15 text-destructive border-none text-xs gap-1 font-semibold">
            <XCircle className="h-3 w-3" />
            Thất bại
          </Badge>
        )
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header khu vực làm việc */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary text-xs font-semibold uppercase tracking-wider mb-1">
            <Receipt className="h-4 w-4" />
            <span>Sao kê ví điện tử</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Lịch sử giao dịch & Sao kê tài khoản
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Tra cứu và theo dõi chi tiết mọi biến động số dư trong ví FinVault của bạn
          </p>
        </div>

        {/* Nút xuất file sao kê */}
        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={() => window.print()}
            className="h-10 text-xs font-semibold gap-1.5 cursor-pointer shadow-xs"
          >
            <Printer className="h-4 w-4" />
            <span>In / Xuất PDF</span>
          </Button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* THANH CÔNG CỤ LỌC ĐA NĂNG (FILTER TOOLBAR)               */}
      {/* ======================================================== */}
      <Card className="border-border shadow-sm">
        <CardContent className="p-4 space-y-3.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Lọc khoảng thời gian */}
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as DateRangeFilter)}
                className="w-full h-11 pl-9 pr-3 rounded-xl border border-input bg-background text-xs sm:text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer"
              >
                <option value="30_DAYS">30 ngày qua (Gần nhất)</option>
                <option value="7_DAYS">7 ngày gần nhất</option>
                <option value="THIS_MONTH">Tháng này</option>
                <option value="ALL_TIME">Toàn bộ thời gian</option>
              </select>
            </div>

            {/* Lọc loại giao dịch */}
            <div className="relative">
              <Receipt className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value as TransactionType)
                  setCurrentPage(1)
                }}
                className="w-full h-11 pl-9 pr-3 rounded-xl border border-input bg-background text-xs sm:text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer"
              >
                <option value="ALL">Tất cả loại giao dịch</option>
                <option value="TRANSFER">Chuyển tiền P2P</option>
                <option value="TOPUP">Nạp tiền VNPAY</option>
                <option value="WITHDRAW">Rút tiền về ngân hàng</option>
                <option value="PAYMENT">Thanh toán dịch vụ</option>
                <option value="UTILITY">Hóa đơn điện, nước, ĐT</option>
              </select>
            </div>

            {/* Lọc trạng thái */}
            <div className="relative">
              <CheckCircle2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as TransactionStatus)
                  setCurrentPage(1)
                }}
                className="w-full h-11 pl-9 pr-3 rounded-xl border border-input bg-background text-xs sm:text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="SUCCESS">Thành công</option>
                <option value="PENDING">Đang xử lý</option>
                <option value="FAILED">Thất bại</option>
              </select>
            </div>

            {/* Ô tìm kiếm từ khóa */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1)
                }}
                placeholder="Tìm người nhận, mã GD..."
                className="pl-9 h-11 text-xs sm:text-sm"
              />
            </div>
          </div>

          {/* Dải thông tin bộ lọc & nút reset */}
          <div className="pt-2 border-t border-border/60 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>Đang áp dụng:</span>
              <Badge variant="outline" className="text-[11px] font-normal">
                {dateRange === '30_DAYS' ? '30 ngày qua' : 'Khoảng chọn'}
              </Badge>
              {typeFilter !== 'ALL' && (
                <Badge variant="outline" className="text-[11px] font-normal">
                  Loại: {typeFilter}
                </Badge>
              )}
              {statusFilter !== 'ALL' && (
                <Badge variant="outline" className="text-[11px] font-normal">
                  Trạng thái: {statusFilter}
                </Badge>
              )}
              {(searchTerm || typeFilter !== 'ALL' || statusFilter !== 'ALL') && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-primary hover:underline font-semibold ml-1 cursor-pointer flex items-center gap-1"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Đặt lại bộ lọc</span>
                </button>
              )}
            </div>

            <div>
              Tìm thấy <strong className="text-foreground">{totalItems}</strong> giao dịch
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ======================================================== */}
      {/* BẢNG DANH SÁCH GIAO DỊCH SAO KÊ                          */}
      {/* ======================================================== */}
      {filteredTransactions.length > 0 ? (
        <Card className="border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/40 border-b border-border text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                  <th className="py-3.5 px-6 w-44">Thời gian</th>
                  <th className="py-3.5 px-6">Nội dung giao dịch</th>
                  <th className="py-3.5 px-6 text-center w-36">Trạng thái</th>
                  <th className="py-3.5 px-6 text-right w-44">Số tiền</th>
                  <th className="py-3.5 px-4 text-center w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-sm">
                {paginatedTransactions.map((txn) => (
                  <tr
                    key={txn.id}
                    onClick={() => setSelectedTxn(txn)}
                    className="h-16 hover:bg-muted/30 transition-colors cursor-pointer group"
                  >
                    {/* Cột 1: Thời gian */}
                    <td className="py-4 px-6 whitespace-nowrap">
                      <div className="font-semibold text-foreground text-xs sm:text-sm">
                        {new Date(txn.timestamp).toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {new Date(txn.timestamp).toLocaleDateString('vi-VN')}
                      </div>
                    </td>

                    {/* Cột 2: Nội dung */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3.5">
                        {renderTxnIcon(txn)}
                        <div>
                          <div className="font-semibold text-foreground group-hover:text-primary transition-colors">
                            {txn.title}
                          </div>
                          <div className="text-xs text-muted-foreground truncate max-w-md">
                            {txn.description}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Cột 3: Trạng thái */}
                    <td className="py-4 px-6 text-center whitespace-nowrap">
                      {renderStatusBadge(txn.status)}
                    </td>

                    {/* Cột 4: Số tiền */}
                    <td className="py-4 px-6 text-right whitespace-nowrap">
                      <span
                        className={`font-bold font-mono text-sm sm:text-base ${
                          txn.amount > 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-foreground'
                        }`}
                      >
                        {txn.amount > 0 ? `+ ${formatVnd(txn.amount)}` : `- ${formatVnd(Math.abs(txn.amount))}`}
                      </span>
                    </td>

                    {/* Cột 5: Nút xem */}
                    <td className="py-4 px-4 text-center text-muted-foreground group-hover:text-primary transition-colors">
                      <ChevronRight className="h-4 w-4" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Phân trang */}
          <div className="px-6 py-4 bg-card border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm">
            <div className="text-muted-foreground">
              Hiển thị <span className="font-semibold text-foreground">{(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, totalItems)}</span> trên{' '}
              <span className="font-semibold text-foreground">{totalItems}</span> giao dịch
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="h-8 px-2.5 text-xs gap-1 cursor-pointer"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Trước</span>
              </Button>

              {Array.from({ length: totalPages }).map((_, idx) => (
                <button
                  key={idx + 1}
                  type="button"
                  onClick={() => setCurrentPage(idx + 1)}
                  className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    currentPage === idx + 1
                      ? 'bg-primary text-primary-foreground shadow-xs'
                      : 'border border-border hover:bg-muted text-muted-foreground'
                  }`}
                >
                  {idx + 1}
                </button>
              ))}

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="h-8 px-2.5 text-xs gap-1 cursor-pointer"
              >
                <span>Sau</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        /* Trạng thái rỗng khi không khớp bộ lọc */
        <Card className="border-border shadow-sm p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-muted mx-auto flex items-center justify-center text-muted-foreground mb-4">
            <Receipt className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-1">
            Chưa có giao dịch trong khoảng lọc này
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto mb-5">
            Không tìm thấy giao dịch nào khớp với điều kiện tìm kiếm. Bạn có thể thử nới rộng khoảng thời gian hoặc từ khóa.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={handleResetFilters}
            className="h-10 text-xs font-semibold gap-2 cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Đặt lại bộ lọc</span>
          </Button>
        </Card>
      )}

      {/* ======================================================== */}
      {/* DIALOG CHI TIẾT BIÊN LAI ĐIỆN TỬ (RECEIPT MODAL)         */}
      {/* ======================================================== */}
      <Dialog open={!!selectedTxn} onOpenChange={(open) => !open && setSelectedTxn(null)}>
        {selectedTxn && (
          <DialogContent className="max-w-md p-6">
            <DialogHeader className="text-left pb-2 border-b border-border">
              <div className="flex items-center gap-2 text-primary font-bold">
                <Receipt className="h-5 w-5" />
                <DialogTitle className="text-base sm:text-lg">Chi tiết biên lai giao dịch</DialogTitle>
              </div>
              <DialogDescription className="text-xs text-muted-foreground">
                Chứng từ giao dịch điện tử được bảo mật và xác thực bởi FinVault
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-3">
              {/* Thẻ tiền & trạng thái */}
              <div className="text-center p-4 rounded-2xl bg-muted/40 border border-border">
                <p className="text-xs text-muted-foreground mb-1 font-medium">{selectedTxn.title}</p>
                <p
                  className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
                    selectedTxn.amount > 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-foreground'
                  }`}
                >
                  {selectedTxn.amount > 0
                    ? `+ ${formatVnd(selectedTxn.amount)}`
                    : `- ${formatVnd(Math.abs(selectedTxn.amount))}`}
                </p>
                <div className="mt-2.5 inline-block">{renderStatusBadge(selectedTxn.status)}</div>
              </div>

              {/* Bảng chi tiết */}
              <div className="rounded-xl border border-border p-3.5 bg-card text-xs sm:text-sm space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Mã giao dịch</span>
                  <div className="flex items-center gap-1 font-mono font-bold text-foreground">
                    <span>{selectedTxn.id}</span>
                    <button
                      type="button"
                      aria-label="Sao chép mã giao dịch"
                      onClick={() => handleCopyTxnId(selectedTxn.id)}
                      className="text-primary hover:text-primary/80 transition-colors p-1 cursor-pointer"
                    >
                      {copiedId ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                    </button>
                  </div>
                </div>

                <div className="border-t border-border/60 pt-2 flex justify-between items-center">
                  <span className="text-muted-foreground">Thời gian</span>
                  <span className="font-medium text-foreground">{formatDateTime(selectedTxn.timestamp)}</span>
                </div>

                <div className="border-t border-border/60 pt-2 flex justify-between items-center">
                  <span className="text-muted-foreground">Nguồn tiền</span>
                  <span className="font-medium text-foreground">{selectedTxn.source}</span>
                </div>

                <div className="border-t border-border/60 pt-2 flex justify-between items-center">
                  <span className="text-muted-foreground">Bên nhận / Dịch vụ</span>
                  <span className="font-medium text-foreground text-right truncate max-w-[200px]">
                    {selectedTxn.target}
                  </span>
                </div>

                <div className="border-t border-border/60 pt-2 flex justify-between items-center">
                  <span className="text-muted-foreground">Mã đối tác</span>
                  <span className="font-mono text-muted-foreground">{selectedTxn.refCode}</span>
                </div>

                <div className="border-t border-border/60 pt-2 flex justify-between items-center">
                  <span className="text-muted-foreground">Phí giao dịch</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">0 ₫ (Miễn phí)</span>
                </div>

                {selectedTxn.note && (
                  <div className="border-t border-border/60 pt-2 flex justify-between items-start gap-4">
                    <span className="text-muted-foreground shrink-0">Lời nhắn</span>
                    <span className="font-medium text-foreground text-right">{selectedTxn.note}</span>
                  </div>
                )}
              </div>

              {/* Dải thông báo bảo mật */}
              <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 flex items-start gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span>Giao dịch đã được ghi nhận vào sổ cái FinVault với chữ ký số bảo mật.</span>
              </div>

              {/* Các nút hành động */}
              <div className="pt-2 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleCopyTxnId(selectedTxn.id)}
                  className="w-1/2 h-10 text-xs font-semibold gap-1.5 cursor-pointer"
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span>Sao chép mã</span>
                </Button>
                <Button
                  type="button"
                  onClick={() => window.print()}
                  className="w-1/2 h-10 text-xs font-semibold gap-1.5 shadow-sm cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span>In biên lai</span>
                </Button>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}

export default TransactionsPage
