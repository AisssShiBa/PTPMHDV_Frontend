import type { KycStatus, KycTier } from '@/features/user/types/user.types'

/** Phần thống kê backend admin-service trả về từ GET /api/admin/dashboard. */
export interface AdminAuditActivity {
  id: string
  adminId: string
  action: string
  targetId: string | null
  detail: string | null
  createdAt: string
}

export interface AdminDashboardStats {
  users: {
    total: number
    kycBreakdown: {
      none: number
      pending: number
      approved: number
      rejected: number
    }
  }
  merchants: {
    total: number
    statusBreakdown: {
      pending: number
      approved: number
      rejected: number
    }
  }
  audits: {
    totalLogs: number
    todayActionsCount: number
    recentActivities: AdminAuditActivity[]
  }
}

/** Một hồ sơ trong GET /api/admin/kyc (dữ liệu từ user-service). */
export interface AdminKycItem {
  id: string
  authUserId: string
  email: string
  fullName: string | null
  phone: string | null
  address: string | null
  kycStatus: KycStatus
  kycTier: KycTier
  idNumber: string | null
  idImageUrl: string | null
  createdAt: string
  updatedAt: string
}

export interface AdminKycPage {
  content: AdminKycItem[]
  page: number
  limit: number
  totalElements: number
  totalPages: number
}

export interface AdminKycListParams {
  page?: number
  limit?: number
  status?: KycStatus
  search?: string
}

/** GET /api/admin/kyc/:userId/documents — URL chỉ tồn tại trong bộ nhớ. */
export interface AdminKycDocuments {
  frontUrl: string
  backUrl: string
  expiresAt: string
}

export type AdminTopupStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'FAILED'

/** GET /api/payments/admin/topups — bản ghi TopupRequest (amount là Decimal -> string). */
export interface AdminTopup {
  id: string
  userId: string
  amount: string
  code: string
  status: AdminTopupStatus
  expiresAt: string
  approvedBy: string | null
  approvedAt: string | null
  rejectReason: string | null
  walletTransactionId: string | null
  vnpTransactionNo: string | null
  vnpBankCode: string | null
  vnpPayDate: string | null
  vnpResponseCode: string | null
  paymentUrl: string | null
  createdAt: string
  updatedAt: string
}
