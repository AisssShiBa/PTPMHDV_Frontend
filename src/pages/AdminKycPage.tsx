import { PageHeader, EmptyState } from '@/components/common'

export function AdminKycPage() {
  return (
    <PageHeader
      title="Duyệt hồ sơ định danh KYC"
      description="Kiểm tra ảnh CCCD và phê duyệt nâng cấp hạn mức tài khoản."
    >
      <EmptyState
        title="Đang xây dựng"
        description="Giao diện trang Duyệt hồ sơ định danh KYC đang được thiết lập khung ở các giai đoạn tiếp theo."
      />
    </PageHeader>
  )
}

export default AdminKycPage
