import { useState } from 'react'
import {
  Search,
  Download,
  Calendar,
  Filter,
  ShoppingBag,
  Building2,
  ChevronLeft,
  ChevronRight,
  ArrowDownLeft,
  Utensils,
  CreditCard,
  Zap
} from 'lucide-react'

/* ─── Mock Transactions Data ───────────────────────────────────── */
interface Transaction {
  id: string
  partner: string
  description: string
  time: string
  category: string
  status: 'Hoàn tất' | 'Đang xử lý' | 'Đã hủy'
  amount: number
  isIncome: boolean
  icon: typeof ShoppingBag
}

const mockTransactions: Transaction[] = [
  {
    id: 'tx-1',
    partner: 'Apple Store',
    description: 'Thanh toán hóa đơn thiết bị',
    time: '15 Th10, 2024 - 14:20 PM',
    category: 'Mua sắm',
    status: 'Hoàn tất',
    amount: -24500000,
    isIncome: false,
    icon: ShoppingBag
  },
  {
    id: 'tx-2',
    partner: 'Cty CP Đầu tư VNG',
    description: 'Chuyển khoản lương T9/2024',
    time: '10 Th10, 2024 - 08:15 AM',
    category: 'Thu nhập',
    status: 'Hoàn tất',
    amount: 45000000,
    isIncome: true,
    icon: Building2
  },
  {
    id: 'tx-3',
    partner: 'Grab Vietnam',
    description: 'Thanh toán chuyến đi & Di chuyển',
    time: '08 Th10, 2024 - 18:45 PM',
    category: 'Di chuyển',
    status: 'Hoàn tất',
    amount: -185000,
    isIncome: false,
    icon: CreditCard
  },
  {
    id: 'tx-4',
    partner: 'Starbucks Coffee',
    description: 'Thanh toán cửa hàng',
    time: '05 Th10, 2024 - 09:30 AM',
    category: 'Ăn uống',
    status: 'Hoàn tất',
    amount: -120000,
    isIncome: false,
    icon: Utensils
  },
  {
    id: 'tx-5',
    partner: 'EVN HCMC',
    description: 'Thanh toán tiền điện kỳ 10',
    time: '02 Th10, 2024 - 11:10 AM',
    category: 'Dịch vụ',
    status: 'Đang xử lý',
    amount: -1450000,
    isIncome: false,
    icon: Zap
  },
  {
    id: 'tx-6',
    partner: 'Nguyễn Văn A',
    description: 'Chuyển tiền trả nợ',
    time: '28 Th09, 2024 - 20:15 PM',
    category: 'Thu nhập',
    status: 'Hoàn tất',
    amount: 2500000,
    isIncome: true,
    icon: ArrowDownLeft
  }
]

export default function Transactions() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)

  // Filter logic
  const filteredData = mockTransactions.filter((tx) => {
    const matchesSearch =
      tx.partner.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory =
      selectedCategory === 'all' || tx.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  // Format currency VNĐ
  const formatAmount = (amount: number) => {
    const formatted = Math.abs(amount).toLocaleString('vi-VN')
    return amount > 0 ? `+${formatted} ₫` : `-${formatted} ₫`
  }

  return (
    <div className="space-y-6">
      {/* ── Page Header & Export Button ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
            Lịch sử giao dịch
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Theo dõi chi tiết các hoạt động tài khoản của bạn
          </p>
        </div>

        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-border/70 bg-card/80 px-4 py-2.5 text-xs sm:text-sm font-semibold text-foreground hover:bg-muted transition-all active:scale-95 shadow-sm"
        >
          <Download className="size-4 text-muted-foreground" />
          <span>Xuất dữ liệu</span>
        </button>
      </div>

      {/* ── Filter & Search Control Panel ── */}
      <div className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="sm:col-span-5 space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground">
              Tìm kiếm
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Tên đối tác hoặc mô tả"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-10 rounded-xl border border-border/60 bg-background/50 pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          {/* Time Range Filter */}
          <div className="sm:col-span-3 space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground">
              Khoảng thời gian
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <select className="w-full h-10 rounded-xl border border-border/60 bg-background/50 pl-9 pr-3 text-xs text-foreground appearance-none focus:outline-none focus:border-primary transition-colors cursor-pointer">
                <option value="this-month">Tháng này</option>
                <option value="last-month">Tháng trước</option>
                <option value="this-year">Năm nay</option>
              </select>
            </div>
          </div>

          {/* Category Filter */}
          <div className="sm:col-span-3 space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground">
              Danh mục
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full h-10 rounded-xl border border-border/60 bg-background/50 px-3 text-xs text-foreground appearance-none focus:outline-none focus:border-primary transition-colors cursor-pointer"
            >
              <option value="all">Tất cả danh mục</option>
              <option value="Mua sắm">Mua sắm</option>
              <option value="Thu nhập">Thu nhập</option>
              <option value="Di chuyển">Di chuyển</option>
              <option value="Ăn uống">Ăn uống</option>
              <option value="Dịch vụ">Dịch vụ</option>
            </select>
          </div>

          {/* Filter Action Button */}
          <div className="sm:col-span-1 flex items-end">
            <button
              type="button"
              className="w-full h-10 rounded-xl border border-border/60 bg-muted/40 hover:bg-muted flex items-center justify-center text-foreground transition-colors"
              title="Bộ lọc nâng cao"
            >
              <Filter className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Transactions Table Container ── */}
      <div className="rounded-2xl border border-border/60 bg-card/80 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            {/* Table Header */}
            <thead className="border-b border-border/50 bg-muted/30 text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4 sm:px-6">Đối tác / Mô tả</th>
                <th className="py-3.5 px-4 sm:px-6">Thời gian</th>
                <th className="py-3.5 px-4 sm:px-6 text-center">Danh mục</th>
                <th className="py-3.5 px-4 sm:px-6 text-center">Trạng thái</th>
                <th className="py-3.5 px-4 sm:px-6 text-right">Số tiền</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-border/40">
              {filteredData.length > 0 ? (
                filteredData.map((tx) => {
                  const Icon = tx.icon
                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-muted/30 transition-colors group"
                    >
                      {/* Partner & Description */}
                      <td className="py-4 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div className="size-9 rounded-xl bg-muted/80 flex items-center justify-center text-foreground shrink-0 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                            <Icon className="size-4" />
                          </div>
                          <div>
                            <p className="font-bold text-foreground text-xs sm:text-sm">
                              {tx.partner}
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {tx.description}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Date & Time */}
                      <td className="py-4 px-4 sm:px-6 text-muted-foreground whitespace-nowrap text-[11px]">
                        {tx.time}
                      </td>

                      {/* Category Badge */}
                      <td className="py-4 px-4 sm:px-6 text-center whitespace-nowrap">
                        <span className="inline-flex items-center rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-[11px] font-medium text-foreground">
                          {tx.category}
                        </span>
                      </td>

                      {/* Status Badge */}
                      <td className="py-4 px-4 sm:px-6 text-center whitespace-nowrap">
                        <span
                          className={`text-[11px] font-semibold ${
                            tx.status === 'Hoàn tất'
                              ? 'text-emerald-400'
                              : 'text-amber-400'
                          }`}
                        >
                          {tx.status}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="py-4 px-4 sm:px-6 text-right whitespace-nowrap">
                        <span
                          className={`font-mono font-bold text-xs sm:text-sm ${
                            tx.isIncome ? 'text-emerald-400' : 'text-foreground'
                          }`}
                        >
                          {formatAmount(tx.amount)}
                        </span>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td
                    colSpan={5}
                    className="py-12 text-center text-muted-foreground"
                  >
                    Không tìm thấy giao dịch phù hợp
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Table Footer / Pagination Controls ── */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-border/40 text-xs text-muted-foreground">
          <div>
            Hiển thị 1-10 trên tổng số <strong>142</strong> giao dịch
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="size-8 rounded-lg border border-border/60 flex items-center justify-center hover:bg-muted disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
            >
              <ChevronLeft className="size-4" />
            </button>

            <button
              type="button"
              onClick={() => setCurrentPage(1)}
              className={`size-8 rounded-lg font-bold flex items-center justify-center transition-colors ${
                currentPage === 1
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted text-foreground'
              }`}
            >
              1
            </button>

            <button
              type="button"
              onClick={() => setCurrentPage(2)}
              className={`size-8 rounded-lg font-bold flex items-center justify-center transition-colors ${
                currentPage === 2
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted text-foreground'
              }`}
            >
              2
            </button>

            <button
              type="button"
              onClick={() => setCurrentPage(3)}
              className={`size-8 rounded-lg font-bold flex items-center justify-center transition-colors ${
                currentPage === 3
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted text-foreground'
              }`}
            >
              3
            </button>

            <button
              type="button"
              onClick={() => setCurrentPage((p) => p + 1)}
              className="size-8 rounded-lg border border-border/60 flex items-center justify-center hover:bg-muted transition-colors"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
