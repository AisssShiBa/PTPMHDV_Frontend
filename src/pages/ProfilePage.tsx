import { useState, useRef } from 'react'
import {
  ShieldCheck,
  KeyRound,
  Lock,
  UploadCloud,
  CheckCircle2,
  Clock,
  CreditCard,
  Eye,
  EyeOff,
  Trash2,
  Copy,
  Check,
  Building,
  BadgeCheck,
  Sparkles
} from 'lucide-react'
import { useAuthStore } from '@/features/auth/stores/useAuthStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { toast } from 'sonner'

export function ProfilePage() {
  const { user } = useAuthStore()

  // Thông tin người dùng
  const fullName = user?.username === 'annguyen' ? 'An Nguyễn' : user?.username || 'Khách hàng FinVault'
  const email = user?.email || 'annguyen@finvault.vn'
  const phoneNumber = '0909 *** 123'
  const walletId = 'FV-8899-2026'

  // Tab điều hướng: 'kyc' | 'security'
  const [activeTab, setActiveTab] = useState<'kyc' | 'security'>('kyc')

  // Trạng thái sao chép mã ví
  const [copiedWalletId, setCopiedWalletId] = useState(false)

  // Trạng thái upload ảnh CCCD
  const [frontImage, setFrontImage] = useState<string | null>(
    'https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop&q=80'
  )
  const [backImage, setBackImage] = useState<string | null>(null)
  const [isSubmittingKyc, setIsSubmittingKyc] = useState(false)
  const [kycPending, setKycPending] = useState(false)

  const frontInputRef = useRef<HTMLInputElement>(null)
  const backInputRef = useRef<HTMLInputElement>(null)

  // Form Đổi Mật Khẩu
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showOldPass, setShowOldPass] = useState(false)
  const [showNewPass, setShowNewPass] = useState(false)
  const [showConfirmPass, setShowConfirmPass] = useState(false)
  const [isChangingPass, setIsChangingPass] = useState(false)

  // Form Đổi Mã PIN
  const [oldPin, setOldPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [isChangingPin, setIsChangingPin] = useState(false)

  // Sao chép mã ví
  const handleCopyWalletId = () => {
    navigator.clipboard.writeText(walletId)
    setCopiedWalletId(true)
    toast.success('Đã sao chép mã ví FinVault')
    setTimeout(() => setCopiedWalletId(false), 2000)
  }

  // Xử lý upload ảnh (Tuân thủ Prompt 0: giới hạn <= 5MB)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, side: 'FRONT' | 'BACK') => {
    const file = e.target.files?.[0]
    if (!file) return

    // Kiểm tra dung lượng tối đa 5MB (Prompt 0)
    const MAX_SIZE_MB = 5
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`Dung lượng ảnh vượt quá ${MAX_SIZE_MB}MB. Vui lòng chọn ảnh nhỏ hơn.`)
      return
    }

    // Kiểm tra định dạng hợp lệ
    const validTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) {
      toast.error('Chỉ hỗ trợ định dạng JPG, PNG hoặc WebP.')
      return
    }

    const previewUrl = URL.createObjectURL(file)
    if (side === 'FRONT') {
      setFrontImage(previewUrl)
      toast.success('Đã tải lên ảnh mặt trước CCCD')
    } else {
      setBackImage(previewUrl)
      toast.success('Đã tải lên ảnh mặt sau CCCD')
    }
  }

  // Gửi duyệt KYC
  const handleSubmitKyc = () => {
    if (!frontImage || !backImage) {
      toast.error('Vui lòng tải lên đầy đủ ảnh CCCD 2 mặt trước khi gửi xét duyệt.')
      return
    }

    setIsSubmittingKyc(true)
    setTimeout(() => {
      setIsSubmittingKyc(false)
      setKycPending(true)
      toast.success('Đã gửi hồ sơ định danh thành công!', {
        description: 'Hồ sơ được cán bộ FinVault xem xét duyệt trong vòng 24 giờ làm việc.'
      })
    }, 1000)
  }

  // Đổi mật khẩu
  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault()
    if (!oldPassword || !newPassword || !confirmPassword) {
      toast.error('Vui lòng nhập đầy đủ các trường mật khẩu.')
      return
    }
    if (newPassword.length < 6) {
      toast.error('Mật khẩu mới phải có tối thiểu 6 ký tự.')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp.')
      return
    }

    setIsChangingPass(true)
    setTimeout(() => {
      setIsChangingPass(false)
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
      toast.success('Đổi mật khẩu tài khoản thành công!')
    }, 800)
  }

  // Đổi mã PIN
  const handleChangePin = (e: React.FormEvent) => {
    e.preventDefault()
    if (!oldPin || !newPin || !confirmPin) {
      toast.error('Vui lòng nhập đầy đủ mã PIN hiện tại và mã PIN mới.')
      return
    }
    if (newPin.length !== 6 || !/^\d{6}$/.test(newPin)) {
      toast.error('Mã PIN mới phải bao gồm đúng 6 chữ số.')
      return
    }
    if (newPin !== confirmPin) {
      toast.error('Mã PIN xác nhận không trùng khớp.')
      return
    }

    setIsChangingPin(true)
    setTimeout(() => {
      setIsChangingPin(false)
      setOldPin('')
      setNewPin('')
      setConfirmPin('')
      toast.success('Đã cập nhật mã PIN ví 6 số thành công!')
    }, 800)
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header khu vực làm việc */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary text-xs font-semibold uppercase tracking-wider mb-1">
            <ShieldCheck className="h-4 w-4" />
            <span>Bảo mật & Định danh công dân</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Hồ sơ & Xác minh danh tính (KYC)
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Quản lý cấp độ định danh để mở rộng hạn mức giao dịch an toàn trên FinVault
          </p>
        </div>

        {/* Thẻ trạng thái cấp độ hiện tại */}
        <div className="flex items-center gap-3 bg-card border border-border px-4 py-2.5 rounded-2xl shadow-sm self-start sm:self-auto">
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <BadgeCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-muted-foreground font-medium">Hạng thành viên</div>
            <div className="text-sm font-bold text-primary flex items-center gap-1">
              <span>Cấp 2 (Nâng cao)</span>
              <Sparkles className="h-3 w-3 text-amber-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Thẻ tóm tắt thông tin người dùng chính */}
      <Card className="border-border shadow-sm">
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold shadow-sm ring-4 ring-primary/10">
                {fullName.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-bold text-foreground">{fullName}</h2>
                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-none text-[11px] gap-1 font-semibold">
                    <CheckCircle2 className="h-3 w-3" />
                    Đã xác thực CCCD
                  </Badge>
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground mt-0.5 space-x-2">
                  <span>{email}</span>
                  <span>•</span>
                  <span>{phoneNumber}</span>
                </div>
              </div>
            </div>

            {/* Mã ví FinVault */}
            <div className="p-3 rounded-xl bg-muted/50 border border-border flex items-center justify-between sm:justify-start gap-4">
              <div>
                <span className="text-[11px] text-muted-foreground block font-medium">Mã ví FinVault</span>
                <span className="font-mono font-bold text-sm text-foreground">{walletId}</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCopyWalletId}
                className="h-8 px-2.5 text-xs text-primary gap-1 cursor-pointer"
              >
                {copiedWalletId ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedWalletId ? 'Đã chép' : 'Sao chép'}</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs điều hướng: Lộ trình KYC & Bảo mật tài khoản */}
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as 'kyc' | 'security')} className="w-full">
        <TabsList className="grid w-full sm:w-80 grid-cols-2 mb-6">
          <TabsTrigger value="kyc" className="text-xs sm:text-sm font-semibold gap-1.5 cursor-pointer">
            <ShieldCheck className="h-4 w-4" />
            <span>Định danh KYC</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="text-xs sm:text-sm font-semibold gap-1.5 cursor-pointer">
            <KeyRound className="h-4 w-4" />
            <span>Bảo mật & PIN</span>
          </TabsTrigger>
        </TabsList>

        {/* ======================================================== */}
        {/* TAB 1: LỘ TRÌNH ĐỊNH DANH & XÁC MINH CCCD               */}
        {/* ======================================================== */}
        <TabsContent value="kyc" className="space-y-6 mt-0 animate-in fade-in-50 duration-200">
          {/* PHẦN 1: 3 CẤP ĐỘ XÁC THỰC */}
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-4 border-b border-border/60">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base sm:text-lg">Lộ trình cấp độ định danh</CardTitle>
                  <CardDescription className="text-xs">
                    Chính sách mở rộng hạn mức giao dịch theo từng cấp độ hoàn thiện hồ sơ
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-xs border-primary/30 text-primary w-fit font-semibold">
                  Cấp bậc hiện hành: Cấp 2 (Nâng cao)
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Cấp 0 */}
                <div className="p-4 rounded-xl bg-muted/40 border border-border flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                        <Check className="h-4 w-4" />
                      </span>
                      <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-none text-[11px]">
                        Đã hoàn thành
                      </Badge>
                    </div>
                    <h3 className="font-bold text-sm text-foreground">Cấp 0 (Cơ bản)</h3>
                    <p className="text-xs text-muted-foreground mt-1">Xác thực SĐT & Email khi đăng ký tài khoản.</p>
                    <div className="space-y-1.5 pt-3 mt-3 border-t border-border/60 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tối đa / lần:</span>
                        <span className="font-semibold text-foreground">1.000.000 ₫</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tối đa / ngày:</span>
                        <span className="font-semibold text-foreground">5.000.000 ₫</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 pt-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Đã kích hoạt tự động
                  </div>
                </div>

                {/* Cấp 1 */}
                <div className="p-4 rounded-xl bg-muted/40 border border-border flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                        <Check className="h-4 w-4" />
                      </span>
                      <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-none text-[11px]">
                        Đã hoàn thành
                      </Badge>
                    </div>
                    <h3 className="font-bold text-sm text-foreground">Cấp 1 (Trung cấp)</h3>
                    <p className="text-xs text-muted-foreground mt-1">Xác thực CCCD gắn chip đối soát thông tin.</p>
                    <div className="space-y-1.5 pt-3 mt-3 border-t border-border/60 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tối đa / lần:</span>
                        <span className="font-semibold text-foreground">10.000.000 ₫</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tối đa / ngày:</span>
                        <span className="font-semibold text-foreground">20.000.000 ₫</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 pt-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    CCCD: ********3829
                  </div>
                </div>

                {/* Cấp 2 */}
                <div className="p-4 rounded-xl border-2 border-primary bg-primary/5 flex flex-col justify-between shadow-xs relative">
                  <div className="absolute -top-2.5 right-4 bg-primary text-primary-foreground px-2 py-0.5 rounded-full text-[10px] font-bold shadow-xs">
                    Đang kích hoạt
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">
                        2
                      </span>
                      <Badge variant="outline" className="text-xs text-primary border-primary/30 font-bold">
                        Cấp 2 (Nâng cao)
                      </Badge>
                    </div>
                    <h3 className="font-bold text-sm text-primary">Cấp 2 (Nâng cao)</h3>
                    <p className="text-xs text-muted-foreground mt-1">Xác thực tài khoản ngân hàng liên kết chính chủ.</p>
                    <div className="space-y-1.5 pt-3 mt-3 border-t border-border/60 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tối đa / lần:</span>
                        <span className="font-bold text-primary">50.000.000 ₫</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tối đa / ngày:</span>
                        <span className="font-bold text-primary">100.000.000 ₫</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 pt-2 text-[11px] text-primary font-semibold flex items-center gap-1">
                    <Building className="h-3.5 w-3.5" />
                    Vietcombank (*8829)
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* PHẦN 2 & 3: FORM TẢI ẢNH CCCD & BẢNG SO SÁNH HẠN MỨC */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Cột trái: Form Upload CCCD (7 cột) */}
            <Card className="lg:col-span-7 border-border shadow-sm">
              <CardHeader className="pb-3 border-b border-border/60">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base sm:text-lg">Tài liệu xác minh CCCD gắn chip</CardTitle>
                    <CardDescription className="text-xs">
                      Cung cấp ảnh chụp giấy tờ định danh công dân để duy trì & nâng cấp hạn mức
                    </CardDescription>
                  </div>
                  <CreditCard className="h-5 w-5 text-primary" />
                </div>
              </CardHeader>
              <CardContent className="space-y-5 pt-4">
                {/* Thông báo quy trình duyệt */}
                <div className="p-3 rounded-xl bg-muted/50 border border-border flex items-start gap-2.5 text-xs text-muted-foreground">
                  <Clock className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-foreground block">Quy trình thẩm định hồ sơ:</strong>
                    Hồ sơ được cán bộ FinVault xem xét và phê duyệt trong vòng 24 giờ làm việc. Dung lượng ảnh tối đa ≤ 5MB.
                  </div>
                </div>

                {/* 2 Khung ảnh CCCD */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Mặt trước */}
                  <div className="p-3.5 rounded-xl border-2 border-primary/30 bg-card space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground flex items-center gap-1">
                        <CreditCard className="h-3.5 w-3.5 text-primary" />
                        Mặt trước CCCD
                      </span>
                      <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-none text-[10px] gap-1">
                        <Check className="h-3 w-3" />
                        Hợp lệ
                      </Badge>
                    </div>

                    <div className="relative h-36 rounded-lg overflow-hidden border border-border bg-muted flex items-center justify-center">
                      {frontImage ? (
                        <img src={frontImage} alt="Mặt trước CCCD" className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-center p-3 text-muted-foreground text-xs">Chưa có ảnh</div>
                      )}
                    </div>

                    <input
                      ref={frontInputRef}
                      type="file"
                      accept="image/png, image/jpeg, image/webp"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, 'FRONT')}
                    />

                    <div className="flex justify-between items-center pt-1 text-xs">
                      <span className="text-muted-foreground">NGUYỄN VĂN AN</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => frontInputRef.current?.click()}
                        className="h-7 text-xs text-primary p-1 cursor-pointer"
                      >
                        Đổi ảnh
                      </Button>
                    </div>
                  </div>

                  {/* Mặt sau */}
                  <div className="p-3.5 rounded-xl border-2 border-amber-500/40 bg-card space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground flex items-center gap-1">
                        <CreditCard className="h-3.5 w-3.5 text-amber-500" />
                        Mặt sau CCCD
                      </span>
                      {kycPending ? (
                        <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-none text-[10px]">
                          Đang chờ duyệt
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                          {backImage ? 'Đã chọn ảnh' : 'Chưa tải'}
                        </Badge>
                      )}
                    </div>

                    <div
                      onClick={() => backInputRef.current?.click()}
                      className="relative h-36 rounded-lg overflow-hidden border-2 border-dashed border-border bg-muted/30 hover:bg-muted/60 transition-colors flex flex-col items-center justify-center cursor-pointer p-3 text-center"
                    >
                      {backImage ? (
                        <img src={backImage} alt="Mặt sau CCCD" className="w-full h-full object-cover" />
                      ) : (
                        <>
                          <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-1.5">
                            <UploadCloud className="h-5 w-5" />
                          </div>
                          <span className="text-xs font-semibold text-foreground">Chọn hoặc kéo thả ảnh</span>
                          <span className="text-[10px] text-muted-foreground mt-0.5">JPG, PNG (Tối đa 5MB)</span>
                        </>
                      )}
                    </div>

                    <input
                      ref={backInputRef}
                      type="file"
                      accept="image/png, image/jpeg, image/webp"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, 'BACK')}
                    />

                    <div className="flex justify-between items-center pt-1 text-xs">
                      <span className="text-muted-foreground">{backImage ? 'Đã chọn ảnh mới' : 'Chưa chọn'}</span>
                      {backImage && (
                        <button
                          type="button"
                          onClick={() => setBackImage(null)}
                          className="text-destructive hover:underline text-[11px] flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Xóa</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Nút gửi yêu cầu */}
                <div className="pt-2">
                  <Button
                    type="button"
                    disabled={isSubmittingKyc || kycPending}
                    onClick={handleSubmitKyc}
                    className="w-full h-11 text-xs sm:text-sm font-semibold gap-2 shadow-sm cursor-pointer"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>{kycPending ? 'Hồ sơ đang được cán bộ thẩm định' : 'Gửi yêu cầu nâng cấp hạn mức'}</span>
                  </Button>
                  <p className="text-[11px] text-center text-muted-foreground mt-2">
                    Dữ liệu cá nhân được mã hóa và bảo mật nghiêm ngặt theo tiêu chuẩn FinVault.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Cột phải: Bảng so sánh hạn mức chi tiết (5 cột) */}
            <Card className="lg:col-span-5 border-border shadow-sm">
              <CardHeader className="pb-3 border-b border-border/60">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  <span>So sánh hạn mức chi tiết</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4 text-xs sm:text-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground">
                        <th className="py-2.5">Cấp độ</th>
                        <th className="py-2.5 text-right">Mỗi lần</th>
                        <th className="py-2.5 text-right">Mỗi ngày</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      <tr>
                        <td className="py-3 font-medium text-foreground">Cấp 0 (Cơ bản)</td>
                        <td className="py-3 text-right text-muted-foreground">1.000.000 ₫</td>
                        <td className="py-3 text-right text-muted-foreground">5.000.000 ₫</td>
                      </tr>
                      <tr>
                        <td className="py-3 font-medium text-foreground">Cấp 1 (Trung cấp)</td>
                        <td className="py-3 text-right text-muted-foreground">10.000.000 ₫</td>
                        <td className="py-3 text-right text-muted-foreground">20.000.000 ₫</td>
                      </tr>
                      <tr className="bg-primary/5 font-semibold text-primary">
                        <td className="py-3 pl-2 rounded-l">Cấp 2 (Hiện tại)</td>
                        <td className="py-3 text-right">50.000.000 ₫</td>
                        <td className="py-3 text-right pr-2 rounded-r">100.000.000 ₫</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="p-3.5 rounded-xl bg-muted/50 border border-border space-y-2 text-xs">
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Đặc quyền hạn mức Cấp 2:</span>
                  </div>
                  <ul className="space-y-1 text-muted-foreground pl-5 list-disc">
                    <li>Miễn phí 100% chuyển tiền nội bộ & liên ngân hàng</li>
                    <li>Rút tiền tức thì 24/7 về Vietcombank, MB, Techcombank</li>
                    <li>Hạn mức tháng không giới hạn</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ======================================================== */}
        {/* TAB 2: QUẢN LÝ BẢO MẬT: MẬT KHẨU & MÃ PIN GIAO DỊCH     */}
        {/* ======================================================== */}
        <TabsContent value="security" className="space-y-6 mt-0 animate-in fade-in-50 duration-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Thẻ 1: Đổi mật khẩu đăng nhập */}
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-3 border-b border-border/60">
                <CardTitle className="text-base flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-primary" />
                  <span>Đổi mật khẩu tài khoản</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Khuyến nghị đổi mật khẩu định kỳ 6 tháng một lần để đảm bảo an toàn
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <form onSubmit={handleChangePassword} className="space-y-4">
                  {/* Mật khẩu cũ */}
                  <div className="space-y-1.5">
                    <Label htmlFor="oldPass" className="text-xs font-semibold">
                      Mật khẩu hiện tại
                    </Label>
                    <div className="relative">
                      <Input
                        id="oldPass"
                        type={showOldPass ? 'text' : 'password'}
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        placeholder="Nhập mật khẩu hiện tại"
                        className="pr-10 h-11"
                        required
                      />
                      <button
                        type="button"
                        aria-label="Ẩn hoặc hiện mật khẩu"
                        onClick={() => setShowOldPass(!showOldPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        {showOldPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Mật khẩu mới */}
                  <div className="space-y-1.5">
                    <Label htmlFor="newPass" className="text-xs font-semibold">
                      Mật khẩu mới
                    </Label>
                    <div className="relative">
                      <Input
                        id="newPass"
                        type={showNewPass ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Tối thiểu 6 ký tự"
                        className="pr-10 h-11"
                        required
                      />
                      <button
                        type="button"
                        aria-label="Ẩn hoặc hiện mật khẩu mới"
                        onClick={() => setShowNewPass(!showNewPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        {showNewPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Xác nhận mật khẩu mới */}
                  <div className="space-y-1.5">
                    <Label htmlFor="confirmPass" className="text-xs font-semibold">
                      Xác nhận mật khẩu mới
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirmPass"
                        type={showConfirmPass ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Nhập lại mật khẩu mới"
                        className="pr-10 h-11"
                        required
                      />
                      <button
                        type="button"
                        aria-label="Ẩn hoặc hiện mật khẩu xác nhận"
                        onClick={() => setShowConfirmPass(!showConfirmPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        {showConfirmPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isChangingPass}
                    className="w-full h-11 text-xs sm:text-sm font-semibold shadow-sm cursor-pointer mt-2"
                  >
                    <span>Cập nhật mật khẩu</span>
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Thẻ 2: Đổi mã PIN giao dịch 6 số */}
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-3 border-b border-border/60">
                <CardTitle className="text-base flex items-center gap-2">
                  <Lock className="h-4 w-4 text-primary" />
                  <span>Đổi mã PIN giao dịch 6 số</span>
                </CardTitle>
                <CardDescription className="text-xs">
                  Mã PIN bảo mật dùng để xác thực các lệnh Chuyển tiền & Rút tiền ví
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <form onSubmit={handleChangePin} className="space-y-4">
                  {/* Mã PIN hiện tại */}
                  <div className="space-y-1.5">
                    <Label htmlFor="oldPinInput" className="text-xs font-semibold">
                      Mã PIN hiện tại (6 số)
                    </Label>
                    <Input
                      id="oldPinInput"
                      type="password"
                      maxLength={6}
                      value={oldPin}
                      onChange={(e) => setOldPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••••"
                      className="h-11 font-mono tracking-widest text-center text-lg"
                      required
                    />
                  </div>

                  {/* Mã PIN mới */}
                  <div className="space-y-1.5">
                    <Label htmlFor="newPinInput" className="text-xs font-semibold">
                      Mã PIN mới (6 chữ số)
                    </Label>
                    <Input
                      id="newPinInput"
                      type="password"
                      maxLength={6}
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••••"
                      className="h-11 font-mono tracking-widest text-center text-lg"
                      required
                    />
                  </div>

                  {/* Xác nhận mã PIN mới */}
                  <div className="space-y-1.5">
                    <Label htmlFor="confirmPinInput" className="text-xs font-semibold">
                      Xác nhận mã PIN mới
                    </Label>
                    <Input
                      id="confirmPinInput"
                      type="password"
                      maxLength={6}
                      value={confirmPin}
                      onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••••"
                      className="h-11 font-mono tracking-widest text-center text-lg"
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isChangingPin}
                    className="w-full h-11 text-xs sm:text-sm font-semibold shadow-sm cursor-pointer mt-2"
                  >
                    <span>Lưu mã PIN mới</span>
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default ProfilePage
