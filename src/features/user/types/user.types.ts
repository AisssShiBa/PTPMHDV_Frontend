// d:\PTPMHDV\Frontend\src\features\user\types\user.types.ts

export type KycStatus = 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED'

export interface UserProfile {
  id: string
  authUserId: string
  email: string
  fullName: string | null
  phone: string | null
  address: string | null
  kycStatus: KycStatus
  idNumber: string | null
  idImageUrl: string | null
  createdAt: string
  updatedAt: string
}

export interface UpdateUserDto {
  fullName?: string
  phone?: string
  address?: string
}

export interface SubmitKycDto {
  idNumber: string
  idImageUrl: string
}
