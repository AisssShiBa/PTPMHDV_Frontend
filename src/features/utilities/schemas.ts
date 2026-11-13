import { z } from 'zod'
import {
  BILL_CUSTOMER_CODE_PATTERN,
  BILL_PROVIDER_PATTERN,
  DISCOUNT_PERCENT,
  PHONE_PATTERN,
  VALID_AMOUNTS
} from './constants'
import type { BillLookup, BillPayPayload, TopupPayload } from './types'

export function normalisePhone(value: string): string {
  const trimmed = value.trim()
  return trimmed.startsWith('+84') ? `0${trimmed.slice(3)}` : trimmed
}

/**
 * Mirrors utilities-service validation. `+84` is normalised to `0` before the
 * payload is sent, because the backend only stores the local form.
 */
export const phoneSchema = z
  .string()
  .trim()
  .regex(PHONE_PATTERN, 'Số điện thoại không hợp lệ.')
  .transform(normalisePhone)

export const topupAmountSchema = z
  .string()
  .refine(
    (value) => (VALID_AMOUNTS as readonly string[]).includes(value),
    'Mệnh giá nạp tiền không hợp lệ.'
  )

export const topupFormSchema = z.object({
  phone: phoneSchema,
  amount: topupAmountSchema
})

export const billLookupSchema = z.object({
  provider: z
    .string()
    .trim()
    .regex(BILL_PROVIDER_PATTERN, 'Mã nhà cung cấp không hợp lệ.'),
  customerCode: z
    .string()
    .trim()
    .regex(BILL_CUSTOMER_CODE_PATTERN, 'Mã khách hàng không hợp lệ.')
})

export const billPayAmountSchema = z
  .string()
  .refine(
    (value) => /^\d+$/.test(value) && BigInt(value) > 0n,
    'Số tiền hóa đơn không hợp lệ.'
  )

export const billPaySchema = billLookupSchema.extend({
  amount: billPayAmountSchema
})

/** floor(amount × 3 / 100), exactly like the backend, using BigInt only. */
export function discountForAmount(amount: string): string {
  if (!/^\d+$/.test(amount)) return '0'
  return ((BigInt(amount) * DISCOUNT_PERCENT) / 100n).toString()
}

/**
 * One "intent" is the exact content the user wants to submit. Keeping the
 * payload in the string means changing any money-relevant field changes the
 * idempotency key, while retrying the same content keeps it.
 */
export function topupIntent(payload: TopupPayload): string {
  return `TOPUP|${payload.phone}|${payload.amount}`
}

export function billPayIntent(payload: BillPayPayload): string {
  return `BILL|${payload.provider}|${payload.customerCode}|${payload.amount}`
}

/**
 * The amount is never typed for a bill: it must come from the lookup response.
 * This helper makes that invariant explicit and testable.
 */
export function buildBillPayPayload(bill: BillLookup): BillPayPayload {
  return {
    provider: bill.provider,
    customerCode: bill.customerCode,
    amount: bill.amount
  }
}
