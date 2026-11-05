import { PageHeader, EmptyState } from '@/components/common'

export function TopupPage() {
  return (
    <PageHeader
      title="Nạp tiền vào ví"
      description="Nạp tiền vào ví qua cổng thanh toán mô phỏng VNPAY."
    >
      <EmptyState
        title="Đang xây dựng"
        description="Giao diện trang Nạp tiền vào ví đang được thiết lập khung ở các giai đoạn tiếp theo."
      />
    </PageHeader>
  )
}

export default TopupPage
