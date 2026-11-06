import type { User, AuthSession } from '../types/auth.types'

/**
 * 1. Standard Mock User Fixture (Customer - Level 1 KYC)
 */
export const MOCK_AUTH_USER: User = {
  id: '0192f1b4-2b7e-7c9b-b0b3-1e5f8a9d2c4e',
  username: 'annguyen',
  email: 'an.nguyen@finvault.vn',
  firstName: 'An',
  lastName: 'Nguyễn',
  role: 'USER',
  kycTier: 1,
  balance: '1250000',
  createdAt: '2026-01-15T08:30:00Z'
}

/**
 * 2. Admin User Fixture (System Operations - Level 2 KYC)
 */
export const MOCK_ADMIN_USER: User = {
  id: '0192f1b4-2b7e-7c9b-b0b3-1e5f8a9d2c4f',
  username: 'admin',
  email: 'admin@finvault.vn',
  firstName: 'Quản trị',
  lastName: 'Hệ thống',
  role: 'ADMIN',
  kycTier: 2,
  balance: '50000000',
  createdAt: '2025-12-01T00:00:00Z'
}

/**
 * 3. Merchant User Fixture (Business Account - Level 2 KYC)
 */
export const MOCK_MERCHANT_USER: User = {
  id: '0192f1b4-2b7e-7c9b-b0b3-1e5f8a9d2c50',
  username: 'coffee_house',
  email: 'merchant@finvault.vn',
  firstName: 'Cửa hàng',
  lastName: 'FinCoffee',
  role: 'MERCHANT',
  kycTier: 2,
  balance: '18500000',
  createdAt: '2026-02-10T09:00:00Z'
}

/**
 * 4. Active Auth Session Fixture
 */
export const MOCK_AUTH_SESSION: AuthSession = {
  accessToken: 'mock_jwt_access_token_customer_finvault_2026',
  user: MOCK_AUTH_USER
}

/**
 * QR Code Login Session Interfaces & Fixtures
 */
export type QrSessionStatus = 'PENDING' | 'SCANNED' | 'CONFIRMED' | 'EXPIRED'

export interface QrSession {
  sessionId: string
  qrCode: string
  status: QrSessionStatus
  expiresAt: string
  accessToken?: string
  user?: User
}

export const MOCK_QR_SESSION_PENDING: QrSession = {
  sessionId: 'qr_sess_9a8b7c6d5e4f3a2b1c',
  qrCode: 'finvault://qr-auth/qr_sess_9a8b7c6d5e4f3a2b1c',
  status: 'PENDING',
  expiresAt: new Date(Date.now() + 180 * 1000).toISOString()
}

export const MOCK_QR_SESSION_SCANNED: QrSession = {
  sessionId: 'qr_sess_9a8b7c6d5e4f3a2b1c',
  qrCode: 'finvault://qr-auth/qr_sess_9a8b7c6d5e4f3a2b1c',
  status: 'SCANNED',
  expiresAt: new Date(Date.now() + 120 * 1000).toISOString()
}

export const MOCK_QR_SESSION_CONFIRMED: QrSession = {
  sessionId: 'qr_sess_9a8b7c6d5e4f3a2b1c',
  qrCode: 'finvault://qr-auth/qr_sess_9a8b7c6d5e4f3a2b1c',
  status: 'CONFIRMED',
  expiresAt: new Date(Date.now() + 60 * 1000).toISOString(),
  accessToken: 'mock_jwt_qr_authenticated_token_2026',
  user: MOCK_AUTH_USER
}

/**
 * PIN Verification Interfaces & Fixtures
 */
export interface VerifyPinResult {
  success: boolean
  transactionToken: string
  expiresInSeconds: number
}

export interface PinLockedError {
  code: 'PIN_LOCKED'
  message: string
  lockedUntil: string
  attemptsRemaining?: number
}

export const MOCK_VERIFY_PIN_SUCCESS: VerifyPinResult = {
  success: true,
  transactionToken: 'txn_tok_9876543210abcdef_single_use',
  expiresInSeconds: 60
}

export const MOCK_PIN_LOCKED_FIXTURE: PinLockedError = {
  code: 'PIN_LOCKED',
  message: 'Tài khoản tạm thời bị khóa giao dịch do nhập sai mã PIN quá 5 lần.',
  lockedUntil: new Date(Date.now() + 300 * 1000).toISOString(),
  attemptsRemaining: 0
}

