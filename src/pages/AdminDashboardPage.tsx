import { PageHeader, EmptyState } from '@/components/common'

export function AdminDashboardPage() {
  return (
    <PageHeader
      title="Thống kê tổng quan Admin"
      description="Theo dõi dòng tiền toàn hệ thống và các chỉ số vận hành."
    >
      <EmptyState
        title="Đang xây dựng"
        description="Giao diện trang Thống kê tổng quan Admin đang được thiết lập khung ở các giai đoạn tiếp theo."
      />
    </PageHeader>
  )
}

export default AdminDashboardPage
