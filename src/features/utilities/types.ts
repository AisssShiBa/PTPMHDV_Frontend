export type UtilityOrderStatus =
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'PROVIDER_PENDING'
  | 'SUCCESS'
  | 'FAILED'
  | 'REFUND_REQUESTED'
  | 'REFUNDED'
  | 'REFUND_FAILED'

export type UtilityOrderType = 'TELCO_TOPUP' | 'BILL_PAY'

/** Exact `data` payload returned by utilities-service for every order endpoint. */
export interface UtilityOrderView {
  orderId: string
  type: UtilityOrderType
  status: UtilityOrderStatus
  amount: string
  discountAmount: string
  target: string
  providerCode: string | null
  providerRef: string | null
  paymentId: string | null
  failureReason: string | null
  createdAt: string
  updatedAt: string
  replayed?: boolean
}

export interface TopupPayload {
  phone: string
  amount: string
}

export interface BillPayPayload {
  provider: string
  customerCode: string
  amount: string
}

/** Exact `data` payload of GET /api/utilities/bills/lookup. */
export interface BillLookup {
  provider: string
  customerCode: string
  customerName: string
  amount: string
  period: string
  amountFormatted?: string
}

export interface BillLookupRequest {
  provider: string
  customerCode: string
}

export type CheckoutKind = 'TOPUP' | 'BILLS'

export interface CheckoutAttempt {
  kind: CheckoutKind
  intent: string
  key: string
  payload: TopupPayload | BillPayPayload
}

export type UtilityNoticeKind = 'info' | 'error' | 'retry'

export type UtilityNoticeAction = 'CHECKOUT' | 'REAUTH'

export interface UtilityNotice {
  kind: UtilityNoticeKind
  text: string
  action?: UtilityNoticeAction
}
