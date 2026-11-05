import { PageHeader, EmptyState } from '@/components/common'

export function UtilitiesPage() {
  return (
    <PageHeader
      title="Thanh toán & Tiện ích"
      description="Nạp tiền điện thoại và thanh toán hóa đơn điện, nước, internet."
    >
      <EmptyState
        title="Đang xây dựng"
        description="Giao diện trang Thanh toán & Tiện ích đang được thiết lập khung ở các giai đoạn tiếp theo."
      />
    </PageHeader>
  )
}

export default UtilitiesPage
