import { useEffect, useState } from 'react'
import { paymentService } from '@/features/payment/services/paymentService'
import type { TopupRecord } from '@/features/payment/types/payment.types'
import { toast } from 'sonner'
import { Loader2, CheckCircle, XCircle, Clock } from 'lucide-react'

export default function AdminTopups() {
  const [topups, setTopups] = useState<TopupRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [selectedRejectId, setSelectedRejectId] = useState<string | null>(null)

  const fetchTopups = async () => {
    try {
      setLoading(true)
      const data = await paymentService.getAdminTopups({ status: 'PENDING' })
      setTopups(data || [])
    } catch (error: any) {
      toast.error('Lỗi khi lấy danh sách nạp tiền: ' + (error?.response?.data?.error?.message || error.message))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTopups()
  }, [])

  const handleApprove = async (id: string) => {
    try {
      setActionLoading(id)
      await paymentService.approveTopup(id)
      toast.success('Duyệt nạp tiền thành công')
      setTopups(prev => prev.filter(t => t.id !== id))
    } catch (error: any) {
      toast.error('Duyệt thất bại: ' + (error?.response?.data?.error?.message || error.message))
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (id: string) => {
    if (!rejectReason.trim()) {
      toast.error('Vui lòng nhập lý do từ chối')
      return
    }
    try {
      setActionLoading(id)
      await paymentService.rejectTopup(id, rejectReason)
      toast.success('Đã từ chối giao dịch nạp tiền')
      setTopups(prev => prev.filter(t => t.id !== id))
      setSelectedRejectId(null)
      setRejectReason('')
    } catch (error: any) {
      toast.error('Từ chối thất bại: ' + (error?.response?.data?.error?.message || error.message))
    } finally {
      setActionLoading(null)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <span className="px-2.5 py-1 text-xs font-semibold bg-yellow-100 text-yellow-700 rounded-full flex items-center gap-1 w-fit"><Clock className="size-3" /> Chờ duyệt</span>
      default:
        return <span className="px-2.5 py-1 text-xs font-semibold bg-gray-100 text-gray-700 rounded-full">{status}</span>
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Duyệt nạp tiền (QR)</h2>
        <p className="text-muted-foreground mt-1">Quản lý và phê duyệt các giao dịch nạp tiền của người dùng.</p>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
              <tr>
                <th className="px-6 py-4 font-semibold">Mã GD (Code)</th>
                <th className="px-6 py-4 font-semibold">Số tiền (VND)</th>
                <th className="px-6 py-4 font-semibold">Trạng thái</th>
                <th className="px-6 py-4 font-semibold">Thời gian hết hạn</th>
                <th className="px-6 py-4 font-semibold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center">
                    <Loader2 className="size-6 animate-spin mx-auto text-primary" />
                    <p className="mt-2 text-muted-foreground">Đang tải dữ liệu...</p>
                  </td>
                </tr>
              ) : topups.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-muted-foreground">
                    Không có giao dịch nào đang chờ duyệt.
                  </td>
                </tr>
              ) : (
                topups.map((topup) => (
                  <tr key={topup.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-mono font-medium text-primary">{topup.code}</td>
                    <td className="px-6 py-4 font-bold">{Number(topup.amount).toLocaleString('vi-VN')} ₫</td>
                    <td className="px-6 py-4">{getStatusBadge(topup.status)}</td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {new Date(topup.expiresAt).toLocaleString('vi-VN')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {selectedRejectId === topup.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <input 
                            type="text" 
                            placeholder="Lý do từ chối..." 
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            className="text-xs px-2 py-1.5 border rounded"
                          />
                          <button 
                            onClick={() => handleReject(topup.id)}
                            disabled={actionLoading === topup.id}
                            className="bg-rose-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-rose-600"
                          >
                            Xác nhận
                          </button>
                          <button 
                            onClick={() => setSelectedRejectId(null)}
                            className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-gray-300"
                          >
                            Hủy
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleApprove(topup.id)}
                            disabled={actionLoading === topup.id}
                            className="flex items-center gap-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                          >
                            {actionLoading === topup.id ? <Loader2 className="size-3 animate-spin" /> : <CheckCircle className="size-3" />}
                            Duyệt
                          </button>
                          <button
                            onClick={() => setSelectedRejectId(topup.id)}
                            disabled={actionLoading === topup.id}
                            className="flex items-center gap-1 bg-rose-50 text-rose-600 hover:bg-rose-100 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                          >
                            <XCircle className="size-3" />
                            Từ chối
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
