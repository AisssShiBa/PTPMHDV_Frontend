// d:\PTPMHDV\Frontend\src\pages\Profile.tsx
import { useEffect, useState } from 'react'
import { useAuthStore } from '@/features/auth/stores/useAuthStore'
import { userService } from '@/features/user/services/userService'
import type { UserProfile } from '@/features/user/types/user.types'
import { KycStatusBadge } from '@/features/user/components/KycStatusBadge'
import { User, Mail, Phone, MapPin, ShieldCheck, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function Profile() {
  const authUser = useAuthStore((state) => state.user)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  // Form edit
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)

  // KYC form
  const [idNumber, setIdNumber] = useState('')
  const [idImageUrl, setIdImageUrl] = useState('')
  const [isSubmittingKyc, setIsSubmittingKyc] = useState(false)

  useEffect(() => {
    if (!authUser?.id) return
    loadProfile()
  }, [authUser?.id])

  const loadProfile = async () => {
    try {
      setLoading(true)
      const data = await userService.getProfileByAuthUserId(String(authUser!.id))
      setProfile(data)
      setFullName(data.fullName || '')
      setPhone(data.phone || '')
      setAddress(data.address || '')
      setIdNumber(data.idNumber || '')
      setIdImageUrl(data.idImageUrl || '')
    } catch (err: any) {
      toast.error('Không thể tải thông tin hồ sơ: ' + (err?.response?.data?.message || err.message))
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile?.id) return
    try {
      setIsUpdating(true)
      const updated = await userService.updateProfile(profile.id, { fullName, phone, address })
      setProfile(updated)
      toast.success('Cập nhật hồ sơ thành công!')
    } catch (err: any) {
      toast.error('Cập nhật thất bại: ' + (err?.response?.data?.error?.message || err.message))
    } finally {
      setIsUpdating(false)
    }
  }

  const handleSubmitKyc = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile?.id) return
    try {
      setIsSubmittingKyc(true)
      const updated = await userService.submitKyc(profile.id, { idNumber, idImageUrl })
      setProfile(updated)
      toast.success('Gửi hồ sơ KYC thành công! Vui lòng chờ Quản trị viên duyệt.')
    } catch (err: any) {
      toast.error('Nộp KYC thất bại: ' + (err?.response?.data?.error?.message || err.message))
    } finally {
      setIsSubmittingKyc(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">Hồ sơ cá nhân & Định danh</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Quản lý thông tin tài khoản và xác thực danh tính điện tử (KYC).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Cột trái: Tóm tắt */}
        <div className="rounded-2xl border border-border/60 bg-card/60 p-6 space-y-4">
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="size-20 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl font-bold border border-primary/20">
              {profile?.fullName?.[0] || authUser?.username?.[0]?.toUpperCase() || 'U'}
            </div>
            <h2 className="text-lg font-bold text-foreground">{profile?.fullName || authUser?.username}</h2>
            <p className="text-xs text-muted-foreground">{profile?.email || authUser?.email}</p>
            <div className="pt-2">
              <KycStatusBadge status={profile?.kycStatus} />
            </div>
          </div>
        </div>

        {/* Cột phải: Form cập nhật thông tin */}
        <div className="md:col-span-2 space-y-6">
          <div className="rounded-2xl border border-border/60 bg-card/60 p-6">
            <h3 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
              <User className="size-4 text-primary" />
              Thông tin liên hệ
            </h3>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Họ và tên</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  className="w-full mt-1 px-3.5 py-2.5 rounded-xl border border-border/60 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Phone className="size-3" /> Số điện thoại
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0987654321"
                    className="w-full mt-1 px-3.5 py-2.5 rounded-xl border border-border/60 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Mail className="size-3" /> Email (Không thể đổi)
                  </label>
                  <input
                    type="text"
                    disabled
                    value={profile?.email || ''}
                    className="w-full mt-1 px-3.5 py-2.5 rounded-xl border border-border/40 bg-muted/40 text-muted-foreground text-sm cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="size-3" /> Địa chỉ cư trú
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Hà Nội, Việt Nam"
                  className="w-full mt-1 px-3.5 py-2.5 rounded-xl border border-border/60 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <button
                type="submit"
                disabled={isUpdating}
                className="px-5 py-2.5 rounded-xl bg-primary text-white font-bold text-xs sm:text-sm hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50"
              >
                {isUpdating ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </form>
          </div>

          {/* Form Định danh KYC */}
          <div className="rounded-2xl border border-border/60 bg-card/60 p-6">
            <h3 className="text-base font-bold text-foreground mb-2 flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary" />
              Định danh điện tử (KYC)
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Xác thực CCCD để mở rộng hạn mức giao dịch ví lên 100.000.000 VND.
            </p>

            {profile?.kycStatus === 'APPROVED' ? (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 text-xs sm:text-sm">
                🎉 Hồ sơ KYC của bạn đã được Quản trị viên phê duyệt thành công.
              </div>
            ) : (
              <form onSubmit={handleSubmitKyc} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Số CCCD / Hộ chiếu</label>
                  <input
                    type="text"
                    required
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                    placeholder="001201012345"
                    className="w-full mt-1 px-3.5 py-2.5 rounded-xl border border-border/60 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Đường dẫn ảnh chụp CCCD</label>
                  <input
                    type="url"
                    required
                    value={idImageUrl}
                    onChange={(e) => setIdImageUrl(e.target.value)}
                    placeholder="https://example.com/cccd_mat_truoc.jpg"
                    className="w-full mt-1 px-3.5 py-2.5 rounded-xl border border-border/60 bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingKyc || profile?.kycStatus === 'PENDING'}
                  className="px-5 py-2.5 rounded-xl bg-primary text-white font-bold text-xs sm:text-sm hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50"
                >
                  {isSubmittingKyc ? 'Đang gửi...' : profile?.kycStatus === 'PENDING' ? 'Đang chờ xét duyệt' : 'Gửi hồ sơ KYC'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
