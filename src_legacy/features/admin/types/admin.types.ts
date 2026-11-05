// d:\PTPMHDV\Frontend\src\features\admin\types\admin.types.ts

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
  idImageUrl: string | null
  kycStatus: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED'
  createdAt: string
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
