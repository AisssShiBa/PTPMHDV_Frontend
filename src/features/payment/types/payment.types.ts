// d:\PTPMHDV\Frontend\src\features\payment\types\payment.types.ts

export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED' | 'CANCELLED' | 'EXPIRED'

export type PaymentType =
  | 'WALLET_TRANSFER'
  | 'CARD_TOPUP'
  | 'BUS_TICKET'
  | 'MOVIE_TICKET'
  | 'TRAIN_TICKET'
  | 'PHONE_TOPUP'
  | 'BILL_PAYMENT'

export interface PaymentRecord {
  id: string
  userId?: string
  senderUserId?: string
  destinationUserId?: string
  amount: string
  type?: PaymentType | string
  status: PaymentStatus
  fee?: string
  note?: string
  referenceId?: string
  callbackTopic?: string
  idempotencyKey?: string
  createdAt: string
  updatedAt?: string
}

export interface P2pQuoteDto {
  destinationUserId: string
  amount: string
}

export interface P2pQuoteResult {
  amount: string
  fee: string
  expiresAt: string
}

export interface P2pCheckoutDto {
  destinationUserId: string
  amount: string
  note?: string
}

export interface P2pCheckoutResult {
  paymentId: string
  id?: string
  status: PaymentStatus
  holdExpiresAt: string
  replayed?: boolean
}

export interface ConfirmPaymentResult {
  status: string
}

export interface LimitExceededDetails {
  limitType: 'PER_TXN' | 'PER_DAY' | 'PER_MONTH' | string
  limit: string
  used: string
  remaining: string
  kycTier: number
}

export interface CheckoutDto {
  amount: string
  type: PaymentType
  referenceId?: string
  callbackTopic?: string
  idempotencyKey?: string
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
