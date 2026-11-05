import { PageHeader, EmptyState } from '@/components/common'

export function ProfilePage() {
  return (
    <PageHeader
      title="Hồ sơ cá nhân & KYC"
      description="Quản lý thông tin cá nhân và định danh tài khoản."
    >
      <EmptyState
        title="Đang xây dựng"
        description="Giao diện trang Hồ sơ cá nhân & KYC đang được thiết lập khung ở các giai đoạn tiếp theo."
      />
    </PageHeader>
  )
}

export default ProfilePage
