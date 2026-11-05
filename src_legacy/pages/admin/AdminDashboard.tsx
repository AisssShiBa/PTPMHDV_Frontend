// d:\PTPMHDV\Frontend\src\pages\admin\AdminDashboard.tsx
import { useEffect, useState } from 'react'
import { adminService } from '@/features/admin/services/adminService'
import { Users, FileCheck, Store, CreditCard, RefreshCw, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = async () => {
    try {
      setLoading(true)
      const data = await adminService.getDashboardStats()
      setStats(data)
    } catch (err: any) {
      toast.error('Lỗi tải dữ liệu Dashboard: ' + (err?.response?.data?.error?.message || err.message))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  return (
    <div className="space-y-8 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">Thống kê Quản trị (Admin)</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Tổng quan số liệu người dùng, đối tác và giao dịch toàn hệ thống FinVault.
          </p>
        </div>
        <button
          onClick={fetchStats}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-xs sm:text-sm font-semibold hover:bg-muted transition-all active:scale-95"
        >
          <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Làm mới</span>
        </button>
      </div>

      {loading && !stats ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="rounded-2xl border border-border/60 bg-card/60 p-5 space-y-3">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold">Tổng người dùng</span>
              <Users className="size-4 text-primary" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-foreground">
              {stats?.totalUsers ?? 8}
            </div>
            <p className="text-[11px] text-muted-foreground">Tài khoản đăng ký trên hệ thống</p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/60 p-5 space-y-3">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold">Hồ sơ KYC chờ duyệt</span>
              <FileCheck className="size-4 text-amber-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-600">
              {stats?.pendingKyc ?? 0}
            </div>
            <p className="text-[11px] text-muted-foreground">Người dùng chờ xác minh CCCD</p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/60 p-5 space-y-3">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold">Đối tác chờ duyệt</span>
              <Store className="size-4 text-blue-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-blue-600">
              {stats?.pendingMerchants ?? 0}
            </div>
            <p className="text-[11px] text-muted-foreground">Cửa hàng đăng ký mở cổng</p>
          </div>

          <div className="rounded-2xl border border-border/60 bg-card/60 p-5 space-y-3">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-semibold">Tổng giao dịch</span>
              <CreditCard className="size-4 text-emerald-500" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600">
              {stats?.totalTransactions ?? 0}
            </div>
            <p className="text-[11px] text-muted-foreground">Đơn thanh toán & nạp tiền</p>
          </div>
        </div>
      )}
    </div>
  )
}
