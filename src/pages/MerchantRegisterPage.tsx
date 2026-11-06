import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Building2,
  Store,
  CreditCard,
  UploadCloud,
  CheckCircle2,
  Clock,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  FileText,
  AlertCircle,
  FileCheck,
  Check
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

type Step = 1 | 2 | 3 | 'SUCCESS'

const POPULAR_BANKS = [
  { code: 'VCB', name: 'Ngân hàng Ngoại Thương (Vietcombank)' },
  { code: 'MB', name: 'Ngân hàng Quân Đội (MB Bank)' },
  { code: 'TCB', name: 'Ngân hàng Kỹ Thương (Techcombank)' },
  { code: 'BIDV', name: 'Ngân hàng Đầu tư & Phát triển (BIDV)' },
  { code: 'CTG', name: 'Ngân hàng Công Thương (VietinBank)' },
  { code: 'ACB', name: 'Ngân hàng Á Châu (ACB)' }
]

export function MerchantRegisterPage() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState<Step>(1)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Dữ liệu Form đăng ký
  const [businessType, setBusinessType] = useState<'COMPANY' | 'HOUSEHOLD'>('COMPANY')
  const [brandName, setBrandName] = useState('Highlands Coffee')
  const [taxCode, setTaxCode] = useState('0303882910')
  const [representativeName, setRepresentativeName] = useState('Nguyễn Văn Bảo')
  const [phone, setPhone] = useState('0908882910')
  const [email, setEmail] = useState('contact@highlandscoffee.com.vn')
  const [address, setAddress] = useState('180-192 Nguyễn Công Trứ, Phường Nguyễn Thái Bình, Quận 1, TP. Hồ Chí Minh')

  // Tài khoản quyết toán ngân hàng
  const [bankCode, setBankCode] = useState('VCB')
  const [accountNumber, setAccountNumber] = useState('0071001234567')
  const [accountHolder, setAccountHolder] = useState('CTY CP DICH VU CA PHE CAO NGUYEN')

  // Giấy tờ chứng từ
  const [licenseUploaded, setLicenseUploaded] = useState(true)
  const [storePhotoUploaded, setStorePhotoUploaded] = useState(true)
  const [termsAccepted, setTermsAccepted] = useState(true)

  // Điều hướng bước 1 -> 2
  const handleProceedToStep2 = (e: React.FormEvent) => {
    e.preventDefault()
    if (!brandName.trim() || !taxCode.trim() || !representativeName.trim() || !phone.trim() || !email.trim()) {
      toast.error('Vui lòng điền đầy đủ các thông tin pháp lý bắt buộc')
      return
    }
    setCurrentStep(2)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Điều hướng bước 2 -> 3
  const handleProceedToStep3 = (e: React.FormEvent) => {
    e.preventDefault()
    if (!accountNumber.trim() || !accountHolder.trim()) {
      toast.error('Vui lòng nhập số tài khoản và tên chủ tài khoản thụ hưởng')
      return
    }
    setCurrentStep(3)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Gửi hồ sơ đăng ký thẩm định
  const handleSubmitRegistration = () => {
    if (!termsAccepted) {
      toast.error('Vui lòng đọc và tích chọn đồng ý với Điều khoản Cổng thanh toán FinVault')
      return
    }

    setIsSubmitting(true)
    setTimeout(() => {
      setIsSubmitting(false)
      setCurrentStep('SUCCESS')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      toast.success('Hồ sơ đối tác đã gửi thành công!', {
        description: 'Mã hồ sơ FV-MCH-20261106-992 đang được Admin FinVault tiếp nhận thẩm định.'
      })
    }, 1200)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Nút quay lại */}
      <div className="flex items-center justify-between">
        <Button asChild variant="outline" className="h-10 text-xs font-semibold gap-1.5 cursor-pointer">
          <Link to="/merchant">
            <ArrowLeft className="h-4 w-4" />
            <span>Cổng đối tác FinVault</span>
          </Link>
        </Button>

        <Badge variant="outline" className="text-xs text-primary border-primary/30 font-semibold gap-1">
          <ShieldCheck className="h-3.5 w-3.5" />
          Hồ sơ đăng ký bảo mật
        </Badge>
      </div>

      {/* Header tiêu đề */}
      <div className="space-y-1.5">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
          Đăng ký mở Cổng thanh toán Đối tác
        </h1>
        <p className="text-sm text-muted-foreground">
          Chấp nhận thanh toán bằng ví điện tử FinVault & VietQR tại quầy thu ngân hoặc tích hợp website bán hàng.
        </p>
      </div>

      {/* Thanh tiến trình Stepper (Chỉ hiển thị khi đang trong bước 1, 2, 3) */}
      {currentStep !== 'SUCCESS' && (
        <div className="grid grid-cols-3 gap-2 sm:gap-4 p-3 bg-muted/40 rounded-2xl border border-border">
          {/* Bước 1 */}
          <div
            className={`flex items-center gap-2 p-2 rounded-xl transition-colors ${
              currentStep === 1
                ? 'bg-card shadow-xs border border-border font-bold text-primary'
                : currentStep > 1
                ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                : 'text-muted-foreground'
            }`}
          >
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                currentStep === 1
                  ? 'bg-primary text-primary-foreground'
                  : currentStep > 1
                  ? 'bg-emerald-500/15 text-emerald-600'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {currentStep > 1 ? <Check className="h-4 w-4" /> : '1'}
            </div>
            <div className="hidden sm:block text-xs leading-tight">
              <span className="block font-semibold">Bước 1</span>
              <span className="text-[11px] text-muted-foreground font-normal">Thông tin kinh doanh</span>
            </div>
          </div>

          {/* Bước 2 */}
          <div
            className={`flex items-center gap-2 p-2 rounded-xl transition-colors ${
              currentStep === 2
                ? 'bg-card shadow-xs border border-border font-bold text-primary'
                : currentStep > 2
                ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                : 'text-muted-foreground'
            }`}
          >
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                currentStep === 2
                  ? 'bg-primary text-primary-foreground'
                  : currentStep > 2
                  ? 'bg-emerald-500/15 text-emerald-600'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {currentStep > 2 ? <Check className="h-4 w-4" /> : '2'}
            </div>
            <div className="hidden sm:block text-xs leading-tight">
              <span className="block font-semibold">Bước 2</span>
              <span className="text-[11px] text-muted-foreground font-normal">Tài khoản quyết toán</span>
            </div>
          </div>

          {/* Bước 3 */}
          <div
            className={`flex items-center gap-2 p-2 rounded-xl transition-colors ${
              currentStep === 3
                ? 'bg-card shadow-xs border border-border font-bold text-primary'
                : 'text-muted-foreground'
            }`}
          >
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                currentStep === 3
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              3
            </div>
            <div className="hidden sm:block text-xs leading-tight">
              <span className="block font-semibold">Bước 3</span>
              <span className="text-[11px] text-muted-foreground font-normal">Xác thực & Gửi duyệt</span>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* BƯỚC 1: THÔNG TIN PHÁP LÝ & ĐIỂM BÁN KINH DOANH          */}
      {/* ======================================================== */}
      {currentStep === 1 && (
        <Card className="border-border shadow-xs animate-in fade-in-50 duration-200">
          <CardHeader className="pb-4 border-b border-border/60">
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <span>Bước 1: Thông tin pháp lý & Điểm bán kinh doanh</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Thông tin sẽ được dùng để ký kết thỏa thuận đối tác thương mại điện tử với FinVault
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleProceedToStep2} className="space-y-5">
              {/* Chọn loại hình kinh doanh */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Loại hình kinh doanh</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div
                    onClick={() => setBusinessType('COMPANY')}
                    className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                      businessType === 'COMPANY'
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                        : 'border-border hover:bg-muted/40'
                    }`}
                  >
                    <div className="p-2 rounded-lg bg-primary/10 text-primary mt-0.5">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div>
                      <strong className="text-sm font-bold block text-foreground">Doanh nghiệp / Công ty</strong>
                      <span className="text-xs text-muted-foreground">Có Giấy chứng nhận ĐKKD và Mã số thuế công ty</span>
                    </div>
                  </div>

                  <div
                    onClick={() => setBusinessType('HOUSEHOLD')}
                    className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                      businessType === 'HOUSEHOLD'
                        ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                        : 'border-border hover:bg-muted/40'
                    }`}
                  >
                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 mt-0.5">
                      <Store className="h-4 w-4" />
                    </div>
                    <div>
                      <strong className="text-sm font-bold block text-foreground">Hộ kinh doanh cá thể</strong>
                      <span className="text-xs text-muted-foreground">Cửa hàng, quán ăn, quán cà phê cá nhân kinh doanh</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tên thương hiệu & Mã số thuế */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="brandName" className="text-xs font-semibold">
                    Tên thương hiệu hiển thị <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="brandName"
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    placeholder="VD: Highlands Coffee"
                    className="h-11 text-xs sm:text-sm font-semibold"
                    required
                  />
                  <span className="text-[11px] text-muted-foreground">Tên này sẽ in trên Standee QR và màn hình thanh toán của khách</span>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="taxCode" className="text-xs font-semibold">
                    Mã số thuế / Số ĐKKD <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="taxCode"
                    value={taxCode}
                    onChange={(e) => setTaxCode(e.target.value)}
                    placeholder="VD: 0303882910"
                    className="h-11 text-xs sm:text-sm font-mono font-bold"
                    required
                  />
                </div>
              </div>

              {/* Người đại diện & Điện thoại */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="repName" className="text-xs font-semibold">
                    Họ và tên người đại diện pháp luật <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="repName"
                    value={representativeName}
                    onChange={(e) => setRepresentativeName(e.target.value)}
                    placeholder="VD: Nguyễn Văn Bảo"
                    className="h-11 text-xs sm:text-sm"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-xs font-semibold">
                    Số điện thoại liên hệ <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="VD: 0908882910"
                    className="h-11 text-xs sm:text-sm font-mono"
                    required
                  />
                </div>
              </div>

              {/* Email & Địa chỉ trụ sở */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold">
                  Email nhận thông báo kết quả đối soát T+1 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="VD: contact@highlandscoffee.com.vn"
                  className="h-11 text-xs sm:text-sm"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="address" className="text-xs font-semibold">
                  Địa chỉ điểm bán / Trụ sở kinh doanh chính <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Địa chỉ số nhà, đường, phường, quận/huyện, tỉnh/thành"
                  className="h-11 text-xs sm:text-sm"
                  required
                />
              </div>

              <div className="pt-4 flex justify-end">
                <Button type="submit" className="h-11 px-6 text-xs sm:text-sm font-semibold gap-2 shadow-xs cursor-pointer">
                  <span>Tiếp tục: Tài khoản quyết toán</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ======================================================== */}
      {/* BƯỚC 2: TÀI KHOẢN NGÂN HÀNG QUYẾT TOÁN (SETTLEMENT)       */}
      {/* ======================================================== */}
      {currentStep === 2 && (
        <Card className="border-border shadow-xs animate-in fade-in-50 duration-200">
          <CardHeader className="pb-4 border-b border-border/60">
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <span>Bước 2: Tài khoản ngân hàng nhận tiền quyết toán (Settlement)</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Doanh thu thu hộ sau khi trừ phí dịch vụ 1% sẽ được hệ thống FinVault tự động chuyển về tài khoản này vào 09:00 sáng mỗi ngày làm việc (T+1)
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleProceedToStep3} className="space-y-5">
              {/* Chọn ngân hàng */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Ngân hàng thụ hưởng <span className="text-destructive">*</span>
                </Label>
                <select
                  value={bankCode}
                  onChange={(e) => setBankCode(e.target.value)}
                  className="w-full h-11 px-3 rounded-xl border border-input bg-card text-xs sm:text-sm font-semibold focus:ring-2 focus:ring-primary/20 outline-none cursor-pointer"
                >
                  {POPULAR_BANKS.map((b) => (
                    <option key={b.code} value={b.code}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Số tài khoản & Tên chủ tài khoản */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="accountNumber" className="text-xs font-semibold">
                    Số tài khoản ngân hàng <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="accountNumber"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="VD: 0071001234567"
                    className="h-11 text-xs sm:text-sm font-mono font-bold"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="accountHolder" className="text-xs font-semibold">
                    Tên chủ tài khoản (In hoa không dấu) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="accountHolder"
                    value={accountHolder}
                    onChange={(e) => setAccountHolder(e.target.value.toUpperCase())}
                    placeholder="VD: CTY CP DICH VU CA PHE CAO NGUYEN"
                    className="h-11 text-xs sm:text-sm font-mono font-bold uppercase"
                    required
                  />
                  <span className="text-[11px] text-muted-foreground">Tên phải trùng khớp với tên trên Giấy chứng nhận ĐKKD</span>
                </div>
              </div>

              {/* Hộp thông tin chính sách quyết toán */}
              <div className="p-4 rounded-2xl bg-muted/50 border border-border space-y-2 text-xs">
                <strong className="text-foreground flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-primary" />
                  Quy trình quyết toán tự động của FinVault:
                </strong>
                <ul className="space-y-1 text-muted-foreground list-disc list-inside">
                  <li><strong>Chu kỳ đối soát:</strong> T+1 (Tiền giao dịch của ngày hôm nay sẽ được thanh toán vào sáng ngày làm việc kế tiếp).</li>
                  <li><strong>Biểu phí xử lý giao dịch:</strong> 1% giá trị giao dịch thành công (đã bao gồm VAT, không phí duy trì hàng tháng).</li>
                  <li><strong>Hạn mức quyết toán tự động:</strong> Tối đa 2.000.000.000 ₫ / ngày đối với Doanh nghiệp xác thực.</li>
                </ul>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentStep(1)}
                  className="h-11 px-5 text-xs font-semibold gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Quay lại Bước 1</span>
                </Button>

                <Button type="submit" className="h-11 px-6 text-xs sm:text-sm font-semibold gap-2 shadow-xs cursor-pointer">
                  <span>Tiếp tục: Xác thực tài liệu</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ======================================================== */}
      {/* BƯỚC 3: XÁC THỰC TÀI LIỆU & GỬI DUYỆT                     */}
      {/* ======================================================== */}
      {currentStep === 3 && (
        <Card className="border-border shadow-xs animate-in fade-in-50 duration-200">
          <CardHeader className="pb-4 border-b border-border/60">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileCheck className="h-5 w-5 text-primary" />
              <span>Bước 3: Tải chứng từ & Hoàn tất gửi duyệt</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Vui lòng tải lên tài liệu xác thực kinh doanh để chuyên viên FinVault tiến hành thẩm định
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Giấy phép kinh doanh */}
              <div className="p-4 rounded-2xl border border-dashed border-border hover:border-primary/50 transition-colors flex flex-col items-center text-center space-y-2">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <UploadCloud className="h-5 w-5" />
                </div>
                <strong className="text-sm font-bold text-foreground">Giấy phép ĐKKD / MST</strong>
                <p className="text-xs text-muted-foreground">Định dạng JPG, PNG hoặc PDF dung lượng tối đa 5MB</p>
                {licenseUploaded ? (
                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-none text-[11px] font-semibold gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Đã đính kèm: GPKD_Highlands_2026.pdf
                  </Badge>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLicenseUploaded(true)}
                    className="h-9 text-xs font-semibold cursor-pointer"
                  >
                    Tải lên tài liệu
                  </Button>
                )}
              </div>

              {/* Ảnh chụp điểm bán */}
              <div className="p-4 rounded-2xl border border-dashed border-border hover:border-primary/50 transition-colors flex flex-col items-center text-center space-y-2">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Store className="h-5 w-5" />
                </div>
                <strong className="text-sm font-bold text-foreground">Ảnh Điểm bán / Biển hiệu</strong>
                <p className="text-xs text-muted-foreground">Ảnh chụp rõ nét mặt tiền cửa hàng hoặc quầy thu ngân</p>
                {storePhotoUploaded ? (
                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-none text-[11px] font-semibold gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Đã đính kèm: Diem_Ban_Ham_Nghi.jpg
                  </Badge>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStorePhotoUploaded(true)}
                    className="h-9 text-xs font-semibold cursor-pointer"
                  >
                    Tải lên hình ảnh
                  </Button>
                )}
              </div>
            </div>

            {/* Bảng tóm tắt thông tin đăng ký */}
            <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-3">
              <strong className="text-xs font-bold text-foreground uppercase tracking-wider block">
                Tóm tắt hồ sơ đối tác:
              </strong>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Tên thương hiệu:</span>{' '}
                  <strong className="text-foreground">{brandName}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Loại hình:</span>{' '}
                  <strong className="text-foreground">{businessType === 'COMPANY' ? 'Doanh nghiệp' : 'Hộ kinh doanh'}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground">Mã số thuế:</span>{' '}
                  <span className="font-mono font-bold text-foreground">{taxCode}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Người đại diện:</span>{' '}
                  <strong className="text-foreground">{representativeName}</strong>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-muted-foreground">Tài khoản quyết toán:</span>{' '}
                  <strong className="text-foreground">{accountHolder}</strong> ({bankCode} - {accountNumber})
                </div>
              </div>
            </div>

            {/* Checkbox điều khoản */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-primary/5 border border-primary/20">
              <input
                id="terms"
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
              />
              <Label htmlFor="terms" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
                Tôi cam kết thông tin cung cấp là chính xác, hợp pháp và hoàn toàn chịu trách nhiệm trước pháp luật. Tôi đồng ý với <strong>Điều khoản dịch vụ Cổng thanh toán FinVault</strong> và biểu phí xử lý giao dịch 1%.
              </Label>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep(2)}
                className="h-11 px-5 text-xs font-semibold gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Quay lại Bước 2</span>
              </Button>

              <Button
                type="button"
                disabled={isSubmitting}
                onClick={handleSubmitRegistration}
                className="h-11 px-6 text-xs sm:text-sm font-semibold gap-2 shadow-xs cursor-pointer"
              >
                {isSubmitting ? (
                  <span>Đang mã hóa & gửi hồ sơ...</span>
                ) : (
                  <>
                    <FileText className="h-4 w-4" />
                    <span>Gửi hồ sơ thẩm định</span>
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ======================================================== */}
      {/* MÀN HÌNH HOÀN TẤT & THÔNG BÁO TIẾP NHẬN HỒ SƠ            */}
      {/* ======================================================== */}
      {currentStep === 'SUCCESS' && (
        <Card className="border-border shadow-md animate-in zoom-in-95 duration-300">
          <CardContent className="p-8 sm:p-12 flex flex-col items-center text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center ring-8 ring-emerald-500/10">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div className="space-y-2 max-w-lg">
              <Badge className="bg-primary hover:bg-primary/90 text-primary-foreground border-none font-bold text-xs py-1 px-3">
                MÃ HỒ SƠ: FV-MCH-20261106-992
              </Badge>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                Hồ sơ đối tác đã gửi thẩm định thành công!
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Đội ngũ kiểm duyệt Doanh nghiệp của FinVault đã tiếp nhận hồ sơ của <strong className="text-foreground">{brandName}</strong>. Kết quả thẩm định sẽ được gửi qua email trong vòng <strong>24 giờ làm việc</strong>.
              </p>
            </div>

            {/* Trạng thái tiến trình thẩm định */}
            <div className="w-full max-w-md p-4 rounded-2xl bg-muted/50 border border-border text-left space-y-3">
              <strong className="text-xs font-bold text-foreground uppercase tracking-wider block">
                Tiến trình xử lý hồ sơ:
              </strong>
              <div className="space-y-3 text-xs">
                <div className="flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>1. Tiếp nhận hồ sơ điện tử (Đã hoàn thành)</span>
                </div>
                <div className="flex items-center gap-2.5 text-amber-600 dark:text-amber-400 font-semibold">
                  <Clock className="h-4 w-4 shrink-0 animate-spin" />
                  <span>2. Kiểm tra tính xác thực GPKD & Điểm bán (Đang xử lý)</span>
                </div>
                <div className="flex items-center gap-2.5 text-muted-foreground">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>3. Cấp cặp khóa API Key & Standee QR quầy thu ngân</span>
                </div>
              </div>
            </div>

            {/* Các nút hành động */}
            <div className="pt-2 flex flex-col sm:flex-row gap-3 w-full max-w-md">
              <Button
                type="button"
                onClick={() => navigate('/merchant')}
                className="flex-1 h-11 text-xs sm:text-sm font-semibold shadow-xs cursor-pointer"
              >
                Vào Cổng quản lý Đối tác (Demo)
              </Button>
              <Button asChild variant="outline" className="flex-1 h-11 text-xs sm:text-sm font-semibold cursor-pointer">
                <Link to="/app">Về Trang chủ Ví cá nhân</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default MerchantRegisterPage
