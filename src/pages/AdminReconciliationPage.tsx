import { PageHeader, EmptyState } from '@/components/common'

export function AdminReconciliationPage() {
  return (
    <PageHeader
      title="Đối soát tài chính"
      description="Kiểm tra khớp nối số dư sổ cái và đối soát ngân hàng/cổng thanh toán."
    >
      <EmptyState
        title="Đang xây dựng"
        description="Giao diện trang Đối soát tài chính đang được thiết lập khung ở các giai đoạn tiếp theo."
      />
    </PageHeader>
  )
}

export default AdminReconciliationPage
