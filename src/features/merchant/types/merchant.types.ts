// d:\PTPMHDV\Frontend\src\features\merchant\types\merchant.types.ts

export type MerchantStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface MerchantRecord {
  id: string
  userId?: string
  businessName: string
  taxId?: string | null
  bankAccount?: string | null
  status: MerchantStatus
  createdAt: string
  updatedAt: string
}

export interface RegisterMerchantDto {
  businessName: string
  taxId?: string
  bankAccount?: string
}
