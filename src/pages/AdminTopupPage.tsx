import { PageHeader, EmptyState } from '@/components/common'

export function AdminTopupPage() {
  return (
    <PageHeader
      title="Duyệt yêu cầu nạp tiền"
      description="Kiểm tra và xác nhận các giao dịch nạp tiền qua cổng."
    >
      <EmptyState
        title="Đang xây dựng"
        description="Giao diện trang Duyệt yêu cầu nạp tiền đang được thiết lập khung ở các giai đoạn tiếp theo."
      />
    </PageHeader>
  )
}

export default AdminTopupPage
