import { PageHeader, EmptyState } from '@/components/common'

export function DashboardPage() {
  return (
    <PageHeader
      title="Tổng quan tài khoản"
      description="Theo dõi số dư, dòng tiền và các giao dịch gần đây."
    >
      <EmptyState
        title="Đang xây dựng"
        description="Giao diện trang Tổng quan tài khoản đang được thiết lập khung ở các giai đoạn tiếp theo."
      />
    </PageHeader>
  )
}

export default DashboardPage
