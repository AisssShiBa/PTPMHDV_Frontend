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
  if (error instanceof Error && ['FundingError', 'MerchantError'].includes(error.name) && 'code' in error && typeof error.code === 'string') return error.code
  return axios.isAxiosError<ApiResponse<unknown>>(error) ? error.response?.data?.error?.code : undefined
}

export function errorMessage(error: unknown): string {
  const messages: Record<string, string> = {
    MERCHANT_NOT_APPROVED: 'Đối tác chưa được duyệt. Vui lòng tải lại trạng thái.',
    MERCHANT_INVALID_RESPONSE: 'Phản hồi đối tác chưa hợp lệ. Vui lòng kiểm tra trạng thái trước khi gửi lại.',
    MERCHANT_INVALID_INPUT: 'Thông tin đăng ký chưa hợp lệ. Vui lòng kiểm tra lại.',
    PIN_NOT_SETUP: 'Tài khoản chưa có mã PIN giao dịch. Vui lòng thiết lập trước khi xác nhận.',
    INVALID_PIN: 'Mã PIN không đúng. Vui lòng nhập lại.',
    PIN_INVALID: 'Mã PIN không đúng. Vui lòng nhập lại.',
    TRANSACTION_TOKEN_EXPIRED: 'Xác thực đã hết hạn. Chỉ nhập PIN mới khi máy chủ xác nhận lệnh vẫn chờ xác nhận.',
    TXN_TOKEN_MISMATCH: 'Xác thực không khớp lệnh rút. Vui lòng kiểm tra trạng thái.',
    TXN_TOKEN_REUSED: 'Xác thực đã được sử dụng. Vui lòng kiểm tra trạng thái, không gửi lại.',
    INVALID_TRANSACTION_TOKEN: 'Xác thực giao dịch không hợp lệ. Vui lòng kiểm tra trạng thái.',
    BANK_DECLINED: 'Ngân hàng mô phỏng đã từ chối lệnh rút. Kiểm tra số dư hiện tại từ máy chủ.',
    CASHOUT_FAILED: 'Lệnh rút không thành công. Vui lòng kiểm tra trạng thái và số dư từ máy chủ.',
    CASHOUT_NOT_CONFIRMABLE: 'Lệnh không còn ở bước xác nhận. Vui lòng kiểm tra trạng thái.',
    INSUFFICIENT_BALANCE: 'Số dư khả dụng không đủ để thực hiện lệnh rút.',
    HTTP_400: 'Thông tin giao dịch chưa hợp lệ. Vui lòng kiểm tra lại.',
    HTTP_401: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
    HTTP_403: 'Bạn không có quyền thực hiện giao dịch này.',
    HTTP_409: 'Trạng thái giao dịch đã thay đổi. Vui lòng kiểm tra lại.',
    HTTP_422: 'Nội dung yêu cầu không phù hợp. Vui lòng kiểm tra giao dịch trước.',
    HTTP_423: 'Giao dịch đang bị khóa. Vui lòng thử lại sau.',
    HTTP_429: 'Bạn thao tác quá nhanh. Vui lòng đợi một lát.',
    HTTP_503: 'Máy chủ đang xử lý hoặc tạm gián đoạn. Vui lòng kiểm tra trạng thái.',
    FUNDING_TIMEOUT: 'Hết thời gian chờ. Chưa xác định kết quả; vui lòng kiểm tra trạng thái.',
    FUNDING_NETWORK: 'Mất kết nối máy chủ. Chưa xác định kết quả; vui lòng kiểm tra trạng thái.',
    FUNDING_REDIRECT_UNTRUSTED: 'Chưa thể chuyển tới cổng thanh toán. Vui lòng kiểm tra lệnh đã tạo trong lịch sử.',
    FUNDING_CONTRACT_UNCONFIRMED: 'Chức năng nạp tiền đang chờ đồng bộ kết nối máy chủ. Chưa tạo giao dịch.',
    FUNDING_INTENT_CHANGED: 'Yêu cầu trước cần được kiểm tra trạng thái trước khi đổi số tiền.',
    FUNDING_BUSY: 'Yêu cầu đang được xử lý. Vui lòng đợi.',
    FUNDING_RECONCILE_REQUIRED: 'Vui lòng kiểm tra trạng thái lệnh rút trước khi xác nhận lại.',
    IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD: 'Yêu cầu đã dùng cho nội dung khác. Vui lòng kiểm tra giao dịch trước.',
    CASHOUT_PROCESSING: 'Lệnh rút đang được xử lý. Vui lòng kiểm tra trạng thái.',
    CASHOUT_PAYOUT_PENDING: 'Lệnh rút đang chờ kết quả chi trả.',
    DUPLICATE_RESOURCE: 'Thông tin đã tồn tại. Vui lòng kiểm tra lại.',
    KYC_DOCUMENT_REQUIRED: 'Vui lòng chọn ảnh giấy tờ JPEG hoặc PNG.',
    INVALID_IMAGE: 'Ảnh không hợp lệ. Vui lòng chọn ảnh JPEG hoặc PNG khác.',
    INVALID_UPLOAD: 'Tệp tải lên không hợp lệ. Vui lòng chọn lại ảnh.',
    FILE_TOO_LARGE: 'Ảnh phải có dung lượng tối đa 5MB.',
    INVALID_TRANSITION: 'Trạng thái đã thay đổi. Vui lòng tải lại thông tin.',
    CONCURRENT_UPDATE: 'Hồ sơ vừa được cập nhật. Vui lòng tải lại trước khi gửi.',
    INVALID_CREDENTIALS: 'Tên đăng nhập hoặc mật khẩu không đúng.',
    PIN_LOCKED: 'Mã PIN đã bị tạm khóa do nhập sai nhiều lần. Vui lòng thử lại sau.',
    LIMIT_EXCEEDED: 'Giao dịch vượt quá hạn mức cho phép. Vui lòng nâng cấp gói KYC.',
    INSUFFICIENT_FUNDS: 'Số dư khả dụng trong ví không đủ để thực hiện giao dịch.',
    IDEMPOTENCY_KEY_REUSED: 'Yêu cầu giao dịch đang được xử lý hoặc đã hoàn tất.',
    TOKEN_EXPIRED: 'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.',
    UNAUTHORIZED: 'Bạn chưa đăng nhập hoặc phiên đã hết hạn.',
    FORBIDDEN: 'Bạn không có quyền thực hiện chức năng này.'
  }

  const code = errorCode(error)
  if (error instanceof Error && ['FundingError', 'MerchantError'].includes(error.name)) {
    const message = code && messages[code] ? messages[code] : 'Chưa thể hoàn tất yêu cầu. Vui lòng kiểm tra trạng thái.'
    const id = 'requestId' in error && typeof error.requestId === 'string' ? error.requestId : undefined
    return id && /^[a-zA-Z0-9_.:-]{1,128}$/.test(id) ? `${message} Mã yêu cầu: ${id}` : message
  }
  if (code && messages[code]) return messages[code]

  if (axios.isAxiosError(error)) {
    if (!error.response) return 'Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại.'
    switch (error.response.status) {
      case 400: return 'Thông tin chưa hợp lệ. Vui lòng kiểm tra các trường và thử lại.'
      case 401: return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
      case 403: return 'Bạn không có quyền thực hiện thao tác này.'
      case 404: return 'Không tìm thấy dữ liệu yêu cầu.'
      case 409: return 'Dữ liệu đã thay đổi hoặc đang bị xung đột. Vui lòng thử lại.'
      case 413: return 'Tệp quá lớn. Vui lòng chọn ảnh tối đa 5MB.'
      case 429: return 'Bạn thao tác quá nhanh. Vui lòng đợi một lát rồi thử lại.'
      case 500: return 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.'
    }
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return 'Không thể hoàn tất thao tác. Vui lòng thử lại.'
}
