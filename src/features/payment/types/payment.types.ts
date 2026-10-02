// d:\PTPMHDV\Frontend\src\features\payment\types\payment.types.ts

export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED' | 'CANCELLED'

export type PaymentType =
  | 'WALLET_TRANSFER'
  | 'CARD_TOPUP'
  | 'BUS_TICKET'
  | 'MOVIE_TICKET'
  | 'TRAIN_TICKET'

export interface PaymentRecord {
  id: string
  userId: string
  amount: number
  type: PaymentType
  status: PaymentStatus
  referenceId?: string
  callbackTopic: string
  idempotencyKey: string
  createdAt: string
  updatedAt: string
}

export interface CheckoutDto {
  amount: string
  type: PaymentType
  referenceId?: string
  callbackTopic: string
  idempotencyKey: string
}

export type TopupStatus = 'PENDING' | 'PROCESSING' | 'APPROVED' | 'REJECTED' | 'EXPIRED'

export interface TopupRecord {
  id: string
  amount: string
  code: string
  status: TopupStatus
  expiresAt: string
}

export interface TopupPaymentInfo {
  bankName: string
  accountNumber: string
  accountName: string
  amount: number
  content: string
  qrUrl: string
}

export interface TopupResponse {
  topup: TopupRecord
  paymentInfo: TopupPaymentInfo
}
