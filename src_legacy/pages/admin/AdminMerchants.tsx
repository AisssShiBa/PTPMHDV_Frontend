// d:\PTPMHDV\Frontend\src\pages\admin\AdminMerchants.tsx
import { useEffect, useState } from 'react'
import { adminService } from '@/features/admin/services/adminService'
import type { AdminMerchantItem } from '@/features/admin/types/admin.types'
import { Check, X, RefreshCw, Loader2, Store } from 'lucide-react'
import { toast } from 'sonner'

export default function AdminMerchants() {
  const [list, setList] = useState<AdminMerchantItem[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchList = async () => {
    try {
      setLoading(true)
      const data = await adminService.getMerchantList({ limit: 50 })
      setList(data.content || [])
    } catch (err: any) {
      toast.error('Lỗi tải danh sách Merchant: ' + (err?.response?.data?.error?.message || err.message))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchList()
  }, [])

  const handleReview = async (merchantId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      setActionLoading(merchantId)
      await adminService.reviewMerchant(merchantId, status, status === 'APPROVED' ? 'Đủ điều kiện kinh doanh' : 'Thông tin chưa hợp lệ')
      toast.success(status === 'APPROVED' ? 'Đã duyệt đối tác thành công!' : 'Đã từ chối đối tác!')
      fetchList()
    } catch (err: any) {
      toast.error('Thao tác thất bại: ' + (err?.response?.data?.error?.message || err.message))
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">Phê duyệt Đối tác Kinh doanh (Merchant)</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Kiểm tra hồ sơ đăng ký mở cổng thanh toán của các doanh nghiệp và cửa hàng.
          </p>
        </div>
        <button
          onClick={fetchList}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-border text-xs font-semibold hover:bg-muted"
        >
          <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Làm mới</span>
        </button>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card/60 overflow-hidden shadow-xs">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : list.length === 0 ? (
          <div className="py-16 text-center text-xs text-muted-foreground">
            Hiện không có hồ sơ đối tác nào trên hệ thống
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border/60">
                <tr>
                  <th className="p-3.5">Tên doanh nghiệp</th>
                  <th className="p-3.5">Mã số thuế</th>
                  <th className="p-3.5">Tài khoản ngân hàng</th>
                  <th className="p-3.5">Trạng thái</th>
                  <th className="p-3.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {list.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3.5 font-bold text-foreground flex items-center gap-2">
                      <Store className="size-4 text-primary shrink-0" />
                      <span>{item.businessName}</span>
                    </td>
                    <td className="p-3.5 font-mono">{item.taxId || '—'}</td>
                    <td className="p-3.5">{item.bankAccount || '—'}</td>
                    <td className="p-3.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                          item.status === 'APPROVED'
                            ? 'bg-emerald-500/15 text-emerald-600'
                            : item.status === 'PENDING'
                            ? 'bg-amber-500/15 text-amber-600'
                            : 'bg-rose-500/15 text-rose-600'
                        }`}
                      >
                        {item.status === 'APPROVED' ? 'Đã duyệt' : item.status === 'PENDING' ? 'Chờ duyệt' : 'Từ chối'}
                      </span>
                    </td>
                    <td className="p-3.5 text-right space-x-2">
                      <button
                        onClick={() => handleReview(item.id, 'APPROVED')}
                        disabled={actionLoading === item.id || item.status === 'APPROVED'}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold text-[11px] hover:bg-emerald-700 disabled:opacity-30 inline-flex items-center gap-1"
                      >
                        <Check className="size-3" /> Duyệt
                      </button>
                      <button
                        onClick={() => handleReview(item.id, 'REJECTED')}
                        disabled={actionLoading === item.id || item.status === 'REJECTED'}
                        className="px-2.5 py-1.5 rounded-lg bg-rose-600 text-white font-semibold text-[11px] hover:bg-rose-700 disabled:opacity-30 inline-flex items-center gap-1"
                      >
                        <X className="size-3" /> Từ chối
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
