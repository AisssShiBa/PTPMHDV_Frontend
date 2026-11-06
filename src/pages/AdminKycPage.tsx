import { useState } from 'react'
import {
  UserCheck,
  Search,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  ZoomIn,
  Shield,
  Clock,
  BadgeCheck
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import { toast } from 'sonner'

interface KycRecord {
  id: string
  fullName: string
  phone: string
  email: string
  cccdNumber: string
  dateOfBirth: string
  gender: string
  nationality: string
  cardExpiry: string
  appliedTier: 'Cấp 2' | 'Cấp 1'
  submittedAt: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  frontImage: string
  backImage: string
}

const INITIAL_KYC_RECORDS: KycRecord[] = [
  {
    id: 'KYC-98421',
    fullName: 'NGUYỄN VĂN AN',
    phone: '0909 123 456',
    email: 'an.nguyen@email.com',
    cccdNumber: '079093003829',
    dateOfBirth: '15/08/1993',
    gender: 'Nam',
    nationality: 'Việt Nam',
    cardExpiry: '15/08/2033 (Còn hạn)',
    appliedTier: 'Cấp 2',
    submittedAt: 'Hôm nay 10:14',
    status: 'PENDING',
    frontImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
    backImage: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=800&auto=format&fit=crop&q=80'
  },
  {
    id: 'KYC-98420',
    fullName: 'TRẦN THỊ BÍCH',
    phone: '0912 889 102',
    email: 'bich.tran@email.com',
    cccdNumber: '001192004512',
    dateOfBirth: '22/11/1995',
    gender: 'Nữ',
    nationality: 'Việt Nam',
    cardExpiry: '22/11/2035 (Còn hạn)',
    appliedTier: 'Cấp 2',
    submittedAt: 'Hôm nay 09:50',
    status: 'PENDING',
    frontImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
    backImage: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=800&auto=format&fit=crop&q=80'
  },
  {
    id: 'KYC-98419',
    fullName: 'LÊ HOÀNG QUÂN',
    phone: '0988 456 789',
    email: 'quan.le@email.com',
    cccdNumber: '031090008812',
    dateOfBirth: '05/03/1990',
    gender: 'Nam',
    nationality: 'Việt Nam',
    cardExpiry: '05/03/2030 (Còn hạn)',
    appliedTier: 'Cấp 2',
    submittedAt: 'Hôm nay 09:32',
    status: 'PENDING',
    frontImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
    backImage: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=800&auto=format&fit=crop&q=80'
  },
  {
    id: 'KYC-98418',
    fullName: 'PHẠM MINH ĐỨC',
    phone: '0971 621 345',
    email: 'duc.pham@email.com',
    cccdNumber: '038096001290',
    dateOfBirth: '18/07/1996',
    gender: 'Nam',
    nationality: 'Việt Nam',
    cardExpiry: '18/07/2036 (Còn hạn)',
    appliedTier: 'Cấp 1',
    submittedAt: 'Hôm nay 08:45',
    status: 'PENDING',
    frontImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
    backImage: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=800&auto=format&fit=crop&q=80'
  },
  {
    id: 'KYC-98415',
    fullName: 'ĐỖ THÙY TRANG',
    phone: '0934 333 888',
    email: 'trang.do@email.com',
    cccdNumber: '079198007712',
    dateOfBirth: '30/09/1998',
    gender: 'Nữ',
    nationality: 'Việt Nam',
    cardExpiry: '30/09/2038 (Còn hạn)',
    appliedTier: 'Cấp 2',
    submittedAt: 'Hôm qua 18:20',
    status: 'PENDING',
    frontImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
    backImage: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=800&auto=format&fit=crop&q=80'
  }
]

export function AdminKycPage() {
  const [records, setRecords] = useState<KycRecord[]>(INITIAL_KYC_RECORDS)
  const [selectedId, setSelectedId] = useState<string>('KYC-98421')
  const [searchQuery, setSearchQuery] = useState('')
  const [showFullCccd, setShowFullCccd] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [auditorNote, setAuditorNote] = useState(
    'Hình ảnh CCCD 2 mặt rõ nét, đầy đủ góc cạnh, thông tin trùng khớp hoàn toàn. Đủ điều kiện phê duyệt nâng Cấp 2 hạn mức giao dịch 100.000.000 ₫/ngày.'
  )

  // Zoom Image modal state
  const [zoomModalOpen, setZoomModalOpen] = useState(false)
  const [zoomedImageUrl, setZoomedImageUrl] = useState('')
  const [zoomedImageTitle, setZoomedImageTitle] = useState('')

  const activeRecord = records.find((r) => r.id === selectedId) || records[0]

  // Tìm kiếm hồ sơ
  const filteredRecords = records.filter(
    (r) =>
      r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.cccdNumber.includes(searchQuery) ||
      r.phone.includes(searchQuery)
  )

  // Đếm hồ sơ chờ duyệt
  const pendingCount = records.filter((r) => r.status === 'PENDING').length

  // Phê duyệt hồ sơ
  const handleApprove = () => {
    if (!activeRecord) return
    setRecords((prev) =>
      prev.map((r) => (r.id === activeRecord.id ? { ...r, status: 'APPROVED' } : r))
    )
    toast.success(`Đã phê duyệt hồ sơ #${activeRecord.id} thành công!`, {
      description: `Khách hàng ${activeRecord.fullName} đã được nâng cấp lên ${activeRecord.appliedTier} với hạn mức 100.000.000 ₫/ngày.`
    })
  }

  // Từ chối hồ sơ
  const handleReject = () => {
    if (!activeRecord) return
    if (!rejectionReason.trim()) {
      toast.error('Vui lòng chọn hoặc nhập lý do từ chối hồ sơ')
      return
    }
    setRecords((prev) =>
      prev.map((r) => (r.id === activeRecord.id ? { ...r, status: 'REJECTED' } : r))
    )
    toast.error(`Đã từ chối hồ sơ #${activeRecord.id}`, {
      description: `Lý do: "${rejectionReason}" đã được gửi thông báo tới khách hàng ${activeRecord.fullName}.`
    })
  }

  // Mở modal phóng to ảnh
  const handleOpenZoom = (imageUrl: string, title: string) => {
    setZoomedImageUrl(imageUrl)
    setZoomedImageTitle(title)
    setZoomModalOpen(true)
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header & Tiêu đề thẩm định */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge className="bg-primary hover:bg-primary/90 text-primary-foreground border-none font-bold text-xs gap-1">
              <UserCheck className="h-3.5 w-3.5" />
              KYC VERIFICATION
            </Badge>
            <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-none text-xs font-semibold gap-1">
              <Clock className="h-3.5 w-3.5" />
              <span>{pendingCount} hồ sơ chờ duyệt</span>
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Phê duyệt Định danh Khách hàng (KYC Cấp 2)
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            Kiểm tra đối chiếu ảnh CCCD 2 mặt, thông tin cá nhân và ra quyết định cấp hạn mức giao dịch ví điện tử.
          </p>
        </div>
      </div>

      {/* Grid 2 Cột chuẩn thiết kế Stitch (Left: 5 cột Danh sách | Right: 7 cột Thẩm định chi tiết) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ======================================================== */}
        {/* CỘT TRÁI: DANH SÁCH HÀNG ĐỢI HỒ SƠ KYC (5 CỘT)          */}
        {/* ======================================================== */}
        <Card className="lg:col-span-5 border-border shadow-xs overflow-hidden">
          <CardHeader className="pb-3 border-b border-border/60 bg-muted/30">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-foreground">Hàng đợi thẩm định</CardTitle>
                <CardDescription className="text-xs">Chọn hồ sơ để đối chiếu thông tin</CardDescription>
              </div>
              <Badge variant="outline" className="text-xs font-semibold font-mono text-primary border-primary/30">
                {filteredRecords.length} hồ sơ
              </Badge>
            </div>

            {/* Ô tìm kiếm nhanh */}
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm mã hồ sơ, họ tên, CCCD..."
                className="w-full h-9 pl-9 pr-3 rounded-xl border border-input bg-card text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </CardHeader>

          {/* Bảng danh sách hồ sơ */}
          <CardContent className="p-0 divide-y divide-border/60 max-h-[620px] overflow-y-auto">
            {filteredRecords.map((item) => {
              const isSelected = item.id === activeRecord?.id
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    setSelectedId(item.id)
                    setShowFullCccd(false)
                  }}
                  className={`p-3.5 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-primary/10 border-l-4 border-primary'
                      : 'hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {item.fullName.split(' ').slice(-1)[0][0]}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs sm:text-sm text-foreground truncate">
                          {item.fullName}
                        </span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/30 text-primary">
                          {item.appliedTier}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 font-mono truncate">
                        #{item.id} • {item.phone}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    {item.status === 'PENDING' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        Chờ duyệt
                      </span>
                    ) : item.status === 'APPROVED' ? (
                      <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-none text-[10px] font-semibold">
                        Đã duyệt
                      </Badge>
                    ) : (
                      <Badge className="bg-destructive/15 text-destructive border-none text-[10px] font-semibold">
                        Từ chối
                      </Badge>
                    )}
                    <span className="text-[10px] text-muted-foreground block mt-1">{item.submittedAt}</span>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* ======================================================== */}
        {/* CỘT PHẢI: KHUNG ĐỐI CHIẾU & RA QUYẾT ĐỊNH (7 CỘT)       */}
        {/* ======================================================== */}
        <Card className="lg:col-span-7 border-border shadow-xs overflow-hidden">
          <CardHeader className="pb-3 border-b border-border/60 bg-muted/30">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                  {activeRecord.fullName.slice(0, 2)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base sm:text-lg font-bold text-foreground">
                      {activeRecord.fullName}
                    </CardTitle>
                    <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-none text-xs font-semibold">
                      Yêu cầu: Nâng {activeRecord.appliedTier}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    Mã hồ sơ: <strong className="text-foreground font-mono">#{activeRecord.id}</strong> • Thời gian gửi: {activeRecord.submittedAt}
                  </CardDescription>
                </div>
              </div>

              {activeRecord.status === 'APPROVED' ? (
                <Badge className="bg-emerald-600 text-white font-bold text-xs py-1 px-3">
                  HỒ SƠ ĐÃ PHÊ DUYỆT
                </Badge>
              ) : activeRecord.status === 'REJECTED' ? (
                <Badge variant="destructive" className="font-bold text-xs py-1 px-3">
                  HỒ SƠ ĐÃ BỊ TỪ CHỐI
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs font-semibold text-primary border-primary/30 gap-1">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  Đang thẩm định
                </Badge>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-5 space-y-6">
            {/* PHẦN 1: DỮ LIỆU ĐỊNH DANH BÓC TÁCH */}
            <div className="p-4 rounded-2xl bg-muted/40 border border-border space-y-3">
              <div className="flex items-center justify-between">
                <strong className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                  <Shield className="h-4 w-4 text-primary" />
                  Thông tin CCCD gắn chip
                </strong>
                <button
                  type="button"
                  onClick={() => setShowFullCccd(!showFullCccd)}
                  className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                >
                  {showFullCccd ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  <span>{showFullCccd ? 'Ẩn số CCCD' : 'Xem đầy đủ số CCCD'}</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs pt-1">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Họ và tên:</span>
                  <strong className="text-foreground text-sm font-bold">{activeRecord.fullName}</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Số CCCD:</span>
                  <strong className="text-foreground font-mono text-sm font-bold">
                    {showFullCccd ? activeRecord.cccdNumber : `********${activeRecord.cccdNumber.slice(-4)}`}
                  </strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Ngày sinh:</span>
                  <span className="text-foreground font-medium">{activeRecord.dateOfBirth}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Giới tính:</span>
                  <span className="text-foreground font-medium">{activeRecord.gender}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs pt-2 border-t border-border/60">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Số điện thoại:</span>
                  <span className="text-foreground font-mono font-medium">{activeRecord.phone}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Email liên kết:</span>
                  <span className="text-foreground font-medium truncate block">{activeRecord.email}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Quốc tịch:</span>
                  <span className="text-foreground font-medium">{activeRecord.nationality}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Hạn sử dụng thẻ:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{activeRecord.cardExpiry}</span>
                </div>
              </div>
            </div>

            {/* PHẦN 2: SO SÁNH ẢNH CCCD MẶT TRƯỚC VÀ MẶT SAU */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <strong className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Tài liệu ảnh chụp thực tế (2 mặt CCCD):
                </strong>
                <span className="text-[11px] text-muted-foreground">Nhấn vào ảnh để phóng to kiểm tra</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Ảnh mặt trước */}
                <div className="p-3 rounded-2xl bg-muted/30 border border-border space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">Ảnh CCCD Mặt trước</span>
                    <span className="text-[10px] text-emerald-600 font-semibold">Rõ nét, đủ 4 góc</span>
                  </div>
                  <div
                    onClick={() => handleOpenZoom(activeRecord.frontImage, 'Ảnh CCCD Mặt trước')}
                    className="relative rounded-xl overflow-hidden border border-border h-44 bg-muted flex items-center justify-center cursor-pointer group"
                  >
                    <img
                      src={activeRecord.frontImage}
                      alt="CCCD mặt trước"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-1.5 text-xs font-semibold">
                      <ZoomIn className="h-4 w-4" />
                      <span>Phóng to</span>
                    </div>
                  </div>
                </div>

                {/* Ảnh mặt sau */}
                <div className="p-3 rounded-2xl bg-muted/30 border border-border space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">Ảnh CCCD Mặt sau (Chip)</span>
                    <span className="text-[10px] text-emerald-600 font-semibold">Có chip điện tử</span>
                  </div>
                  <div
                    onClick={() => handleOpenZoom(activeRecord.backImage, 'Ảnh CCCD Mặt sau')}
                    className="relative rounded-xl overflow-hidden border border-border h-44 bg-muted flex items-center justify-center cursor-pointer group"
                  >
                    <img
                      src={activeRecord.backImage}
                      alt="CCCD mặt sau"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-1.5 text-xs font-semibold">
                      <ZoomIn className="h-4 w-4" />
                      <span>Phóng to</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* PHẦN 3: GHI CHÚ KIỂM SOÁT VIÊN & LÝ DO TỪ CHỐI */}
            <div className="space-y-3 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground block">
                  Ghi chú thẩm định nội bộ:
                </label>
                <textarea
                  value={auditorNote}
                  onChange={(e) => setAuditorNote(e.target.value)}
                  rows={2}
                  className="w-full p-3 rounded-xl border border-input bg-card text-xs focus:ring-1 focus:ring-primary outline-none"
                  placeholder="Nhập ghi chú cho kiểm soát viên khác..."
                />
              </div>

              {/* Chọn lý do từ chối mẫu */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-destructive block">
                  Lý do từ chối (bắt buộc nếu bấm Từ chối):
                </label>
                <div className="flex gap-2 flex-col sm:flex-row">
                  <select
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="h-10 px-3 rounded-xl border border-input bg-card text-xs font-semibold focus:ring-1 focus:ring-destructive outline-none cursor-pointer flex-1"
                  >
                    <option value="">-- Chọn lý do mẫu nếu từ chối --</option>
                    <option value="Ảnh chụp bị mờ, lóa ánh sáng không rõ số CCCD">Ảnh chụp bị mờ, lóa ánh sáng không rõ số CCCD</option>
                    <option value="Mất góc, bị che khuất một phần viền thẻ căn cước">Mất góc, bị che khuất một phần viền thẻ căn cước</option>
                    <option value="Thông tin họ tên hoặc ngày sinh không khớp với ảnh CCCD">Thông tin họ tên hoặc ngày sinh không khớp với ảnh CCCD</option>
                    <option value="Thẻ CCCD đã hết thời hạn sử dụng theo quy định">Thẻ CCCD đã hết thời hạn sử dụng theo quy định</option>
                    <option value="Ảnh chụp lại từ màn hình thiết bị khác hoặc nghi ngờ chỉnh sửa">Ảnh chụp lại từ màn hình thiết bị khác hoặc nghi ngờ chỉnh sửa</option>
                  </select>

                  <input
                    type="text"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Hoặc tự nhập lý do cụ thể..."
                    className="h-10 px-3 rounded-xl border border-input bg-card text-xs flex-1 focus:outline-none focus:ring-1 focus:ring-destructive"
                  />
                </div>
              </div>
            </div>

            {/* PHẦN 4: NÚT RA QUYẾT ĐỊNH (APPROVE / REJECT) */}
            <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                disabled={activeRecord.status !== 'PENDING'}
                onClick={handleReject}
                className="w-full sm:w-auto h-11 px-6 text-xs font-bold text-destructive border-destructive/40 hover:bg-destructive/10 gap-1.5 cursor-pointer"
              >
                <XCircle className="h-4 w-4" />
                <span>Từ chối hồ sơ</span>
              </Button>

              <Button
                type="button"
                disabled={activeRecord.status !== 'PENDING'}
                onClick={handleApprove}
                className="w-full sm:w-auto h-11 px-8 text-xs sm:text-sm font-bold gap-2 shadow-xs cursor-pointer"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Phê duyệt & Nâng Cấp 2</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* MODAL PHÓNG TO ẢNH CCCD */}
      <Dialog open={zoomModalOpen} onOpenChange={setZoomModalOpen}>
        <DialogContent className="max-w-2xl p-6">
          <DialogHeader className="text-left space-y-1">
            <DialogTitle className="text-base font-bold">{zoomedImageTitle}</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Kiểm tra tính nguyên vẹn, góc cạnh và số CCCD chi tiết của khách hàng #{activeRecord?.id}
            </DialogDescription>
          </DialogHeader>

          <div className="my-3 rounded-2xl overflow-hidden border border-border bg-black/90 flex items-center justify-center p-2">
            <img
              src={zoomedImageUrl}
              alt="Ảnh phóng to"
              className="max-h-[460px] w-auto object-contain rounded-lg"
            />
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setZoomModalOpen(false)}
              className="text-xs font-semibold cursor-pointer"
            >
              Đóng cửa sổ
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default AdminKycPage
