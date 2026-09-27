import axios from 'axios'

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: { code: string; message: string } | null
  message?: string | null
}

export function unwrap<T>(body: ApiResponse<T>): T {
  if (!body.success || body.data === undefined) {
    throw new Error('Phản hồi không hợp lệ. Vui lòng thử lại.')
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
    FILE_TOO_LARGE: 'Ảnh phải có dung lượng tối đa 5 MiB.',
    INVALID_TRANSITION: 'Trạng thái đã thay đổi. Vui lòng tải lại thông tin.',
    CONCURRENT_UPDATE: 'Hồ sơ vừa được cập nhật. Vui lòng tải lại trước khi gửi.',
    INVALID_CREDENTIALS: 'Tên đăng nhập hoặc mật khẩu không đúng.'
  }
  const code = errorCode(error)
  if (code && messages[code]) return messages[code]
  if (axios.isAxiosError(error)) {
    if (!error.response) return 'Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối và thử lại.'
    switch (error.response.status) {
      case 400: return 'Thông tin chưa hợp lệ. Vui lòng kiểm tra các trường và thử lại.'
      case 401: return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
      case 403: return 'Bạn không có quyền thực hiện thao tác này.'
      case 404: return 'Không tìm thấy dữ liệu. Vui lòng thử tải lại.'
      case 409: return 'Dữ liệu đã thay đổi hoặc đã tồn tại. Vui lòng tải lại.'
      case 413: return 'Tệp quá lớn. Vui lòng chọn ảnh tối đa 5 MiB.'
      case 429: return 'Bạn thao tác quá nhanh. Vui lòng đợi một lúc rồi thử lại.'
    }
  }
  return 'Không thể hoàn tất thao tác. Vui lòng thử lại.'
}
