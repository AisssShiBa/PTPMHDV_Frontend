import { afterEach, test } from 'node:test'
import assert from 'node:assert/strict'
import type { InternalAxiosRequestConfig } from 'axios'
import api from '../src/lib/axios'
import { useAuthStore } from '../src/features/auth/stores/useAuthStore'
import { reconciliationApi } from '../src/features/admin/reconciliation/api'
import {
  adjustAmountSchema,
  adjustAnomalySchema
} from '../src/features/admin/reconciliation/schemas'

const originalAdapter = api.defaults.adapter

const response = (config: InternalAxiosRequestConfig, data: unknown) => ({
  data,
  status: 200,
  statusText: 'OK',
  headers: {},
  config
})

afterEach(() => {
  api.defaults.adapter = originalAdapter
  useAuthStore.getState().clearState()
})

test('run reconciliation posts to the real route with the mode query', async () => {
  const calls: Array<{ method?: string; url?: string; params: unknown }> = []
  const report = { id: 7, isBalanced: true, anomalies: [] }
  api.defaults.adapter = async (config) => {
    calls.push({ method: config.method, url: config.url, params: config.params })
    return response(config, { success: true, data: report })
  }

  assert.deepEqual(await reconciliationApi.run('quick'), report)
  assert.deepEqual(await reconciliationApi.run('full'), report)
  assert.deepEqual(calls, [
    { method: 'post', url: '/admin/reconciliation/run', params: { mode: 'quick' } },
    { method: 'post', url: '/admin/reconciliation/run', params: { mode: 'full' } }
  ])
})

test('report list and detail use the admin-service routes and pagination', async () => {
  const calls: Array<{ method?: string; url?: string; params: unknown }> = []
  const page = { items: [{ id: 9, isBalanced: false, anomalies: [] }], page: 2, limit: 10, total: 11 }
  api.defaults.adapter = async (config) => {
    calls.push({ method: config.method, url: config.url, params: config.params })
    if (config.url?.endsWith('/reports')) return response(config, { success: true, data: page })
    return response(config, { success: true, data: page.items[0] })
  }

  assert.deepEqual(await reconciliationApi.listReports(2, 10), page)
  assert.equal((await reconciliationApi.getReport(9)).id, 9)
  assert.deepEqual(calls, [
    { method: 'get', url: '/admin/reconciliation/reports', params: { page: 2, limit: 10 } },
    { method: 'get', url: '/admin/reconciliation/reports/9', params: undefined }
  ])
})

test('adjustment posts the exact body and no Idempotency-Key header', async () => {
  let captured: { url?: string; body: unknown; idempotency?: string } | undefined
  const result = {
    anomalyId: '42',
    status: 'SUCCEEDED',
    referenceId: 'adjust-anomaly-42',
    transactionId: 'tx-1',
    replayed: false
  }
  api.defaults.adapter = async (config) => {
    captured = {
      url: config.url,
      body: config.data ? JSON.parse(config.data) : undefined,
      idempotency: config.headers.get('Idempotency-Key') as string | undefined
    }
    return response(config, { success: true, data: result })
  }

  const adjusted = await reconciliationApi.adjustAnomaly('42', {
    direction: 'CREDIT',
    amount: '50000',
    reason: 'Bù lệch theo biên bản BB-01'
  })

  assert.deepEqual(adjusted, result)
  assert.equal(captured?.url, '/admin/reconciliation/anomalies/42/adjust')
  assert.deepEqual(captured?.body, {
    direction: 'CREDIT',
    amount: '50000',
    reason: 'Bù lệch theo biên bản BB-01'
  })
  assert.equal(captured?.idempotency, undefined)
})

test('adjustment amount is a positive integer string validated with BigInt', () => {
  for (const invalid of ['', '0', '-1', '1.5', '1e5', ' 12a', '9999999999999999999']) {
    assert.equal(adjustAmountSchema.safeParse(invalid).success, false, `must reject "${invalid}"`)
  }
  assert.equal(adjustAmountSchema.safeParse('1').success, true)
  assert.equal(adjustAmountSchema.safeParse('999999999999999999').success, true)
  assert.equal(adjustAmountSchema.safeParse(' 50000 ').success, true)
})

test('adjustment reason must be 5..500 characters and direction CREDIT/DEBIT', () => {
  const base = { direction: 'CREDIT' as const, amount: '1000' }
  assert.equal(adjustAnomalySchema.safeParse({ ...base, reason: 'abcd' }).success, false)
  assert.equal(adjustAnomalySchema.safeParse({ ...base, reason: 'abcde' }).success, true)
  assert.equal(adjustAnomalySchema.safeParse({ ...base, reason: 'x'.repeat(500) }).success, true)
  assert.equal(adjustAnomalySchema.safeParse({ ...base, reason: 'x'.repeat(501) }).success, false)
  assert.equal(
    adjustAnomalySchema.safeParse({ ...base, direction: 'IN', reason: 'abcde' }).success,
    false
  )
})
