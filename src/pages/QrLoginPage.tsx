import { PageHeader, EmptyState } from '@/components/common'

export function QrLoginPage() {
  return (
    <PageHeader
      title="Đăng nhập bằng mã QR"
      description="Quét mã QR từ ứng dụng FinVault để đăng nhập nhanh."
    >
      <EmptyState
        title="Đang xây dựng"
        description="Giao diện trang Đăng nhập bằng mã QR đang được thiết lập khung ở các giai đoạn tiếp theo."
      />
    </PageHeader>
  )
}

export default QrLoginPage
