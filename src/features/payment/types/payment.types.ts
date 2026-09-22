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
