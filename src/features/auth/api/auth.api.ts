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
  sessionId: string
  qrToken: string
  qrCodeUrl?: string
  pollSecret: string
  expiresAt: string
}

export interface QrStatusResponse {
  status: 'PENDING' | 'SCANNED' | 'CONFIRMED' | 'EXPIRED'
  accessToken?: string
  user?: User
  expiresAt?: string
}

export interface VerifyPinPayload {
  pin: string
  paymentId?: string
  amount?: string | number
}

export interface VerifyPinResponse {
  transactionToken: string
  expiresInSeconds: number
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
      platform: 'web'
    })
    return unwrap(res.data)
  },

  /**
   * 2. Đăng ký tài khoản người dùng mới
   * Endpoint: POST /api/auth/signup
   * Tự động chuẩn hóa username, họ và tên nếu UI chỉ nhận email + mật khẩu
   */
  async signUp(payload: SignUpPayload): Promise<User> {
    const defaultUsername = payload.username || payload.email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 30) || 'user'
    const res = await api.post<ApiResponse<User>>('/auth/signup', {
      email: payload.email.trim(),
      password: payload.password,
      username: defaultUsername,
      firstName: payload.firstName || 'Thành viên',
      lastName: payload.lastName || 'FinVault'
    })
    return unwrap(res.data)
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
    await api.post('/auth/signout')
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
   */
  async initQrLogin(): Promise<QrInitResponse> {
    const res = await api.post<ApiResponse<QrInitResponse>>('/auth/qr-login/init', {})
    return unwrap(res.data)
  },

  /**
   * 7. Polling kiểm tra trạng thái phiên mã QR
   * Endpoint: GET /api/auth/qr-login/:id/status?secret=...
   */
  async getQrStatus(sessionId: string, pollSecret: string): Promise<QrStatusResponse> {
    const res = await api.get<ApiResponse<QrStatusResponse>>(
      `/auth/qr-login/${encodeURIComponent(sessionId)}/status`,
      { params: { secret: pollSecret } }
    )
    return unwrap(res.data)
  },

  /**
   * 8. Xác thực mã PIN 6 số để nhận transactionToken dùng 1 lần trong 60 giây
   * Endpoint: POST /api/auth/pin/verify
   */
  async verifyPin(payload: VerifyPinPayload): Promise<VerifyPinResponse> {
    const res = await api.post<ApiResponse<VerifyPinResponse>>('/auth/pin/verify', {
      pin: payload.pin,
      paymentId: payload.paymentId || 'default',
      amount: payload.amount ? String(payload.amount) : '0'
    })
    return unwrap(res.data)
  },

  /**
   * 9. Lấy trạng thái cài đặt & khóa của mã PIN
   * Endpoint: GET /api/auth/pin/status
   */
  async getPinStatus(): Promise<PinStatusResponse> {
    const res = await api.get<ApiResponse<PinStatusResponse>>('/auth/pin/status')
    return unwrap(res.data)
  },

  /**
   * 10. Thiết lập mã PIN lần đầu
   * Endpoint: POST /api/auth/pin/setup
   */
  async setupPin(payload: SetupPinPayload): Promise<{ success: boolean }> {
    const res = await api.post<ApiResponse<{ success: boolean }>>('/auth/pin/setup', payload)
    return unwrap(res.data)
  },

  /**
   * 11. Đổi mã PIN giao dịch
   * Endpoint: POST /api/auth/pin/change
   */
  async changePin(payload: ChangePinPayload): Promise<{ success: boolean }> {
    const res = await api.post<ApiResponse<{ success: boolean }>>('/auth/pin/change', payload)
    return unwrap(res.data)
  }
}

