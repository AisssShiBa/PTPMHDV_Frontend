import api from '@/lib/axios'
import { unwrap } from '@/lib/apiResponse'
import type { ApiResponse } from '@/lib/apiResponse'
import type { User, AuthSession } from '../types/auth.types'

export interface SignInPayload {
  username: string
  password: string
  platform?: 'web' | 'mobile'
}

export interface SignUpPayload {
  email: string
  password: string
  username?: string
  firstName?: string
  lastName?: string
}

export interface QrInitResponse {
  qrId: string
  nonce: string
  pollSecret: string
  expiresAt: string
  /** @deprecated Hỗ trợ tương thích ngược cho giao diện cũ */
  sessionId?: string
  /** @deprecated Hỗ trợ tương thích ngược cho giao diện cũ */
  qrToken?: string
}

export interface QrStatusResponse {
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SCANNED' | 'CONFIRMED' | 'EXPIRED'
  accessToken?: string
  user?: User
  expiresAt?: string
}

export interface ConfirmQrPayload {
  qrId: string
  nonce: string
}

export interface VerifyPinPayload {
  pin: string
  paymentId: string
  amount: string | number
}

export interface VerifyPinResponse {
  transactionToken: string
  expiresIn: number
}

export interface PinStatusResponse {
  hasPin: boolean
  isLocked: boolean
  lockedUntil?: string | null
  attemptsRemaining?: number
}

export interface SetupPinPayload {
  pin: string
  confirmPin: string
}

export interface ChangePinPayload {
  oldPin: string
  newPin: string
  confirmNewPin: string
}

export const authApi = {
  /**
   * 1. Đăng nhập hệ thống bằng email hoặc tên đăng nhập
   * Endpoint: POST /api/auth/signin
   */
  async signIn(payload: SignInPayload): Promise<AuthSession> {
    const res = await api.post<ApiResponse<AuthSession>>('/auth/signin', {
      username: payload.username.trim(),
      password: payload.password,
      platform: payload.platform || 'web'
    })
    return unwrap(res.data)
  },

  /**
   * 2. Đăng ký tài khoản người dùng mới
   * Endpoint: POST /api/auth/signup
   */
  async signUp(payload: SignUpPayload): Promise<User> {
    const defaultUsername =
      payload.username ||
      payload.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 30) ||
      'user'
    const res = await api.post<ApiResponse<{ user: User } | User>>('/auth/signup', {
      email: payload.email.trim(),
      password: payload.password,
      username: defaultUsername,
      firstName: payload.firstName || 'Thành viên',
      lastName: payload.lastName || 'FinVault'
    })
    const data = unwrap(res.data)
    return (data as { user: User }).user || (data as User)
  },

  /**
   * 3. Làm mới Access Token thông qua HTTP-Only cookie refreshToken
   * Endpoint: POST /api/auth/refresh
   */
  async refresh(): Promise<AuthSession> {
    const res = await api.post<ApiResponse<AuthSession>>('/auth/refresh', {})
    return unwrap(res.data)
  },

  /**
   * 4. Đăng xuất tài khoản & xóa cookie phiên làm việc
   * Endpoint: POST /api/auth/signout
   */
  async signOut(): Promise<void> {
    await api.post('/auth/signout', {})
  },

  /**
   * 5. Lấy thông tin chi tiết người dùng hiện tại
   * Endpoint: GET /api/users/me
   */
  async getMe(): Promise<User> {
    const res = await api.get<ApiResponse<User>>('/users/me')
    return unwrap(res.data)
  },

  /**
   * 6. Khởi tạo phiên quét mã QR Đăng nhập (Web)
   * Endpoint: POST /api/auth/qr-login/init
   * Khớp chính xác backend: trả về { qrId, nonce, pollSecret, expiresAt }
   */
  async initQrLogin(): Promise<QrInitResponse> {
    const res = await api.post<ApiResponse<QrInitResponse>>('/auth/qr-login/init', {})
    const data = unwrap(res.data)
    return {
      ...data,
      sessionId: data.qrId,
      qrToken: data.nonce
    }
  },

  /**
   * 7. Polling kiểm tra trạng thái phiên mã QR
   * Endpoint: GET /api/auth/qr-login/:id/status
   * Khớp chính xác backend: gửi pollSecret qua cả query parameter và header x-poll-secret
   */
  async getQrStatus(qrId: string, pollSecret: string): Promise<QrStatusResponse> {
    const res = await api.get<ApiResponse<QrStatusResponse>>(
      `/auth/qr-login/${encodeURIComponent(qrId)}/status`,
      {
        params: { pollSecret },
        headers: { 'x-poll-secret': pollSecret }
      }
    )
    return unwrap(res.data)
  },

  /**
   * 8. Xác nhận đăng nhập QR (Dành cho Mobile hoặc script giả lập)
   * Endpoint: POST /api/auth/qr-login/confirm
   */
  async confirmQrLogin(payload: ConfirmQrPayload): Promise<{ success: boolean }> {
    const res = await api.post<ApiResponse<{ success: boolean }>>('/auth/qr-login/confirm', payload)
    return unwrap(res.data)
  },

  /**
   * 9. Xác thực mã PIN 6 số để nhận transactionToken dùng 1 lần trong 60 giây
   * Endpoint: POST /api/auth/pin/verify
   * paymentId và amount bắt buộc theo verifyPinSchema backend
   */
  async verifyPin(payload: VerifyPinPayload): Promise<VerifyPinResponse> {
    if (!payload.paymentId || !payload.amount) throw new Error('Thiếu thông tin giao dịch cần xác thực.')
    const res = await api.post<ApiResponse<VerifyPinResponse>>('/auth/pin/verify', {
      pin: payload.pin,
      paymentId: payload.paymentId,
      amount: String(payload.amount)
    })
    return unwrap(res.data)
  },

  /**
   * 10. Lấy trạng thái cài đặt & khóa của mã PIN
   * Endpoint: GET /api/auth/pin/status
   */
  async getPinStatus(): Promise<PinStatusResponse> {
    const res = await api.get<ApiResponse<PinStatusResponse>>('/auth/pin/status')
    return unwrap(res.data)
  },

  /**
   * 11. Thiết lập mã PIN lần đầu
   * Endpoint: POST /api/auth/pin/setup
   */
  async setupPin(payload: SetupPinPayload): Promise<{ success: boolean }> {
    const res = await api.post<ApiResponse<{ success: boolean }>>('/auth/pin/setup', payload)
    return unwrap(res.data)
  },

  /**
   * 12. Đổi mã PIN giao dịch
   * Endpoint: POST /api/auth/pin/change
   */
  async changePin(payload: ChangePinPayload): Promise<{ success: boolean }> {
    const res = await api.post<ApiResponse<{ success: boolean }>>('/auth/pin/change', payload)
    return unwrap(res.data)
  }
}

/**
 * Gộp authService cũ vào đây làm một điểm gọi duy nhất (Single Source of Truth)
 */
export const authService = {
  signUp: (username: string, password: string, email: string, firstName: string, lastName: string) =>
    authApi.signUp({ username, password, email, firstName, lastName }),
  signIn: (username: string, password: string) =>
    authApi.signIn({ username, password }),
  signOut: () => authApi.signOut(),
  refresh: () => authApi.refresh()
}

export default authApi
