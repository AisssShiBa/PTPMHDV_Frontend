export type KycStatus = 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED'
export type KycTier = 0 | 1 | 2

export interface UserProfile {
  id: string
  authUserId: string
  email: string
  fullName: string | null
  phone: string | null
  address: string | null
  kycStatus: KycStatus
  kycTier: KycTier
  idNumber: string | null
  hasKycDocument: boolean
  createdAt: string
  updatedAt: string
  version: number
}

export interface UpdateUserDto {
  fullName?: string
  phone?: string
  address?: string
}

export interface SubmitKycDto {
  idNumber: string
  front: File
  back: File
}

export interface KycDocument {
  url: string
  expiresIn: number
}
