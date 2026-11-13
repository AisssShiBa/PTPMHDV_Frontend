import axios from 'axios'

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: { code: string; message: string; traceId?: string } | null
  message?: string | null
}

export function unwrap<T>(body: ApiResponse<T>): T {
  if (!body.success || body.data === undefined) {
    const errorMsg = body.error?.message || body.message || 'Phản hồi không hợp lệ. Vui lòng thử lại.'
    throw new Error(errorMsg)
  }
  return body.data
}

export function errorCode(error: unknown): string | undefined {
  return axios.isAxiosError<ApiResponse<unknown>>(error) ? error.response?.data?.error?.code : undefined
}

export function errorMessage(error: unknown): string {
  const messages: Record<string, string> = {
    DUPLICATE_RESOURCE: 'Thông tin đã tồn tại. Vui lòng kiểm tra lại.',
    KYC_DOCUMENT_REQUIRED: 'Vui lòng chọn ảnh giấy tờ JPEG hoặc PNG.',
    INVALID_IMAGE: 'Ảnh không hợp lệ. Vui lòng chọn ảnh JPEG hoặc PNG khác.',
    INVALID_UPLOAD: 'Tệp tải lên không hợp lệ. Vui lòng chọn lại ảnh.',
    FILE_TOO_LARGE: 'Ảnh phải có dung lượng tối đa 5MB.',
    INVALID_TRANSITION: 'Trạng thái đã thay đổi. Vui lòng tải lại thông tin.',
    CONCURRENT_UPDATE: 'Hồ sơ vừa được cập nhật. Vui lòng tải lại trước khi gửi.',
    INVALID_CREDENTIALS: 'Tên đăng nhập hoặc mật khẩu không đúng.',
    PIN_LOCKED: 'Mã PIN đã bị tạm khóa do nhập sai nhiều lần. Vui lòng thử lại sau.',
    PIN_NOT_SETUP: 'Bạn chưa thiết lập mã PIN giao dịch. Vui lòng cài đặt mã PIN trước.',
    INVALID_PIN: 'Mã PIN không chính xác. Vui lòng thử lại.',
    LIMIT_EXCEEDED: 'Giao dịch vượt quá hạn mức cho phép. Vui lòng nâng cấp gói KYC.',
    RATE_LIMIT_EXCEEDED: 'Bạn thao tác quá nhanh. Vui lòng đợi một lát rồi thử lại.',
    INSUFFICIENT_FUNDS: 'Số dư khả dụng trong ví không đủ để thực hiện giao dịch.',
    IDEMPOTENCY_KEY_REUSED: 'Yêu cầu giao dịch đang được xử lý hoặc đã hoàn tất.',
    IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD: 'Khóa giao dịch bị trùng lặp với nội dung khác. Vui lòng tạo giao dịch mới.',
    TOKEN_EXPIRED: 'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.',
    TOKEN_REUSE_DETECTED: 'Phát hiện phiên làm việc bất thường. Vui lòng đăng nhập lại.',
    UNAUTHORIZED: 'Bạn chưa đăng nhập hoặc phiên đã hết hạn.',
    FORBIDDEN: 'Bạn không có quyền thực hiện chức năng này.',
    QR_EXPIRED: 'Mã QR đăng nhập đã hết hạn hoặc không tồn tại. Vui lòng tạo mã mới.',
    TXN_TOKEN_EXPIRED: 'Mã xác thực giao dịch đã hết hạn (chỉ có hiệu lực trong 60 giây). Vui lòng thử lại.',
    TXN_TOKEN_MISMATCH: 'Mã xác thực giao dịch không khớp với thông tin thanh toán.',
    TXN_TOKEN_REUSED: 'Mã xác thực giao dịch đã được sử dụng. Vui lòng tạo giao dịch mới.',
    TXN_TOKEN_INVALID: 'Mã xác thực giao dịch không hợp lệ.'
  }

  const code = errorCode(error)
  if (code) {
    if (messages[code]) return messages[code]
    if (code.startsWith('TXN_TOKEN_')) return 'Mã xác thực giao dịch không hợp lệ hoặc đã hết hạn.'
  }

  if (axios.isAxiosError(error)) {
    if (!error.response) return 'Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại.'
    switch (error.response.status) {
      case 400: return 'Thông tin chưa hợp lệ. Vui lòng kiểm tra các trường và thử lại.'
      case 401: return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
      case 403: return 'Bạn không có quyền thực hiện thao tác này.'
      case 404: return 'Không tìm thấy dữ liệu yêu cầu.'
      case 409: return 'Dữ liệu đã thay đổi hoặc đang bị xung đột. Vui lòng thử lại.'
      case 410: return 'Dữ liệu yêu cầu đã hết hạn.'
      case 413: return 'Tệp quá lớn. Vui lòng chọn ảnh tối đa 5MB.'
      case 422: return 'Dữ liệu không đáp ứng quy tắc xử lý của hệ thống.'
      case 423: return 'Tài khoản hoặc tính năng đang bị tạm khóa. Vui lòng thử lại sau.'
      case 429: return 'Bạn thao tác quá nhanh. Vui lòng đợi một lát rồi thử lại.'
      case 500: return 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.'
    }
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return 'Không thể hoàn tất thao tác. Vui lòng thử lại.'
}
