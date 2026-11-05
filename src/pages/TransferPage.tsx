import { PageHeader, EmptyState } from '@/components/common'

export function TransferPage() {
  return (
    <PageHeader
      title="Chuyển tiền P2P"
      description="Chuyển tiền nhanh chóng, an toàn qua số điện thoại hoặc mã ví."
    >
      <EmptyState
        title="Đang xây dựng"
        description="Giao diện trang Chuyển tiền P2P đang được thiết lập khung ở các giai đoạn tiếp theo."
      />
    </PageHeader>
  )
}

export default TransferPage
