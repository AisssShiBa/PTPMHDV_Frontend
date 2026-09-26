import { CheckCircle2, Clock3, CircleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { MerchantRecord } from '../types/merchant.types'

const status = {
  PENDING: { label: 'Đang chờ duyệt', description: 'Đăng ký đã được tiếp nhận. Vui lòng chờ kết quả xét duyệt.', icon: Clock3, style: 'text-amber-600' },
  APPROVED: { label: 'Đã được phê duyệt', description: 'Đối tác của bạn đã được phê duyệt và đang hoạt động.', icon: CheckCircle2, style: 'text-emerald-600' },
  REJECTED: { label: 'Đăng ký bị từ chối', description: 'Đăng ký chưa được chấp thuận. Vui lòng liên hệ bộ phận hỗ trợ để được hướng dẫn.', icon: CircleAlert, style: 'text-destructive' }
}

export function MerchantStatusCard({ merchant, onReload }: { merchant: MerchantRecord; onReload: () => void }) {
  const info = status[merchant.status] ?? { label: 'Chưa rõ trạng thái', description: 'Vui lòng thử tải lại thông tin.', icon: CircleAlert, style: 'text-muted-foreground' }
  const Icon = info.icon
  return <Card>
    <CardHeader><CardTitle className={'flex items-center gap-2 ' + info.style}><Icon className="size-5" /><span role="status">{info.label}</span></CardTitle>
      <CardDescription>{info.description}</CardDescription></CardHeader>
    <CardContent className="space-y-6">
      <dl className="grid gap-4 sm:grid-cols-2">
        {([['Tên thương hiệu', merchant.businessName], ['Mã số thuế', merchant.taxId],
          ['Số tài khoản thanh toán', merchant.bankAccount], ['Ngày đăng ký', new Date(merchant.createdAt).toLocaleDateString('vi-VN')]] as const)
          .map(([label, value]) => <div key={label} className="space-y-1">
            <dt className="text-sm text-muted-foreground">{label}</dt><dd className="break-words font-medium">{value || 'Chưa cung cấp'}</dd>
          </div>)}
      </dl>
      <Button variant="outline" onClick={onReload}>Tải lại trạng thái</Button>
    </CardContent>
  </Card>
}
