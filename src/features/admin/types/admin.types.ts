import type { KycStatus, KycTier } from '@/features/user/types/user.types'

export interface DashboardStats {
  totalUsers?: number
  pendingKyc?: number
  pendingMerchants?: number
  totalTransactions?: number
  totalVolume?: string
}

export interface AdminKycItem {
  id: string
  authUserId: string
  email: string
  fullName: string | null
  phone: string | null
  idNumber: string | null
  hasKycDocument: boolean
  kycStatus: KycStatus
  kycTier: KycTier
  createdAt: string
}

export interface AdminKycDocuments {
  frontUrl: string
  backUrl: string
  expiresAt: string
}

export interface AdminKycPage {
  content: AdminKycItem[]
  totalElements: number
  totalPages: number
}

export interface AdminMerchantItem {
  id: string
  businessName: string
  taxId: string | null
  bankAccount: string | null
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  createdAt: string
}

export interface AuditLogItem {
  id: string
  action: string
  adminId: string
  targetId: string | null
  details: any
  createdAt: string
}
