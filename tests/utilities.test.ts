import { afterEach, test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import type { InternalAxiosRequestConfig } from 'axios'
import api from '../src/lib/axios'
import { useAuthStore } from '../src/features/auth/stores/useAuthStore'
import { utilitiesApi } from '../src/features/utilities/api'
import { resolveIdempotencyKey } from '../src/features/utilities/idempotency'
import {
  billLookupSchema,
  billPayAmountSchema,
  billPayIntent,
  billPaySchema,
  buildBillPayPayload,
  discountForAmount,
  normalisePhone,
  phoneSchema,
  topupAmountSchema,
  topupFormSchema,
  topupIntent
} from '../src/features/utilities/schemas'
import { VALID_AMOUNTS } from '../src/features/utilities/constants'
import {
  isRetryableCheckoutError,
  isRetryableConfirmError,
  utilitiesErrorMessage
} from '../src/features/utilities/errors'
import {
  isTerminalOrderStatus,
  orderPollInterval,
  orderStatusLabel
} from '../src/features/utilities/status'
import type { UtilityOrderView } from '../src/features/utilities/types'

const originalAdapter = api.defaults.adapter

const response = (config: InternalAxiosRequestConfig, data: unknown) => ({
  data,
  status: 200,
  statusText: 'OK',
  headers: {},
  config
})

const orderView = (overrides: Partial<UtilityOrderView> = {}): UtilityOrderView => ({
  orderId: '11111111-1111-4111-8111-111111111111',
  type: 'TELCO_TOPUP',
  status: 'PENDING_PAYMENT',
  amount: '100000',
  discountAmount: '3000',
  target: '0987654321',
  providerCode: null,
  providerRef: null,
  paymentId: 'pay-utilities-1',
  failureReason: null,
  createdAt: '2026-11-12T08:00:00.000Z',
  updatedAt: '2026-11-12T08:00:00.000Z',
  ...overrides
})

const axiosError = (status: number, code: string) => ({
  isAxiosError: true,
  response: {
    status,
    data: { success: false, error: { code, message: 'raw english message' } }
  }
})

afterEach(() => {
  api.defaults.adapter = originalAdapter
  useAuthStore.getState().clearState()
})

test('top-up posts the exact body and the Idempotency-Key header', async () => {
  let captured:
    | { method?: string; url?: string; body: unknown; key?: string }
    | undefined
  const order = orderView()
  api.defaults.adapter = async (config) => {
    captured = {
      method: config.method,
      url: config.url,
      body: config.data ? JSON.parse(config.data) : undefined,
      key: config.headers.get('Idempotency-Key') as string | undefined
    }
    return response(config, { success: true, data: order })
  }

  const result = await utilitiesApi.topup(
    { phone: '0987654321', amount: '100000' },
    'utility-topup-key-1'
  )

  assert.deepEqual(result, order)
  assert.equal(captured?.method, 'post')
  assert.equal(captured?.url, '/utilities/topup')
  assert.equal(captured?.key, 'utility-topup-key-1')
  assert.deepEqual(captured?.body, { phone: '0987654321', amount: '100000' })
})

test('bill lookup sends provider/customerCode as query params', async () => {
  let captured: { method?: string; url?: string; params: unknown } | undefined
  const bill = {
    provider: 'EVN',
    customerCode: 'PE0100028491',
    customerName: 'Khách hàng 8491',
    amount: '101000',
    period: '2026-10',
    amountFormatted: '101.000đ'
  }
  api.defaults.adapter = async (config) => {
    captured = { method: config.method, url: config.url, params: config.params }
    return response(config, { success: true, data: bill })
  }

  assert.deepEqual(await utilitiesApi.lookupBill('EVN', 'PE0100028491'), bill)
  assert.deepEqual(captured, {
    method: 'get',
    url: '/utilities/bills/lookup',
    params: { provider: 'EVN', customerCode: 'PE0100028491' }
  })
})

test('bill payment posts lookup amount as a string with Idempotency-Key', async () => {
  let captured:
    | { method?: string; url?: string; body: unknown; key?: string }
    | undefined
  const order = orderView({
    type: 'BILL_PAY',
    target: 'PE0100028491',
    providerCode: 'EVN',
    amount: '101000',
    discountAmount: '3030'
  })
  api.defaults.adapter = async (config) => {
    captured = {
      method: config.method,
      url: config.url,
      body: config.data ? JSON.parse(config.data) : undefined,
      key: config.headers.get('Idempotency-Key') as string | undefined
    }
    return response(config, { success: true, data: order })
  }

  const result = await utilitiesApi.payBill(
    { provider: 'EVN', customerCode: 'PE0100028491', amount: '101000' },
    'utility-bill-key-1'
  )

  assert.deepEqual(result, order)
  assert.equal(captured?.method, 'post')
  assert.equal(captured?.url, '/utilities/bills/pay')
  assert.equal(captured?.key, 'utility-bill-key-1')
  assert.deepEqual(captured?.body, {
    provider: 'EVN',
    customerCode: 'PE0100028491',
    amount: '101000'
  })
})

test('order tracking uses GET /utilities/orders/:id and encodes the id', async () => {
  let captured: { method?: string; url?: string } | undefined
  const order = orderView({ status: 'SUCCESS' })
  api.defaults.adapter = async (config) => {
    captured = { method: config.method, url: config.url }
    return response(config, { success: true, data: order })
  }

  assert.deepEqual(await utilitiesApi.getOrder('order/with space'), order)
  assert.deepEqual(captured, {
    method: 'get',
    url: '/utilities/orders/order%2Fwith%20space'
  })
})

test('phone schema accepts Vietnamese mobile numbers and normalises +84', () => {
  for (const valid of ['0987654321', '+84987654321', ' 0912345678 ']) {
    assert.equal(phoneSchema.safeParse(valid).success, true, valid)
  }
  assert.equal(phoneSchema.parse('+84987654321'), '0987654321')
  assert.equal(phoneSchema.parse(' 0912345678 '), '0912345678')
  assert.equal(normalisePhone('+84321234567'), '0321234567')

  for (const invalid of [
    '',
    '098765432',
    '09876543210',
    '0187654321',
    '0287654321',
    '0987abc321',
    '+84123456789',
    '  '
  ]) {
    assert.equal(phoneSchema.safeParse(invalid).success, false, invalid)
  }
})

test('top-up amount schema accepts only the six backend denominations', () => {
  for (const amount of VALID_AMOUNTS) {
    assert.equal(topupAmountSchema.safeParse(amount).success, true, amount)
  }
  for (const invalid of ['', '1000', '15000', '10000.0', '10000 ', ' 10000', 'abc', '0']) {
    assert.equal(topupAmountSchema.safeParse(invalid).success, false, invalid)
  }
  const parsed = topupFormSchema.parse({ phone: '+84987654321', amount: '100000' })
  assert.deepEqual(parsed, { phone: '0987654321', amount: '100000' })
})

test('bill schemas mirror backend provider/customer lengths and positive amount', () => {
  assert.equal(
    billLookupSchema.safeParse({ provider: 'EVN', customerCode: 'PE0100028491' }).success,
    true
  )
  assert.equal(billLookupSchema.safeParse({ provider: 'E', customerCode: 'KH01' }).success, false)
  assert.equal(
    billLookupSchema.safeParse({ provider: 'E'.repeat(33), customerCode: 'KH01' }).success,
    false
  )
  assert.equal(
    billLookupSchema.safeParse({ provider: 'EV N', customerCode: 'KH01' }).success,
    false
  )
  assert.equal(billLookupSchema.safeParse({ provider: 'EVN', customerCode: 'A' }).success, false)
  assert.equal(
    billLookupSchema.safeParse({ provider: 'EVN', customerCode: 'A'.repeat(64) }).success,
    true
  )
  assert.equal(
    billLookupSchema.safeParse({ provider: 'EVN', customerCode: 'A'.repeat(65) }).success,
    false
  )
  assert.equal(
    billLookupSchema.safeParse({ provider: 'EVN', customerCode: 'A B' }).success,
    false
  )

  for (const invalid of ['', '0', '-1', '1.5', 'abc', ' 101000 ']) {
    assert.equal(billPayAmountSchema.safeParse(invalid).success, false, invalid)
  }
  assert.equal(billPayAmountSchema.safeParse('101000').success, true)
  assert.equal(
    billPaySchema.safeParse({
      provider: 'EVN',
      customerCode: 'PE0100028491',
      amount: '101000'
    }).success,
    true
  )
})

test('bill payment payload always uses the lookup amount', () => {
  const bill = {
    provider: 'EVN',
    customerCode: 'PE0100028491',
    customerName: 'Khách hàng 8491',
    amount: '101000',
    period: '2026-10'
  }
  assert.deepEqual(buildBillPayPayload(bill), {
    provider: 'EVN',
    customerCode: 'PE0100028491',
    amount: '101000'
  })
})

test('discount is floor(amount × 3 / 100) using BigInt', () => {
  assert.equal(discountForAmount('10000'), '300')
  assert.equal(discountForAmount('20000'), '600')
  assert.equal(discountForAmount('50000'), '1500')
  assert.equal(discountForAmount('100000'), '3000')
  assert.equal(discountForAmount('200000'), '6000')
  assert.equal(discountForAmount('500000'), '15000')
  assert.equal(discountForAmount('not-money'), '0')
})

test('idempotency key is reused for the same intent and changes with the form', () => {
  let generated = 0
  const generate = () => `key-${++generated}`

  const first = resolveIdempotencyKey(null, 'TOPUP|0987654321|100000', generate)
  assert.deepEqual(first, { intent: 'TOPUP|0987654321|100000', key: 'key-1' })

  const retry = resolveIdempotencyKey(first, 'TOPUP|0987654321|100000', generate)
  assert.equal(retry.key, 'key-1')
  assert.equal(generated, 1)

  const changed = resolveIdempotencyKey(retry, 'TOPUP|0987654321|200000', generate)
  assert.equal(changed.key, 'key-2')
  assert.equal(generated, 2)

  const topup = topupIntent({ phone: '0987654321', amount: '100000' })
  assert.equal(topup, 'TOPUP|0987654321|100000')
  const bill = billPayIntent({
    provider: 'EVN',
    customerCode: 'PE0100028491',
    amount: '101000'
  })
  assert.equal(bill, 'BILL|EVN|PE0100028491|101000')
})

test('polling stops exactly at the four terminal order statuses', () => {
  for (const status of ['SUCCESS', 'FAILED', 'REFUNDED', 'REFUND_FAILED']) {
    assert.equal(isTerminalOrderStatus(status), true, status)
    assert.equal(orderPollInterval(status), false, status)
  }
  for (const status of ['PENDING_PAYMENT', 'PAID', 'PROVIDER_PENDING', 'REFUND_REQUESTED']) {
    assert.equal(isTerminalOrderStatus(status), false, status)
    assert.equal(orderPollInterval(status), 2000, status)
  }
  assert.equal(orderStatusLabel('REFUNDED'), 'Đã hoàn tiền')
  assert.equal(orderStatusLabel('FUTURE_STATUS'), 'Trạng thái FUTURE_STATUS')
})

test('every documented error code maps to Vietnamese, never raw backend text', () => {
  const codes = [
    'INVALID_PHONE',
    'INVALID_AMOUNT',
    'INVALID_PROVIDER',
    'INVALID_CUSTOMER_CODE',
    'IDEMPOTENCY_KEY_REQUIRED',
    'IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD',
    'LIMIT_EXCEEDED',
    'INSUFFICIENT_FUNDS',
    'BILL_NOT_FOUND',
    'BILL_AMOUNT_MISMATCH',
    'PROVIDER_TIMEOUT',
    'PIN_LOCKED',
    'INVALID_PIN',
    'PIN_NOT_SETUP',
    'TXN_TOKEN_MISSING',
    'TXN_TOKEN_EXPIRED',
    'TXN_TOKEN_INVALID',
    'TXN_TOKEN_UNKNOWN',
    'PIN_UNKNOWN'
  ]
  for (const code of codes) {
    const message = utilitiesErrorMessage(axiosError(400, code))
    assert.notEqual(message, 'raw english message', code)
    assert.match(message, /[àáảãạăâêôơưđÀÁẢÃẠĂÂÊÔƠƯĐ]/u, code)
  }
})

test('retry classification separates unknown outcomes from definite 4xx', () => {
  assert.equal(isRetryableCheckoutError({ isAxiosError: true }), true)
  assert.equal(isRetryableCheckoutError(axiosError(502, 'UPSTREAM_UNAVAILABLE')), true)
  assert.equal(isRetryableCheckoutError(axiosError(504, 'GATEWAY_TIMEOUT')), true)
  assert.equal(isRetryableCheckoutError(axiosError(400, 'INVALID_PHONE')), false)

  assert.equal(isRetryableConfirmError({ isAxiosError: true }), true)
  assert.equal(isRetryableConfirmError(axiosError(504, 'PAYMENT_PROCESSING')), true)
  assert.equal(isRetryableConfirmError(axiosError(401, 'TXN_TOKEN_EXPIRED')), false)
})

test('the page is thin and no fake timers/random ids/Number(money) remain', () => {
  const root = process.cwd()
  const page = fs.readFileSync(path.resolve(root, 'src/pages/UtilitiesPage.tsx'), 'utf8')
  assert.match(page, /@\/features\/utilities/)
  assert.doesNotMatch(page, /\bNumber\s*\(/)
  assert.doesNotMatch(page, /setTimeout/)
  assert.doesNotMatch(page, /Math\.random/)
  assert.doesNotMatch(page, /1250000/)

  const featureFiles = [
    'src/features/utilities/api.ts',
    'src/features/utilities/queries.ts',
    'src/features/utilities/schemas.ts',
    'src/features/utilities/components/UtilitiesWorkspace.tsx',
    'src/features/utilities/components/TopupForm.tsx',
    'src/features/utilities/components/BillPaymentForm.tsx',
    'src/features/utilities/components/PaymentSummary.tsx',
    'src/features/utilities/components/OrderStatusPanel.tsx'
  ]
  for (const file of featureFiles) {
    const content = fs.readFileSync(path.resolve(root, file), 'utf8')
    assert.doesNotMatch(content, /setTimeout/, file)
    assert.doesNotMatch(content, /Math\.random/, file)
    assert.doesNotMatch(content, /\bNumber\s*\(/, file)
  }
})
