import { PageHeader, EmptyState } from '@/components/common'

export function TransactionsPage() {
  return (
    <PageHeader
      title="Lịch sử giao dịch"
      description="Sao kê và lịch sử biến động số dư theo thời gian."
    >
      <EmptyState
        title="Đang xây dựng"
        description="Giao diện trang Lịch sử giao dịch đang được thiết lập khung ở các giai đoạn tiếp theo."
      />
    </PageHeader>
  )
}

export default TransactionsPage
