// d:\PTPMHDV\Frontend\src\pages\MerchantRegister.tsx
import { useState } from 'react'
import { merchantService } from '@/features/merchant/services/merchantService'
import { Building2, CheckCircle2, Loader2, Store } from 'lucide-react'
import { toast } from 'sonner'

export default function MerchantRegister() {
  const [businessName, setBusinessName] = useState('')
  const [taxId, setTaxId] = useState('')
  const [bankAccount, setBankAccount] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      await merchantService.register({
        businessName: businessName.trim(),
        taxId: taxId.trim() || undefined,
        bankAccount: bankAccount.trim() || undefined
      })
      setSuccess(true)
      toast.success('Đăng ký đối tác thành công! Hồ sơ đang chờ Quản trị viên xét duyệt.')
    } catch (err: any) {
      toast.error('Đăng ký thất bại: ' + (err?.response?.data?.error?.message || err.message))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">Đăng ký Đối tác Kinh doanh (Merchant)</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Mở cổng thanh toán FinVault cho cửa hàng, dịch vụ hoặc doanh nghiệp của bạn.
        </p>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card/60 p-6 sm:p-8 shadow-sm">
        {success ? (
          <div className="text-center py-8 space-y-4">
            <div className="size-16 rounded-full bg-emerald-500/15 text-emerald-600 mx-auto flex items-center justify-center">
              <CheckCircle2 className="size-8" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Đã gửi hồ sơ đăng ký Merchant!</h2>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
              Hồ sơ của doanh nghiệp <strong>{businessName}</strong> đã được lưu vào hệ thống. Đội ngũ Quản trị viên FinVault sẽ kiểm tra và kích hoạt cổng thanh toán cho bạn trong vòng 24 giờ làm việc.
            </p>
            <button
              onClick={() => setSuccess(false)}
              className="mt-4 px-5 py-2.5 rounded-xl border border-border text-xs sm:text-sm font-semibold hover:bg-muted transition-colors"
            >
              Đăng ký thêm hồ sơ khác
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Store className="size-3.5" /> Tên doanh nghiệp / Cửa hàng <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Cửa Hàng Tiện Lợi FinVault"
                className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl border border-border/60 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Building2 className="size-3.5" /> Mã số thuế (MST)
              </label>
              <input
                type="text"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                placeholder="0101234567"
                className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl border border-border/60 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-muted-foreground">Số tài khoản ngân hàng thụ hưởng</label>
              <input
                type="text"
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                placeholder="1903456789012 - Techcombank"
                className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl border border-border/60 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-primary text-white font-bold text-sm shadow-md shadow-primary/20 hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="size-4 animate-spin" />}
                <span>{loading ? 'Đang gửi hồ sơ...' : 'Nộp hồ sơ đối tác'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
