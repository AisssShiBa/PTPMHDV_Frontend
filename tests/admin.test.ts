import { afterEach, test } from 'node:test'
import assert from 'node:assert/strict'
import type { InternalAxiosRequestConfig } from 'axios'
import api from '../src/lib/axios'
import { useAuthStore } from '../src/features/auth/stores/useAuthStore'
import { adminApi } from '../src/features/admin/api/admin.api'

const userId = '10000000-0000-4000-8000-000000000001'
const topupId = '20000000-0000-4000-8000-000000000002'
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

test('admin dashboard uses the authenticated aggregate endpoint and unwraps data', async () => {
  useAuthStore.setState({
    user: {
      id: userId,
      username: 'admin',
      firstName: 'A',
      lastName: 'B',
      email: 'admin@example.com',
      role: 'ADMIN'
    },
    accessToken: 'admin-token',
    initialized: true,
    loading: false
  })
  const stats = {
    users: { total: 12, kycBreakdown: { none: 1, pending: 2, approved: 8, rejected: 1 } },
    merchants: { total: 3, statusBreakdown: { pending: 1, approved: 2, rejected: 0 } },
    audits: { totalLogs: 40, todayActionsCount: 5, recentActivities: [] }
  }
  api.defaults.adapter = async (config) => {
    assert.equal(config.method, 'get')
    assert.equal(config.url, '/admin/dashboard')
    assert.equal(config.headers.get('Authorization'), 'Bearer admin-token')
    return response(config, { success: true, data: stats })
  }

  assert.deepEqual(await adminApi.getDashboardStats(), stats)
})

test('admin kyc list sends page, limit, status and trimmed search', async () => {
  api.defaults.adapter = async (config) => {
    assert.equal(config.url, '/admin/kyc')
    assert.deepEqual(config.params, {
      page: 2,
      limit: 20,
      status: 'PENDING',
      search: 'nguyen'
    })
    return response(config, {
      success: true,
      data: { content: [], page: 2, limit: 20, totalElements: 0, totalPages: 1 }
    })
  }

  const page = await adminApi.getKycList({
    page: 2,
    limit: 20,
    status: 'PENDING',
    search: '  nguyen  '
  })
  assert.equal(page.page, 2)
  assert.deepEqual(page.content, [])
})

test('admin kyc review sends detail only when provided and required', async () => {
  const calls: Array<{ method?: string; url?: string; body: unknown }> = []
  api.defaults.adapter = async (config) => {
    calls.push({
      method: config.method,
      url: config.url,
      body: config.data ? JSON.parse(config.data) : undefined
    })
    return response(config, {
      success: true,
      data: { id: userId, kycStatus: 'APPROVED', kycTier: 1 }
    })
  }

  await adminApi.reviewKyc(userId, 'APPROVED')
  await adminApi.reviewKyc(userId, 'REJECTED', '  Ảnh bị mờ  ')
  await adminApi.changeKycTier(userId, 2, '  Xác minh ngân hàng  ')

  assert.deepEqual(calls, [
    { method: 'post', url: `/admin/kyc/${userId}/review`, body: { status: 'APPROVED' } },
    {
      method: 'post',
      url: `/admin/kyc/${userId}/review`,
      body: { status: 'REJECTED', detail: 'Ảnh bị mờ' }
    },
    {
      method: 'patch',
      url: `/admin/kyc/${userId}/tier`,
      body: { tier: 2, reason: 'Xác minh ngân hàng' }
    }
  ])
})

test('admin kyc documents calls the audited encoded route', async () => {
  api.defaults.adapter = async (config) => {
    assert.equal(config.method, 'get')
    assert.equal(config.url, `/admin/kyc/${userId}/documents`)
    return response(config, {
      success: true,
      data: {
        frontUrl: 'https://cdn.example.com/front.jpg',
        backUrl: 'https://cdn.example.com/back.jpg',
        expiresAt: '2026-11-12T10:00:00.000Z'
      }
    })
  }

  const documents = await adminApi.getKycDocuments(userId)
  assert.equal(documents.frontUrl, 'https://cdn.example.com/front.jpg')
})

test('admin topups list, approve and reject use payment-service routes', async () => {
  const calls: Array<{ method?: string; url?: string; body: unknown; params: unknown }> = []
  api.defaults.adapter = async (config) => {
    calls.push({
      method: config.method,
      url: config.url,
      body: config.data ? JSON.parse(config.data) : undefined,
      params: config.params
    })
    if (config.method === 'get') {
      return response(config, {
        success: true,
        data: [
          {
            id: topupId,
            userId,
            amount: '100000.00',
            code: 'TOPUP-1',
            status: 'PENDING',
            expiresAt: '2026-11-12T10:00:00.000Z',
            approvedBy: null,
            approvedAt: null,
            rejectReason: null,
            walletTransactionId: null,
            vnpTransactionNo: null,
            vnpBankCode: null,
            vnpPayDate: null,
            vnpResponseCode: null,
            paymentUrl: null,
            createdAt: '2026-11-12T09:00:00.000Z',
            updatedAt: '2026-11-12T09:00:00.000Z'
          }
        ]
      })
    }
    return response(config, { success: true, message: 'ok' })
  }

  const topups = await adminApi.getTopups('PENDING')
  assert.equal(topups[0]?.amount, '100000.00')
  await adminApi.approveTopup(topupId)
  await adminApi.rejectTopup(topupId, '  Sai số tiền  ')

  assert.deepEqual(calls, [
    {
      method: 'get',
      url: '/payments/admin/topups',
      body: undefined,
      params: { status: 'PENDING' }
    },
    {
      method: 'post',
      url: `/payments/admin/topups/${topupId}/approve`,
      body: undefined,
      params: undefined
    },
    {
      method: 'post',
      url: `/payments/admin/topups/${topupId}/reject`,
      body: { reason: 'Sai số tiền' },
      params: undefined
    }
  ])
})
