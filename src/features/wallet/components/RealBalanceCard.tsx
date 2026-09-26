import { useEffect, useState } from 'react'
import { walletService } from '../services/walletService'
import type { WalletBalance } from '../types/wallet.types'
import { useAuthStore } from '@/features/auth/stores/useAuthStore'
import { TrendingUp, RefreshCw, AlertCircle, Eye, EyeOff } from 'lucide-react'

interface Props {
  className?: string
  refreshTrigger?: number
  onBalanceLoaded?: (balance: WalletBalance) => void
}

export const RealBalanceCard: React.FC<Props> = ({ className = '', refreshTrigger = 0, onBalanceLoaded }) => {
  const user = useAuthStore((state) => state.user)
  const [balance, setBalance] = useState<WalletBalance | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showBalance, setShowBalance] = useState(true)

  const fetchBalance = async () => {
    if (!user?.id) return
    try {
      setLoading(true)
      setError(null)
      const data = await walletService.getBalance(String(user.id))
      setBalance(data)
      onBalanceLoaded?.(data)
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Chưa khởi tạo ví hoặc lỗi kết nối')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBalance()
  }, [user?.id, refreshTrigger])

  const formattedBalance = balance
    ? Number(balance.availableBalance || balance.balance || 0).toLocaleString('vi-VN')
    : '0'

  return (
    <div className={`rounded-2xl bg-linear-to-br from-violet-600 via-primary to-purple-800 p-6 text-white shadow-xl shadow-primary/20 flex flex-col justify-between ${className}`}>
      <div>
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-purple-200">
            Số dư khả dụng (Tiền thật)
          </p>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowBalance(!showBalance)} 
              className="p-1 rounded-lg hover:bg-white/10 transition-colors text-purple-200"
              title={showBalance ? "Ẩn số dư" : "Hiện số dư"}
            >
              {showBalance ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
            </button>
            <button
              onClick={fetchBalance}
              disabled={loading}
              className="p-1 rounded-lg hover:bg-white/10 transition-colors text-purple-200"
              title="Làm mới số dư"
            >
              <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {error ? (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-rose-300">
            <AlertCircle className="size-3.5" />
            <span>{error}</span>
          </div>
        ) : loading && !balance ? (
          <div className="mt-2 h-10 w-48 bg-white/20 rounded-md animate-pulse"></div>
        ) : (
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight mt-1">
            {showBalance ? `₫ ${formattedBalance}` : '•••••• VND'}
          </h2>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between text-xs text-purple-200">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-bold text-emerald-300 border border-emerald-400/30">
            <TrendingUp className="size-3" />
            VND
          </span>
          <span>{balance?.status === 'ACTIVE' ? 'Ví đang hoạt động' : 'Ví chưa kích hoạt'}</span>
        </div>
        {balance && Number(balance.heldBalance) > 0 && (
          <span className="text-amber-300">Đang giữ: ₫ {Number(balance.heldBalance).toLocaleString('vi-VN')}</span>
        )}
      </div>
    </div>
  )
}
