import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { delay, http, HttpResponse } from 'msw'
import { NotificationBell } from '@/features/notification/components/NotificationBell'
import { useAuthStore, MOCK_USER } from '@/features/auth/stores/useAuthStore'
import type { NotificationListResponse } from '@/features/notification/types/notification.types'
import { server } from '@/mocks/server'

vi.mock('@/features/notification/hooks/useNotificationSocket', () => ({ useNotificationSocket: () => false }))
let client: QueryClient
const first = { id: 'notice-1', userId: MOCK_USER.id, type: 'KYC_APPROVED', message: 'Thông báo thứ nhất', read: false, createdAt: '2026-11-12T00:00:00Z' }
const second = { ...first, id: 'notice-2', message: 'Thông báo thứ hai' }
const page = (number = 1) => ({ notifications: number === 1 ? [first] : [second], unreadCount: 2, pagination: { page: number, limit: 10, total: 2, totalPages: 2 } })
function mount() { render(<QueryClientProvider client={client}><NotificationBell /></QueryClientProvider>) }
beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  useAuthStore.setState({ user: MOCK_USER, accessToken: 'synthetic', initialized: true })
  server.use(http.get('*/api/notifications/me', ({ request }) => HttpResponse.json({ success: true, data: page(Number(new URL(request.url).searchParams.get('page'))) })))
})
afterEach(() => { cleanup(); client.clear(); useAuthStore.getState().clearState() })

it('decrements the unread count once when the same notification is clicked twice', async () => {
  let writes = 0
  server.use(http.patch('*/api/notifications/:id/read', async () => {
    writes += 1
    await delay(30)
    return HttpResponse.json({ success: true, data: { ...first, read: true } })
  }))
  mount()
  fireEvent.click(screen.getByRole('button', { name: 'Thông báo' }))
  fireEvent.click(await screen.findByText('Thông báo thứ nhất'))
  fireEvent.click(screen.getByText('Thông báo thứ nhất'))
  await waitFor(() => expect(writes).toBe(2))
  await waitFor(() => expect(client.getQueryData<NotificationListResponse>(['notifications', MOCK_USER.id])?.notifications[0].read).toBe(true))
  await act(async () => { await delay(50) })
  expect(client.getQueryData<NotificationListResponse>(['notifications', MOCK_USER.id])?.unreadCount).toBe(1)
})

it('loads page two again after polling refreshes the first page instead of skipping it', async () => {
  const reads: number[] = []
  server.use(http.get('*/api/notifications/me', ({ request }) => {
    const current = Number(new URL(request.url).searchParams.get('page'))
    reads.push(current)
    return HttpResponse.json({ success: true, data: page(current) })
  }))
  mount()
  fireEvent.click(screen.getByRole('button', { name: 'Thông báo' }))
  await screen.findByText('Thông báo thứ nhất')
  fireEvent.click(screen.getByRole('button', { name: 'Xem thêm' }))
  await screen.findByText('Thông báo thứ hai')
  await act(async () => { await client.invalidateQueries({ queryKey: ['notifications', MOCK_USER.id] }) })
  await waitFor(() => expect(screen.queryByText('Thông báo thứ hai')).not.toBeInTheDocument())
  fireEvent.click(screen.getByRole('button', { name: 'Xem thêm' }))
  await screen.findByText('Thông báo thứ hai')
  expect(reads).toEqual([1, 2, 1, 2])
})
