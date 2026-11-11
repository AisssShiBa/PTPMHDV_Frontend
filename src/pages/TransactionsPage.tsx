import { useState, useMemo } from 'react'
import {
  Search,
  Calendar,
  ChevronRight,
  Copy,
  Printer,
  RotateCcw,
  Receipt,
  ArrowUpRight,
  ArrowDownLeft,
  Building,
  Check,
  ShieldCheck,
  RefreshCw,
  AlertTriangle
} from 'lucide-react'
import { formatVnd, formatDateTime } from '@/lib/format'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/common/EmptyState'
import { QueryBoundary } from '@/components/common/QueryBoundary'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import { useInfiniteWalletLedger, type LedgerItem } from '@/features/wallet'
import { toast } from 'sonner'

export type TransactionDirectionFilter = 'ALL' | 'CREDIT' | 'DEBIT'
export type TransactionTypeFilter = 'ALL' | 'TRANSFER' | 'TOPUP' | 'WITHDRAW' | 'PAYMENT'

export interface FormattedLedger {
  id: string
  title: string
  description: string
  type: string
  direction: 'CREDIT' | 'DEBIT'
  amount: string
  balanceAfter: string
  timestamp: string
  refCode: string
  note?: string
}

function mapLedgerItem(item: LedgerItem): FormattedLedger {
  const isCredit = item.direction === 'CREDIT' || item.direction === 'IN'
  const direction: 'CREDIT' | 'DEBIT' = isCredit ? 'CREDIT' : 'DEBIT'

  let title = isCredit ? 'Ghi có vào ví' : 'Ghi nợ ví'
  const tType = (item.transferType || '').toUpperCase()

  if (isCredit) {
    if (tType === 'TOPUP') {
      title = 'Nạp tiền vào ví'
    } else if (tType === 'TRANSFER' || tType === 'P2P_TRANSFER') {
      title = item.counterpartyMasked ? `Nhận tiền từ ${item.counterpartyMasked}` : 'Nhận tiền từ người dùng'
    } else if (tType === 'REFUND') {
      title = 'Hoàn tiền giao dịch'
    }
  } else {
    if (tType === 'TRANSFER' || tType === 'P2P_TRANSFER') {
      title = item.counterpartyMasked ? `Chuyển cho ${item.counterpartyMasked}` : 'Chuyển tiền cho người dùng'
    } else if (tType === 'WITHDRAW') {
      title = 'Rút tiền về tài khoản'
    } else if (tType === 'PAYMENT') {
      title = 'Thanh toán dịch vụ'
    }
  }

  const description =
    item.note ||
    item.description ||
    (item.referenceId ? `Mã tham chiếu: ${item.referenceId.slice(0, 16)}` : 'Bút toán sổ cái ví')

  return {
    id: item.id,
    title,
    description,
    type: tType || (isCredit ? 'CREDIT' : 'DEBIT'),
    direction,
    amount: item.amount,
    balanceAfter: item.balanceAfter,
    timestamp: item.createdAt,
    refCode: item.referenceId || item.id,
    note: item.note || item.description
  }
}

export function TransactionsPage() {
  // Bộ lọc
  const [searchTerm, setSearchTerm] = useState('')
  const [directionFilter, setDirectionFilter] = useState<TransactionDirectionFilter>('ALL')
  const [typeFilter, setTypeFilter] = useState<TransactionTypeFilter>('ALL')

  // Giao dịch được chọn xem chi tiết biên lai
  const [selectedTxn, setSelectedTxn] = useState<FormattedLedger | null>(null)
  const [copiedId, setCopiedId] = useState(false)

  // Gọi API GET /api/wallets/me/ledger phân trang cursor
  const ledgerQuery = useInfiniteWalletLedger(20)
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch
  } = ledgerQuery

  // Tập hợp các trang dữ liệu cursor thành danh sách phẳng
  const allEntries = useMemo(() => {
    if (!data?.pages) return []
    const rawItems: LedgerItem[] = []
    const seenIds = new Set<string>()

    for (const page of data.pages) {
      if (Array.isArray(page?.items)) {
        for (const item of page.items) {
          if (!seenIds.has(item.id)) {
            seenIds.add(item.id)
            rawItems.push(item)
          }
        }
      }
    }

    return rawItems.map(mapLedgerItem)
  }, [data])

  // Lọc giao dịch trên bộ nhớ client
  const filteredTransactions = useMemo(() => {
    return allEntries.filter((item) => {
      // Lọc từ khóa
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase()
        const matchesTitle = item.title.toLowerCase().includes(query)
        const matchesDesc = item.description.toLowerCase().includes(query)
        const matchesId = item.id.toLowerCase().includes(query)
        const matchesRef = item.refCode.toLowerCase().includes(query)
        if (!matchesTitle && !matchesDesc && !matchesId && !matchesRef) return false
      }

      // Lọc hướng dòng tiền
      if (directionFilter !== 'ALL' && item.direction !== directionFilter) {
        return false
      }

      // Lọc loại giao dịch
      if (typeFilter !== 'ALL' && !item.type.includes(typeFilter)) {
        return false
      }

      return true
    })
  }, [allEntries, searchTerm, directionFilter, typeFilter])

  // Reset bộ lọc
  const handleResetFilters = () => {
    setSearchTerm('')
    setDirectionFilter('ALL')
    setTypeFilter('ALL')
    toast.info('Đã đặt lại toàn bộ điều kiện lọc')
  }

  // Sao chép mã GD
  const handleCopyTxnId = (id: string) => {
    navigator.clipboard.writeText(id)
    setCopiedId(true)
    toast.success('Đã sao chép mã giao dịch')
    setTimeout(() => setCopiedId(false), 2000)
  }

  // Icon hiển thị theo hướng và loại
  const renderTxnIcon = (txn: FormattedLedger) => {
    if (txn.direction === 'CREDIT') {
      return (
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
          <ArrowDownLeft className="h-5 w-5" />
        </div>
      )
    }

    if (txn.type === 'WITHDRAW') {
      return (
        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Building className="h-5 w-5" />
        </div>
      )
    }

    return (
      <div className="w-10 h-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
        <ArrowUpRight className="h-5 w-5" />
      </div>
    )
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Lọc dòng tiền (Thu/Chi) */}
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <select
                aria-label="Lọc dòng tiền"
                value={directionFilter}
                onChange={(e) => setDirectionFilter(e.target.value as TransactionDirectionFilter)}
                className="w-full h-11 pl-9 pr-3 rounded-xl border border-input bg-background text-xs sm:text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer"
              >
                <option value="ALL">Tất cả dòng tiền (Thu & Chi)</option>
                <option value="CREDIT">Tiền vào (Cộng tiền)</option>
                <option value="DEBIT">Tiền ra (Trừ tiền)</option>
              </select>
            </div>

            {/* Lọc loại giao dịch */}
            <div className="relative">
              <Receipt className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <select
                aria-label="Lọc loại giao dịch"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as TransactionTypeFilter)}
                className="w-full h-11 pl-9 pr-3 rounded-xl border border-input bg-background text-xs sm:text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer"
              >
                <option value="ALL">Tất cả danh mục giao dịch</option>
                <option value="TRANSFER">Chuyển tiền P2P</option>
                <option value="TOPUP">Nạp tiền vào ví</option>
                <option value="WITHDRAW">Rút tiền về ngân hàng</option>
                <option value="PAYMENT">Thanh toán dịch vụ</option>
              </select>
            </div>

            {/* Ô tìm kiếm từ khóa */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm nội dung, mã bút toán..."
                className="pl-9 h-11 text-xs sm:text-sm"
              />
            </div>
          </div>

          {/* Dải thông tin bộ lọc & nút reset */}
          <div className="pt-2 border-t border-border/60 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>Đang áp dụng:</span>
              {directionFilter !== 'ALL' && (
                <Badge variant="outline" className="text-[11px] font-normal">
                  Dòng tiền: {directionFilter === 'CREDIT' ? 'Tiền vào' : 'Tiền ra'}
                </Badge>
              )}
              {typeFilter !== 'ALL' && (
                <Badge variant="outline" className="text-[11px] font-normal">
                  Loại: {typeFilter}
                </Badge>
              )}
              {(searchTerm || directionFilter !== 'ALL' || typeFilter !== 'ALL') && (
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
              Hiển thị <strong className="text-foreground">{filteredTransactions.length}</strong> biến động
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ======================================================== */}
      {/* 4 TRẠNG THÁI: LOADING, ERROR, EMPTY, SUCCESS QUA QUERYBOUNDARY */}
      {/* ======================================================== */}
      <QueryBoundary
        query={ledgerQuery}
        skeleton={
          <Card className="border-border shadow-sm p-6 space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-border/40 last:border-0 animate-pulse">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-muted" />
                  <div className="space-y-2">
                    <div className="h-4 w-48 bg-muted rounded" />
                    <div className="h-3 w-32 bg-muted/60 rounded" />
                  </div>
                </div>
                <div className="space-y-2 text-right">
                  <div className="h-4 w-28 bg-muted rounded ml-auto" />
                  <div className="h-3 w-20 bg-muted/60 rounded ml-auto" />
                </div>
              </div>
            ))}
          </Card>
        }
        errorFallback={
          <Card className="border-destructive/30 bg-destructive/5 p-8 text-center space-y-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-foreground">Không thể tải lịch sử giao dịch</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Đã có sự cố khi kết nối tới máy chủ sổ cái. Vui lòng thử lại.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="cursor-pointer gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Thử lại</span>
            </Button>
          </Card>
        }
        isEmpty={() => allEntries.length === 0}
        emptyFallback={
          <EmptyState
            title="Chưa có biến động số dư nào"
            description="Mọi giao dịch nạp tiền, chuyển tiền, thanh toán và rút tiền sẽ được ghi nhận minh bạch và bảo mật tại đây."
          />
        }
      >
        {filteredTransactions.length === 0 ? (
          /* Rỗng do bộ lọc không khớp */
          <Card className="border-border shadow-sm p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-muted mx-auto flex items-center justify-center text-muted-foreground mb-4">
              <Receipt className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-1">
              Không tìm thấy biến động phù hợp
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto mb-5">
              Không có giao dịch nào khớp với điều kiện lọc hiện tại.
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
        ) : (
          /* Trạng thái 4: Danh sách dữ liệu sổ cái */
          <Card className="border-border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-muted/40 border-b border-border text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                    <th className="py-3.5 px-6 w-48">Thời gian (GMT+7)</th>
                    <th className="py-3.5 px-6">Nội dung giao dịch</th>
                    <th className="py-3.5 px-6 text-center w-36">Loại bút toán</th>
                    <th className="py-3.5 px-6 text-right w-44">Số tiền</th>
                    <th className="py-3.5 px-4 text-center w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-sm">
                  {filteredTransactions.map((txn) => (
                    <tr
                      key={txn.id}
                      onClick={() => setSelectedTxn(txn)}
                      className="h-16 hover:bg-muted/30 transition-colors cursor-pointer group"
                    >
                      {/* Cột 1: Thời gian GMT+7 */}
                      <td className="py-4 px-6 whitespace-nowrap">
                        <div className="font-semibold text-foreground text-xs sm:text-sm">
                          {formatDateTime(txn.timestamp)}
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

                      {/* Cột 3: Loại bút toán */}
                      <td className="py-4 px-6 text-center whitespace-nowrap">
                        <Badge variant="outline" className="text-xs font-medium">
                          {txn.direction === 'CREDIT' ? 'Tiền vào' : 'Tiền ra'}
                        </Badge>
                      </td>

                      {/* Cột 4: Số tiền (BigInt formatted) */}
                      <td className="py-4 px-6 text-right whitespace-nowrap">
                        <span
                          className={`font-bold font-mono text-sm sm:text-base ${
                            txn.direction === 'CREDIT'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-foreground'
                          }`}
                        >
                          {txn.direction === 'CREDIT'
                            ? `+ ${formatVnd(txn.amount)}`
                            : `- ${formatVnd(txn.amount)}`}
                        </span>
                        <div className="text-[11px] text-muted-foreground font-mono">
                          Số dư sau: {formatVnd(txn.balanceAfter)}
                        </div>
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

            {/* Phân trang Cursor: Tải thêm */}
            <div className="px-6 py-4 bg-card border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm">
              <div className="text-muted-foreground">
                Đang hiển thị <span className="font-semibold text-foreground">{filteredTransactions.length}</span> giao dịch
              </div>

              <div className="flex items-center gap-2">
                {hasNextPage ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isFetchingNextPage}
                    onClick={() => fetchNextPage()}
                    className="h-9 px-4 text-xs font-semibold gap-2 cursor-pointer shadow-xs"
                  >
                    {isFetchingNextPage ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        <span>Đang tải thêm...</span>
                      </>
                    ) : (
                      <span>Tải thêm giao dịch</span>
                    )}
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground font-medium">
                    Đã hiển thị toàn bộ lịch sử biến động số dư
                  </span>
                )}
              </div>
            </div>
          </Card>
        )}
      </QueryBoundary>

      {/* ======================================================== */}
      {/* DIALOG CHI TIẾT BIÊN LAI ĐIỆN TỬ (RECEIPT MODAL)         */}
      {/* ======================================================== */}
      <Dialog open={!!selectedTxn} onOpenChange={(open) => !open && setSelectedTxn(null)}>
        {selectedTxn && (
          <DialogContent className="max-w-md p-6">
            <DialogHeader className="text-left pb-2 border-b border-border">
              <div className="flex items-center gap-2 text-primary font-bold">
                <Receipt className="h-5 w-5" />
                <DialogTitle className="text-base sm:text-lg">Chi tiết biến động số dư</DialogTitle>
              </div>
              <DialogDescription className="text-xs text-muted-foreground">
                Chứng từ bút toán sổ cái được bảo mật và xác thực bởi FinVault
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-3">
              {/* Thẻ tiền & trạng thái */}
              <div className="text-center p-4 rounded-2xl bg-muted/40 border border-border">
                <p className="text-xs text-muted-foreground mb-1 font-medium">{selectedTxn.title}</p>
                <p
                  className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
                    selectedTxn.direction === 'CREDIT'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-foreground'
                  }`}
                >
                  {selectedTxn.direction === 'CREDIT'
                    ? `+ ${formatVnd(selectedTxn.amount)}`
                    : `- ${formatVnd(selectedTxn.amount)}`}
                </p>
                <div className="mt-2 text-xs font-medium text-muted-foreground">
                  Số dư sau GD: <strong className="text-foreground">{formatVnd(selectedTxn.balanceAfter)}</strong>
                </div>
              </div>

              {/* Bảng chi tiết */}
              <div className="rounded-xl border border-border p-3.5 bg-card text-xs sm:text-sm space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Mã bút toán</span>
                  <div className="flex items-center gap-1 font-mono font-bold text-foreground">
                    <span>{selectedTxn.id.slice(0, 18)}</span>
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
                  <span className="text-muted-foreground">Thời gian ghi nhận</span>
                  <span className="font-medium text-foreground">{formatDateTime(selectedTxn.timestamp)}</span>
                </div>

                <div className="border-t border-border/60 pt-2 flex justify-between items-center">
                  <span className="text-muted-foreground">Dòng tiền</span>
                  <span className="font-semibold text-foreground">
                    {selectedTxn.direction === 'CREDIT' ? 'Tiền vào ví (Credit)' : 'Tiền trừ ví (Debit)'}
                  </span>
                </div>

                <div className="border-t border-border/60 pt-2 flex justify-between items-center">
                  <span className="text-muted-foreground">Mã tham chiếu</span>
                  <span className="font-mono text-muted-foreground truncate max-w-[180px]">{selectedTxn.refCode}</span>
                </div>

                {selectedTxn.note && (
                  <div className="border-t border-border/60 pt-2 flex justify-between items-start gap-4">
                    <span className="text-muted-foreground shrink-0">Nội dung</span>
                    <span className="font-medium text-foreground text-right">{selectedTxn.note}</span>
                  </div>
                )}
              </div>

              {/* Dải thông báo bảo mật */}
              <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 flex items-start gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span>Bút toán bất biến đã được ghi nhận trên sổ cái FinVault với chữ ký số bảo mật.</span>
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
