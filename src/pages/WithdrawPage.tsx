import { PageHeader, EmptyState } from '@/components/common'

export function WithdrawPage() {
  return (
    <PageHeader
      title="Rút tiền về ngân hàng"
      description="Rút tiền từ ví về tài khoản ngân hàng liên kết."
    >
      <EmptyState
        title="Đang xây dựng"
        description="Giao diện trang Rút tiền về ngân hàng đang được thiết lập khung ở các giai đoạn tiếp theo."
      />
    </PageHeader>
  )
}

export default WithdrawPage
