import { afterEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import api from '../src/lib/axios'
import { useAuthStore } from '../src/features/auth/stores/useAuthStore'
import { notificationService } from '../src/features/notification/services/notificationService'

const user = {
  id: '10000000-0000-4000-8000-000000000001',
  username: 'user',
  firstName: 'A',
  lastName: 'B',
  email: 'a@example.com',
  role: 'USER' as const
}
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

test('notification list uses authenticated /me route and unwraps paginated data', async () => {
  useAuthStore.setState({ user, accessToken: 'test-token', initialized: true })
  const data = {
    notifications: [],
    unreadCount: 4,
    pagination: { page: 2, limit: 5, total: 7, totalPages: 2 }
  }
  api.defaults.adapter = async (config) => {
    assert.equal(config.url, '/notifications/me')
    assert.deepEqual(config.params, { page: 2, limit: 5 })
    assert.equal(config.headers.get('Authorization'), 'Bearer test-token')
    return response(config, { success: true, data })
  }

  assert.deepEqual(await notificationService.getNotifications(2, 5), data)
})

test('mark all read uses the authenticated /me route', async () => {
  useAuthStore.setState({ user, accessToken: 'test-token', initialized: true })
  api.defaults.adapter = async (config) => {
    assert.equal(config.method, 'patch')
    assert.equal(config.url, '/notifications/me/read-all')
    return response(config, { success: true, data: { updatedCount: 3 } })
  }

  assert.deepEqual(await notificationService.markAllRead(), { updatedCount: 3 })
})

test('mark read encodes the notification id and returns the updated notification', async () => {
  useAuthStore.setState({ user, accessToken: 'test-token', initialized: true })
  const notification = {
    id: 'notification/id',
    userId: user.id,
    type: 'PAYMENT_SUCCESS' as const,
    message: 'Paid',
    read: true,
    createdAt: '2026-10-11T00:00:00.000Z'
  }
  api.defaults.adapter = async (config) => {
    assert.equal(config.url, '/notifications/notification%2Fid/read')
    assert.equal(config.method, 'patch')
    return response(config, { success: true, data: notification })
  }

  assert.deepEqual(await notificationService.markRead(notification.id), notification)
})

test('socket ticket is fetched through the authenticated route and validated', async () => {
  useAuthStore.setState({ user, accessToken: 'test-token', initialized: true })
  api.defaults.adapter = async (config) => {
    assert.equal(config.url, '/notifications/socket-ticket')
    assert.equal(config.method, 'get')
    assert.equal(config.headers.get('Authorization'), 'Bearer test-token')
    return response(config, { success: true, data: { ticket: 'single-use-ticket' } })
  }

  assert.equal(await notificationService.getSocketTicket(), 'single-use-ticket')
})

test('socket ticket rejects a malformed success response', async () => {
  api.defaults.adapter = async (config) =>
    response(config, { success: true, data: { ticket: '' } })

  await assert.rejects(notificationService.getSocketTicket(), /socket ticket không hợp lệ/)
})

test('notification failures preserve backend 404 error and requestId details', async () => {
  useAuthStore.setState({ user, accessToken: 'test-token', initialized: true })
  api.defaults.adapter = async (config) => {
    throw new AxiosError('Request failed', 'ERR_BAD_RESPONSE', config, undefined, {
      data: {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Không tìm thấy thông báo.' },
        requestId: 'request-123'
      },
      status: 404,
      statusText: 'Not Found',
      headers: {},
      config
    })
  }

  await assert.rejects(notificationService.markRead('missing-id'), (error: unknown) => {
    assert.ok(error instanceof AxiosError)
    assert.equal(error.response?.status, 404)
    assert.deepEqual(error.response?.data.error, {
      code: 'NOT_FOUND',
      message: 'Không tìm thấy thông báo.'
    })
    assert.equal(error.response?.data.requestId, 'request-123')
    return true
  })
})
