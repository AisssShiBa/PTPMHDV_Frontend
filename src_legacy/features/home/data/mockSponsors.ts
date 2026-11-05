export interface SponsorAd {
  id: string
  title: string
  subtitle: string
  sponsorName: string
  sponsorLogo?: string
  badgeText: string
  badgeColor?: string
  ctaText: string
  ctaLink: string
  imageUrl: string
  discountCode?: string
}

export const mockSponsorAds: SponsorAd[] = [
  {
    id: 'sponsor-1',
    title: 'Giải pháp Lưu ký Kỹ thuật số Cấp Tổ chức',
    subtitle: 'Nhận ngay gói bảo hiểm tài sản lên đến $100M khi liên kết doanh nghiệp trong tháng này.',
    sponsorName: 'Nexus Global Custody',
    badgeText: 'ĐỐI TÁC CHIẾN LƯỢC',
    badgeColor: 'bg-primary/20 text-primary border-primary/30',
    ctaText: 'Khám phá ngay',
    ctaLink: '#',
    imageUrl: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?auto=format&fit=crop&w=800&q=80',
    discountCode: 'FINVAULT2026',
  },
  {
    id: 'sponsor-2',
    title: 'Thanh toán Quốc tế Miễn phí Phí Giao dịch',
    subtitle: 'Ưu đãi đặc quyền dành cho thành viên FinVault: 0% phí giao dịch cho 50 lệnh đầu tiên.',
    sponsorName: 'SwiftPay Capital',
    badgeText: 'ƯU ĐÃI ĐẶC QUYỀN',
    badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    ctaText: 'Đăng ký nhận ưu đãi',
    ctaLink: '#',
    imageUrl: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=800&q=80',
    discountCode: 'ZEROFEE50',
  },
  {
    id: 'sponsor-3',
    title: 'Phần cứng Bảo mật Độc quyền Thế hệ Mới',
    subtitle: 'Ví lạnh lưu trữ vật lý tích hợp chip mã hóa chuẩn quân đội EAL6+ giảm giá 25%.',
    sponsorName: 'Fortress Secure Tech',
    badgeText: 'TÀI TRỢ CHÍNH',
    badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    ctaText: 'Xem chi tiết',
    ctaLink: '#',
    imageUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&q=80',
    discountCode: 'HARDWARE25',
  },
]
