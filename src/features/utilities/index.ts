// Feature: utilities — the only public entry point for this feature.
export { UtilitiesWorkspace } from './components/UtilitiesWorkspace'
export { utilitiesApi } from './api'
export {
  utilitiesKeys,
  useBillLookup,
  useUtilityOrder,
  useCreateTopup,
  usePayBill,
  useConfirmUtilityPayment
} from './queries'
export {
  PHONE_PATTERN,
  VALID_AMOUNTS,
  BILL_PROVIDERS,
  TERMINAL_ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  billProviderLabel
} from './constants'
export {
  phoneSchema,
  topupAmountSchema,
  topupFormSchema,
  billLookupSchema,
  billPayAmountSchema,
  billPaySchema,
  normalisePhone,
  discountForAmount,
  topupIntent,
  billPayIntent,
  buildBillPayPayload
} from './schemas'
export { resolveIdempotencyKey } from './idempotency'
export type { IntentKey } from './idempotency'
export {
  utilitiesErrorMessage,
  isRetryableCheckoutError,
  isRetryableConfirmError
} from './errors'
export {
  isTerminalOrderStatus,
  orderPollInterval,
  orderStatusLabel,
  orderTypeLabel,
  failureReasonMessage
} from './status'
export type {
  BillLookup,
  BillLookupRequest,
  BillPayPayload,
  CheckoutAttempt,
  CheckoutKind,
  TopupPayload,
  UtilityNotice,
  UtilityOrderStatus,
  UtilityOrderType,
  UtilityOrderView
} from './types'
