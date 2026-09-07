import {
  Building2,
  TrendingUp,
  ShieldCheck,
  Globe,
  Zap,
  BarChart3,
  ShieldAlert,
} from 'lucide-react'

export interface TrustedBrand {
  name: string
  icon: typeof Building2
}

export const trustedBrands: TrustedBrand[] = [
  { name: 'GlobalBank', icon: Building2 },
  { name: 'InvestCorp', icon: TrendingUp },
  { name: 'SecureTrust', icon: ShieldCheck },
  { name: 'NexusFin', icon: Globe },
]

export interface EcosystemFeature {
  id: string
  icon: typeof Zap
  iconContainerClass: string
  iconClass: string
  hoverBorderClass: string
  title: string
  description: string
  colSpanClass: string
  hasWorldMap?: boolean
}

export const ecosystemFeatures: EcosystemFeature[] = [
  {
    id: 'speed-payment',
    icon: Zap,
    iconContainerClass: 'bg-violet-500/15 text-primary ring-primary/20',
    iconClass: 'fill-primary/30 text-primary',
    hoverBorderClass: 'hover:border-primary/50 hover:shadow-primary/5',
    title: 'Thanh toán Siêu tốc',
    description:
      'Xử lý hàng triệu giao dịch mỗi giây với độ trễ gần như bằng không. Chuyển đổi và định tuyến tối ưu xuyên biên giới.',
    colSpanClass: 'md:col-span-6',
  },
  {
    id: 'military-security',
    icon: ShieldAlert,
    iconContainerClass: 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/20',
    iconClass: 'fill-emerald-500/20 text-emerald-400',
    hoverBorderClass: 'hover:border-emerald-500/50 hover:shadow-emerald-500/5',
    title: 'Bảo mật Cấp Quốc phòng',
    description:
      'Mã hóa đầu cuối 256-bit và kho lưu trữ lạnh định kỳ bảo vệ toàn bộ tài sản tuyệt đối.',
    colSpanClass: 'md:col-span-6',
  },
  {
    id: 'deep-analytics',
    icon: BarChart3,
    iconContainerClass: 'bg-blue-500/15 text-blue-400 ring-blue-500/20',
    iconClass: 'text-blue-400',
    hoverBorderClass: 'hover:border-blue-500/50 hover:shadow-blue-500/5',
    title: 'Phân tích Chuyên sâu',
    description:
      'AI dự phòng dòng tiền và theo dõi danh mục đầu tư theo thời gian thực.',
    colSpanClass: 'md:col-span-5',
  },
  {
    id: 'global-reach',
    icon: Globe,
    iconContainerClass: 'bg-muted text-foreground ring-border',
    iconClass: 'text-foreground',
    hoverBorderClass: 'hover:border-primary/50',
    title: 'Khả năng Tiếp cận Toàn cầu',
    description:
      'Hỗ trợ 150+ loại tiền tệ fiat và tài sản số hóa. Mạng lưới thanh khoản sâu rộng kết nối trực tiếp với các trung tâm tài chính lớn nhất thế giới.',
    colSpanClass: 'md:col-span-7',
    hasWorldMap: true,
  },
]
