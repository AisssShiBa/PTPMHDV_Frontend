import { PageHeader, EmptyState } from '@/components/common'

export function HomePage() {
  return (
    <PageHeader
      title="Trang chủ FinVault"
      description="Nền tảng ví điện tử mô phỏng cho đồ án học tập."
    >
      <EmptyState
        title="Đang xây dựng"
        description="Giao diện trang Trang chủ FinVault đang được thiết lập khung ở các giai đoạn tiếp theo."
      />
    </PageHeader>
  )
}

export default HomePage
