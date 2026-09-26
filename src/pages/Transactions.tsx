import { useState, useEffect } from 'react'
import {
  Search, Download, Calendar, Filter, ShoppingBag, Building2, ChevronLeft, ChevronRight, ArrowDownLeft, Utensils, CreditCard, Zap, Plus, RefreshCw, X, Eye
} from 'lucide-react'
import { paymentService } from '@/features/payment/services/paymentService'
import type { PaymentRecord } from '@/features/payment/types/payment.types'
import { CheckoutModal } from '@/features/payment/components/CheckoutModal'

export default function Transactions() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [realPayments, setRealPayments] = useState<PaymentRecord[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null)
  
  const limit = 10;

  const loadPayments = async () => {
    try {
      setLoading(true)
      const data: any = await paymentService.getPayments({
        page: currentPage,
        limit,
        type: selectedCategory === 'all' ? undefined : selectedCategory
      })
      if (Array.isArray(data)) {
        setRealPayments(data)
        setTotal(data.length)
      } else if (data?.items) {
        setRealPayments(data.items)
        setTotal(data.total)
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPayments()
  }, [currentPage, selectedCategory])

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)
  }

  const getIconForType = (type: string) => {
    switch (type) {
      case 'BUS_TICKET': return <Utensils className="size-4" />
      case 'MOVIE_TICKET': return <ShoppingBag className="size-4" />
      case 'CARD_TOPUP': return <Zap className="size-4" />
      case 'WALLET_TRANSFER': return <ArrowDownLeft className="size-4" />
      default: return <CreditCard className="size-4" />
    }
  }

  const getTypeName = (type: string) => {
    switch (type) {
      case 'BUS_TICKET': return 'Vé xe bus'
      case 'MOVIE_TICKET': return 'Vé phim'
      case 'CARD_TOPUP': return 'Nạp thẻ'
      case 'WALLET_TRANSFER': return 'Chuyển tiền'
      default: return type
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
            Lịch sử giao dịch
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Theo dõi và quản lý mọi khoản thu chi của bạn.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={loadPayments} className="px-4 h-10 rounded-xl font-semibold border border-border/60 bg-card hover:bg-muted text-foreground transition-colors text-sm flex items-center gap-2">
             <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} /> Làm mới
          </button>
          <button onClick={() => setIsCheckoutOpen(true)} className="px-4 h-10 rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 text-sm flex items-center gap-2">
            <Plus className="size-4" /> Tạo thanh toán
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card/60 p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="sm:col-span-2 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input type="text" placeholder="Tìm kiếm giao dịch..." className="w-full h-10 pl-9 pr-4 rounded-xl border border-border/60 bg-background/50 text-sm focus:outline-none focus:border-primary transition-colors" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <div className="sm:col-span-1">
            <select value={selectedCategory} onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }} className="w-full h-10 rounded-xl border border-border/60 bg-background/50 px-3 text-xs text-foreground outline-none focus:border-primary transition-colors cursor-pointer">
              <option value="all">Tất cả dịch vụ</option>
              <option value="BUS_TICKET">Vé xe bus</option>
              <option value="MOVIE_TICKET">Vé phim</option>
              <option value="CARD_TOPUP">Nạp thẻ điện thoại</option>
              <option value="WALLET_TRANSFER">Chuyển tiền ví</option>
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card/80 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border/50 bg-muted/30 text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4 sm:px-6">Mã Giao Dịch</th>
                <th className="py-3.5 px-4 sm:px-6">Thời gian</th>
                <th className="py-3.5 px-4 sm:px-6 text-center">Dịch vụ</th>
                <th className="py-3.5 px-4 sm:px-6 text-center">Trạng thái</th>
                <th className="py-3.5 px-4 sm:px-6 text-right">Số tiền</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {realPayments.length > 0 ? (
                realPayments.map((tx) => (
                  <tr key={tx.id} onClick={() => setSelectedPayment(tx)} className="hover:bg-muted/30 transition-colors group cursor-pointer">
                    <td className="py-4 px-4 sm:px-6 font-mono text-[11px] text-primary">{tx.id.split('-')[0]}...</td>
                    <td className="py-4 px-4 sm:px-6 text-muted-foreground whitespace-nowrap text-[11px]">{new Date(tx.createdAt).toLocaleString('vi-VN')}</td>
                    <td className="py-4 px-4 sm:px-6 text-center whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-[10px] font-medium text-foreground">
                        {getIconForType(tx.type)} {getTypeName(tx.type)}
                      </span>
                    </td>
                    <td className="py-4 px-4 sm:px-6 text-center whitespace-nowrap">
                      <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${tx.status === 'SUCCESS' ? 'bg-emerald-500/15 text-emerald-400' : tx.status === 'PENDING' ? 'bg-amber-500/15 text-amber-400' : 'bg-rose-500/15 text-rose-400'}`}>{tx.status}</span>
                    </td>
                    <td className="py-4 px-4 sm:px-6 text-right whitespace-nowrap">
                      <span className="font-mono font-bold text-xs sm:text-sm text-foreground">{formatAmount(tx.amount)}</span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={5} className="py-12 text-center text-muted-foreground">Không tìm thấy giao dịch phù hợp</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-border/40 text-xs text-muted-foreground">
          <div>Trang {currentPage}</div>
          <div className="flex items-center gap-1.5">
            <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className="size-8 rounded-lg border border-border/60 flex items-center justify-center hover:bg-muted disabled:opacity-40 transition-colors"><ChevronLeft className="size-4" /></button>
            <span className="size-8 rounded-lg font-bold bg-primary text-primary-foreground flex items-center justify-center">{currentPage}</span>
            <button onClick={() => setCurrentPage(p => p + 1)} className="size-8 rounded-lg border border-border/60 flex items-center justify-center hover:bg-muted transition-colors"><ChevronRight className="size-4" /></button>
          </div>
        </div>
      </div>

      <CheckoutModal isOpen={isCheckoutOpen} onClose={() => setIsCheckoutOpen(false)} onSuccess={loadPayments} />

      {/* Payment Detail Popup */}
      {selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-card border border-border p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg flex items-center gap-2"><Eye className="size-5 text-primary" /> Chi tiết giao dịch</h3>
              <button onClick={() => setSelectedPayment(null)} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><X className="size-4" /></button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-border/40 pb-2"><span className="text-muted-foreground">Mã giao dịch</span> <span className="font-mono text-xs">{selectedPayment.id}</span></div>
              <div className="flex justify-between border-b border-border/40 pb-2"><span className="text-muted-foreground">Thời gian</span> <span>{new Date(selectedPayment.createdAt).toLocaleString('vi-VN')}</span></div>
              <div className="flex justify-between border-b border-border/40 pb-2"><span className="text-muted-foreground">Dịch vụ</span> <span>{getTypeName(selectedPayment.type)}</span></div>
              <div className="flex justify-between border-b border-border/40 pb-2"><span className="text-muted-foreground">Trạng thái</span> <span className={`font-bold ${selectedPayment.status === 'SUCCESS' ? 'text-emerald-400' : selectedPayment.status === 'PENDING' ? 'text-amber-400' : 'text-rose-400'}`}>{selectedPayment.status}</span></div>
              <div className="flex justify-between pb-2"><span className="text-muted-foreground">Số tiền</span> <span className="font-bold text-lg text-primary">{formatAmount(selectedPayment.amount)}</span></div>
            </div>
            <button onClick={() => setSelectedPayment(null)} className="w-full py-2.5 bg-secondary hover:bg-secondary/80 rounded-xl font-semibold transition-colors mt-2">Đóng</button>
          </div>
        </div>
      )}
    </div>
  )
}
