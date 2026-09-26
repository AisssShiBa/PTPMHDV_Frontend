export type MerchantStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
export interface MerchantRecord {
  id: string
  ownerId: string
  businessName: string
  taxId: string | null
  bankAccount: string | null
  status: MerchantStatus
  createdAt: string
  updatedAt: string
}
export interface MerchantRegisterDto {
  businessName: string
  taxId?: string
  bankAccount?: string
}
