import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from '@/mocks/server'
import { useAuthStore } from '@/features/auth/stores/useAuthStore'
import { NotificationCenter } from '@/features/notification/components/NotificationCenter'
import { NotificationListItem } from '@/features/notification/components/NotificationList'
import type { NotificationItem } from '@/features/notification/types/notification.types'

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  )
}

const notification = (overrides: Partial<NotificationItem> = {}): NotificationItem => ({
  id: 'notification-1',
  eventId: 'event-1',
  userId: 'user-1',
  type: 'PAYMENT_SUCCESS',
  message: 'Bạn đã chuyển 50.000đ cho Trần B.',
  read: false,
  createdAt: new Date().toISOString(),
  ...overrides
})

const listResponse = (notifications: NotificationItem[], unreadCount: number, totalPages = 1) =>
  HttpResponse.json({
    success: true,
    data: {
      notifications,
      unreadCount,
      pagination: { page: 1, limit: 10, total: notifications.length, totalPages }
    }
  })

describe('NotificationCenter [N15]', () => {
  beforeEach(() => {
    server.resetHandlers()
    useAuthStore.setState({
      user: {
        id: 'user-1',
        username: 'user',
        firstName: 'A',
        lastName: 'B',
        email: 'a@example.com',
        role: 'USER'
      },
      accessToken: null,
      initialized: true
    })
  })

  it('hiển thị trạng thái loading trong khi chờ API', async () => {
    let release: (() => void) | undefined
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    server.use(
      http.get('*/api/notifications/me', async () => {
        await gate
        return listResponse([], 0)
      })
    )

    renderWithProviders(<NotificationCenter />)

    expect(screen.getByText('Đang tải thông báo…')).toBeDefined()
    release?.()
    await waitFor(() => expect(screen.getByText('Không có thông báo nào')).toBeDefined())
  })

  it('hiển thị lỗi kèm nút thử lại và tải lại thành công', async () => {
    let attempts = 0
    server.use(
      http.get('*/api/notifications/me', () => {
        attempts += 1
        if (attempts === 1) {
          return HttpResponse.json(
            { success: false, error: { code: 'INTERNAL_ERROR', message: 'boom' } },
            { status: 500 }
          )
        }
        return listResponse([notification()], 1)
      })
    )

    renderWithProviders(<NotificationCenter />)

    await waitFor(() => {
      expect(screen.getByText('Không thể tải dữ liệu')).toBeDefined()
      expect(screen.getByRole('button', { name: /Thử lại/ })).toBeDefined()
    })

    fireEvent.click(screen.getByRole('button', { name: /Thử lại/ }))

    await waitFor(() => {
      expect(attempts).toBe(2)
      expect(screen.getByText('Bạn đã chuyển 50.000đ cho Trần B.')).toBeDefined()
    })
  })

  it('hiển thị trạng thái rỗng khi chưa có thông báo', async () => {
    server.use(http.get('*/api/notifications/me', () => listResponse([], 0)))

    renderWithProviders(<NotificationCenter />)

    await waitFor(() => expect(screen.getByText('Không có thông báo nào')).toBeDefined())
  })

  it('hiển thị danh sách thật và số chưa đọc từ API', async () => {
    server.use(
      http.get('*/api/notifications/me', () =>
        listResponse(
          [
            notification(),
            notification({
              id: 'notification-2',
              type: 'CASHOUT_SUCCEEDED',
              message: 'Lệnh rút 200.000đ của bạn đã thành công.',
              read: true,
              createdAt: '2026-10-01T02:00:00.000Z'
            })
          ],
          1
        )
      )
    )

    renderWithProviders(<NotificationCenter />)

    await waitFor(() => {
      expect(screen.getByText('Bạn đã chuyển 50.000đ cho Trần B.')).toBeDefined()
      expect(screen.getByText('Lệnh rút 200.000đ của bạn đã thành công.')).toBeDefined()
      expect(screen.getByText('1 thông báo mới')).toBeDefined()
      expect(screen.getByText('Rút tiền thành công')).toBeDefined()
    })
  })

  it('không crash khi backend trả loại thông báo mới chưa khai báo', () => {
    renderWithProviders(
      <NotificationListItem
        notification={notification({ type: 'SOMETHING_NEW' as NotificationItem['type'] })}
        onMarkRead={() => {}}
      />
    )
    expect(screen.getByText('Thông báo')).toBeDefined()
    expect(screen.getByText('Bạn đã chuyển 50.000đ cho Trần B.')).toBeDefined()
  })
})
