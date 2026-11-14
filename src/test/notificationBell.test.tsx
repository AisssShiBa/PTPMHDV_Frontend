import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { delay, http, HttpResponse } from 'msw'
import { NotificationBell } from '@/features/notification/components/NotificationBell'
import { NotificationCenter } from '@/features/notification/components/NotificationCenter'
import { notificationKeys } from '@/features/notification/api/notification.queries'
import { useAuthStore, MOCK_USER } from '@/features/auth/stores/useAuthStore'
import type { NotificationListResponse } from '@/features/notification/types/notification.types'
import { server } from '@/mocks/server'
vi.mock('@/features/notification/hooks/useNotificationSocket', () => ({ useNotificationSocket: () => false }))
let client: QueryClient
const first = { id: 'notice-1', userId: MOCK_USER.id, type: 'KYC_APPROVED', message: 'Thông báo thứ nhất', read: false, createdAt: '2026-11-12T00:00:00Z' }
const second = { ...first, id: 'notice-2', message: 'Thông báo thứ hai' }
const page = (number = 1) => ({ notifications: number === 1 ? [first] : [second], unreadCount: 2, pagination: { page: number, limit: 10, total: 2, totalPages: 2 } })
function mount(center = false) { render(<QueryClientProvider client={client}><MemoryRouter>{center ? <NotificationCenter /> : <NotificationBell />}</MemoryRouter></QueryClientProvider>) }
beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  useAuthStore.setState({ user: MOCK_USER, accessToken: 'synthetic', initialized: true })
  server.use(http.get('*/api/notifications/me', ({ request }) => HttpResponse.json({ success: true, data: page(Number(new URL(request.url).searchParams.get('page'))) })))
})
afterEach(() => { cleanup(); client.clear(); useAuthStore.getState().clearState() })
it('reconciles duplicate mark-read responses to the server unread count only once', async () => {
  let writes = 0, read = false
  server.use(
    http.get('*/api/notifications/me', () => HttpResponse.json({ success: true, data: { ...page(), notifications: [{ ...first, read }], unreadCount: read ? 1 : 2 } })),
    http.patch('*/api/notifications/:id/read', async () => {
      writes++; await delay(30); read = true
      return HttpResponse.json({ success: true, data: { ...first, read: true } })
    }),
  )
  mount()
  fireEvent.click(screen.getByRole('button', { name: 'Thông báo' }))
  fireEvent.click(await screen.findByText('Thông báo thứ nhất'))
  fireEvent.click(screen.getByText('Thông báo thứ nhất'))
  await waitFor(() => expect(writes).toBe(2))
  await waitFor(() => expect(client.getQueryData<NotificationListResponse>(notificationKeys.list(1, 8))?.notifications[0].read).toBe(true))
  expect(client.getQueryData<NotificationListResponse>(notificationKeys.list(1, 8))?.unreadCount).toBe(1)
})
it('refreshes both loaded feed pages without skipping a page or duplicating rows', async () => {
  const reads: number[] = []
  server.use(http.get('*/api/notifications/me', ({ request }) => {
    const current = Number(new URL(request.url).searchParams.get('page')); reads.push(current)
    return HttpResponse.json({ success: true, data: page(current) })
  }))
  mount(true)
  await screen.findByText('Thông báo thứ nhất')
  fireEvent.click(screen.getByRole('button', { name: 'Xem thêm thông báo' }))
  await screen.findByText('Thông báo thứ hai')
  await act(async () => { await client.invalidateQueries({ queryKey: notificationKeys.infinite(10) }) })
  expect(screen.getAllByText('Thông báo thứ hai')).toHaveLength(1)
  expect(reads).toEqual([1, 2, 1, 2])
})
