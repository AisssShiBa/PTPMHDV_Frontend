import { afterEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import api from '../src/lib/axios'
import { useAuthStore } from '../src/features/auth/stores/useAuthStore'
import { notificationApi } from '../src/features/notification/api/notification.api'
import {
  mergeNotificationIntoFeed,
  mergeNotificationIntoPage
} from '../src/features/notification/api/notification.queries'
import { createSocketAuth, resolveSocketOrigin } from '../src/features/notification/hooks/socketConfig'
import type { NotificationItem, NotificationListResponse } from '../src/features/notification/types/notification.types'

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

const notification = (overrides: Partial<NotificationItem> = {}): NotificationItem => ({
  id: 'notification-1',
  userId: user.id,
  type: 'PAYMENT_SUCCESS',
  message: 'Bạn đã chuyển 50.000đ cho Trần B.',
  read: false,
  createdAt: '2026-11-11T02:00:00.000Z',
  ...overrides
})

const page = (overrides: Partial<NotificationListResponse> = {}): NotificationListResponse => ({
  notifications: [notification({ id: 'existing', read: true })],
  unreadCount: 3,
  pagination: { page: 1, limit: 8, total: 9, totalPages: 2 },
  ...overrides
})

afterEach(() => {
  api.defaults.adapter = originalAdapter
  useAuthStore.getState().clearState()
})

test('notification list uses the authenticated /me route and unwraps paginated data', async () => {
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

  assert.deepEqual(await notificationApi.getNotifications(2, 5), data)
})

test('mark all read uses the authenticated /me route', async () => {
  useAuthStore.setState({ user, accessToken: 'test-token', initialized: true })
  api.defaults.adapter = async (config) => {
    assert.equal(config.method, 'patch')
    assert.equal(config.url, '/notifications/me/read-all')
    return response(config, { success: true, data: { updatedCount: 3 } })
  }

  assert.deepEqual(await notificationApi.markAllRead(), { updatedCount: 3 })
})

test('mark read encodes the notification id and returns the updated notification', async () => {
  useAuthStore.setState({ user, accessToken: 'test-token', initialized: true })
  const item = notification({ id: 'notification/id', read: true })
  api.defaults.adapter = async (config) => {
    assert.equal(config.url, '/notifications/notification%2Fid/read')
    assert.equal(config.method, 'patch')
    return response(config, { success: true, data: item })
  }

  assert.deepEqual(await notificationApi.markRead(item.id), item)
})

test('socket ticket is fetched through the authenticated route and validated', async () => {
  useAuthStore.setState({ user, accessToken: 'test-token', initialized: true })
  api.defaults.adapter = async (config) => {
    assert.equal(config.url, '/notifications/socket-ticket')
    assert.equal(config.method, 'get')
    assert.equal(config.headers.get('Authorization'), 'Bearer test-token')
    return response(config, {
      success: true,
      data: { ticket: 'single-use-ticket', expiresAt: '2026-11-11T02:01:00.000Z' }
    })
  }

  assert.deepEqual(await notificationApi.getSocketTicket(), {
    ticket: 'single-use-ticket',
    expiresAt: '2026-11-11T02:01:00.000Z'
  })
})

test('socket ticket rejects a malformed success response', async () => {
  api.defaults.adapter = async (config) =>
    response(config, { success: true, data: { ticket: '' } })

  await assert.rejects(notificationApi.getSocketTicket(), /socket ticket không hợp lệ/)
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

  await assert.rejects(notificationApi.markRead('missing-id'), (error: unknown) => {
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

test('socket origin follows an absolute API base URL', () => {
  assert.equal(
    resolveSocketOrigin('http://localhost:3000/api', 'http://localhost:5173'),
    'http://localhost:3000'
  )
})

test('relative API base URL uses the current page origin', () => {
  assert.equal(resolveSocketOrigin('/api', 'https://finvault.example'), 'https://finvault.example')
})

test('socket auth sends auth.ticket and obtains a fresh ticket every time', async () => {
  let requests = 0
  const auth = createSocketAuth(async () => `ticket-${++requests}`, () => {})
  const requestAuth = () => new Promise<{ ticket?: string }>((resolve) => auth(resolve))

  assert.deepEqual(await requestAuth(), { ticket: 'ticket-1' })
  assert.deepEqual(await requestAuth(), { ticket: 'ticket-2' })
  assert.equal(requests, 2)
})

test('socket auth reports ticket failures and never falls back to the deprecated token field', async () => {
  const ticketError = new Error('ticket unavailable')
  const errors: unknown[] = []
  const auth = createSocketAuth(async () => {
    throw ticketError
  }, (error) => errors.push(error))
  const result = await new Promise<{ ticket?: string }>((resolve) => auth(resolve))

  assert.deepEqual(errors, [ticketError])
  assert.deepEqual(result, {})
})

test('realtime merge adds a notification once and bumps unreadCount by one', () => {
  const first = mergeNotificationIntoPage(page(), notification())
  assert.equal(first.notifications.length, 2)
  assert.equal(first.unreadCount, 4)

  const second = mergeNotificationIntoPage(first, notification())
  assert.equal(second.notifications.length, 2)
  assert.equal(second.unreadCount, 4)
})

test('realtime merge deduplicates a repeated eventId even when the ids differ', () => {
  const first = mergeNotificationIntoPage(
    page(),
    notification({ id: 'socket-1', eventId: 'event-1' })
  )
  const second = mergeNotificationIntoPage(
    first,
    notification({ id: 'http-1', eventId: 'event-1' })
  )

  assert.equal(second.notifications.filter((item) => item.eventId === 'event-1').length, 1)
  assert.equal(second.unreadCount, 4)
})

test('realtime merge never increments unreadCount for already-read notifications', () => {
  const merged = mergeNotificationIntoPage(page(), notification({ read: true }))
  assert.equal(merged.unreadCount, 3)
})

test('realtime merge only bumps unreadCount on the first feed page', () => {
  const feed = {
    pages: [
      page(),
      page({ unreadCount: 3, pagination: { page: 2, limit: 8, total: 9, totalPages: 2 } })
    ],
    pageParams: [1, 2]
  }

  const merged = mergeNotificationIntoFeed(feed, notification())
  assert.equal(merged.pages[0].unreadCount, 4)
  assert.equal(merged.pages[1].unreadCount, 3)

  const repeated = mergeNotificationIntoFeed(merged, notification())
  assert.equal(repeated.pages[0].unreadCount, 4)
  assert.equal(repeated.pages[0].notifications.length, merged.pages[0].notifications.length)
})
