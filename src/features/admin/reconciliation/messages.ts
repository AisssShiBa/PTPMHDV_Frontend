import { errorCode, errorMessage } from '@/lib/apiResponse'

/**
 * Mã lỗi đối soát thật từ admin-service (N13):
 * 409 ALREADY_ADJUSTED / ADJUSTMENT_IN_PROGRESS / ADJUSTMENT_OUTCOME_UNKNOWN /
 * RECONCILIATION_IN_PROGRESS; 503 ADJUST_OUTCOME_UNKNOWN; 504 WALLET_TIMEOUT.
 */
const RECONCILIATION_MESSAGES: Record<string, string> = {
  ALREADY_ADJUSTED:
    'Bất thường này đã được điều chỉnh trước đó. Dữ liệu báo cáo đã được làm mới, vui lòng kiểm tra lại.',
  ADJUSTMENT_IN_PROGRESS:
    'Một điều chỉnh cho bất thường này đang được xử lý. Vui lòng tải lại báo cáo sau.',
  ADJUSTMENT_OUTCOME_UNKNOWN:
    'Lần điều chỉnh trước chưa rõ kết quả. Hãy tải lại chi tiết báo cáo để kiểm tra sổ cái trước khi thao tác lại.',
  ADJUST_OUTCOME_UNKNOWN:
    'Chưa rõ kết quả điều chỉnh. Hãy tải lại chi tiết báo cáo để kiểm tra sổ cái trước khi thao tác lại.',
  RECONCILIATION_IN_PROGRESS:
    'Một lượt đối soát cùng chế độ đang chạy. Vui lòng đợi hoặc tải lại danh sách báo cáo.',
  WALLET_TIMEOUT: 'Dịch vụ ví không phản hồi kịp. Vui lòng thử tải lại báo cáo.',
  WALLET_UNAVAILABLE: 'Dịch vụ ví đang không khả dụng. Vui lòng thử lại sau.'
}

export function reconciliationErrorMessage(error: unknown): string {
  const code = errorCode(error)
  if (code && RECONCILIATION_MESSAGES[code]) return RECONCILIATION_MESSAGES[code]
  return errorMessage(error)
}

export function isAlreadyAdjusted(error: unknown): boolean {
  return errorCode(error) === 'ALREADY_ADJUSTED'
}

/** 503 ADJUST_OUTCOME_UNKNOWN (hoặc 409 chặn thao tác lại sau kết quả chưa rõ). */
export function isAdjustOutcomeUnknown(error: unknown): boolean {
  const code = errorCode(error)
  return code === 'ADJUST_OUTCOME_UNKNOWN' || code === 'ADJUSTMENT_OUTCOME_UNKNOWN'
}
