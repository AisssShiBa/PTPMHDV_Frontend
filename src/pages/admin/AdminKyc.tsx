// d:\PTPMHDV\Frontend\src\pages\admin\AdminKyc.tsx
import { useEffect, useState } from 'react'
import { adminService } from '@/features/admin/services/adminService'
import type { AdminKycItem } from '@/features/admin/types/admin.types'
import { KycStatusBadge } from '@/features/user/components/KycStatusBadge'
import { Check, X, RefreshCw, Loader2, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'

export default function AdminKyc() {
  const [list, setList] = useState<AdminKycItem[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchList = async () => {
    try {
      setLoading(true)
      const data = await adminService.getKycList({ limit: 50 })
      setList(data.content || [])
    } catch (err: any) {
      toast.error('Lỗi tải danh sách KYC: ' + (err?.response?.data?.error?.message || err.message))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchList()
  }, [])

  const handleReview = async (userId: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      setActionLoading(userId)
      await adminService.reviewKyc(userId, status, status === 'APPROVED' ? 'Hồ sơ hợp lệ' : 'Ảnh mờ hoặc không hợp lệ')
      toast.success(status === 'APPROVED' ? 'Đã duyệt hồ sơ KYC!' : 'Đã từ chối hồ sơ KYC!')
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
          <h1 className="text-2xl font-black text-foreground tracking-tight">Phê duyệt Định danh KYC</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Kiểm tra thông tin giấy tờ và duyệt/từ chối hồ sơ người dùng.
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
            Hiện không có hồ sơ KYC nào trên hệ thống
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border/60">
                <tr>
                  <th className="p-3.5">Họ tên / Email</th>
                  <th className="p-3.5">Số CCCD</th>
                  <th className="p-3.5">Ảnh CCCD</th>
                  <th className="p-3.5">Trạng thái</th>
                  <th className="p-3.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {list.map((item) => (
                  <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3.5">
                      <div className="font-bold text-foreground">{item.fullName || 'Chưa cập nhật'}</div>
                      <div className="text-muted-foreground text-[11px]">{item.email}</div>
                    </td>
                    <td className="p-3.5 font-mono font-medium">{item.idNumber || '—'}</td>
                    <td className="p-3.5">
                      {item.idImageUrl ? (
                        <a
                          href={item.idImageUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline font-semibold"
                        >
                          <span>Xem ảnh</span>
                          <ExternalLink className="size-3" />
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="p-3.5">
                      <KycStatusBadge status={item.kycStatus} />
                    </td>
                    <td className="p-3.5 text-right space-x-2">
                      <button
                        onClick={() => handleReview(item.id, 'APPROVED')}
                        disabled={actionLoading === item.id || item.kycStatus === 'APPROVED'}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold text-[11px] hover:bg-emerald-700 disabled:opacity-30 inline-flex items-center gap-1"
                      >
                        <Check className="size-3" /> Duyệt
                      </button>
                      <button
                        onClick={() => handleReview(item.id, 'REJECTED')}
                        disabled={actionLoading === item.id || item.kycStatus === 'REJECTED'}
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
