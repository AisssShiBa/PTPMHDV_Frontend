import type { TopupStatus } from '../types/funding.types'
export const topupLabels: Record<TopupStatus, string> = {
  PENDING: 'Đang chờ thanh toán',
  PROCESSING: 'Đang đối soát',
  APPROVED: 'Đã nạp thành công',
  REJECTED: 'Đã từ chối',
  FAILED: 'Không thành công',
  EXPIRED: 'Đã hết hạn',
}
