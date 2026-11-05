import { PageHeader, EmptyState } from '@/components/common'

export function MerchantRegisterPage() {
  return (
    <PageHeader
      title="Đăng ký đối tác Merchant"
      description="Gửi hồ sơ đăng ký đối tác thanh toán tích hợp FinVault."
    >
      <EmptyState
        title="Đang xây dựng"
        description="Giao diện trang Đăng ký đối tác Merchant đang được thiết lập khung ở các giai đoạn tiếp theo."
      />
    </PageHeader>
  )
}

export default MerchantRegisterPage
