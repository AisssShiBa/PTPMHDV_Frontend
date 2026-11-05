import { PageHeader, EmptyState } from '@/components/common'

export function MerchantPortalPage() {
  return (
    <PageHeader
      title="Cổng thông tin Merchant"
      description="Quản lý doanh thu, API key và thanh toán cho đối tác tích hợp."
    >
      <EmptyState
        title="Đang xây dựng"
        description="Giao diện trang Cổng thông tin Merchant đang được thiết lập khung ở các giai đoạn tiếp theo."
      />
    </PageHeader>
  )
}

export default MerchantPortalPage
