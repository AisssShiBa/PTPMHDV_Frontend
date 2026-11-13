import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient
} from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth'
import { notificationApi } from './notification.api'
import type { NotificationItem, NotificationListResponse } from '../types/notification.types'

export const notificationKeys = {
  all: ['notifications'] as const,
  lists: (owner = useAuthStore.getState().user?.id ?? '') => [...notificationKeys.all, 'list', owner] as const,
  list: (page: number, limit: number) =>
    [...notificationKeys.lists(), 'page', { page, limit }] as const,
  infinite: (limit: number) => [...notificationKeys.lists(), 'infinite', { limit }] as const
}

type NotificationFeed = InfiniteData<NotificationListResponse, number>

const sameNotification = (left: NotificationItem, right: NotificationItem): boolean => {
  if (left.id === right.id) return true
  return Boolean(left.eventId && right.eventId && left.eventId === right.eventId)
}

const containsNotification = (
  notifications: NotificationItem[] | undefined,
  notification: NotificationItem
): boolean => notifications?.some((item) => sameNotification(item, notification)) ?? false

/**
 * Adds a realtime notification to one cached page and bumps `unreadCount` only
 * for the first page, so the badge cannot be incremented twice for the same
 * notification (dedupe by id, then by eventId).
 */
export function mergeNotificationIntoPage(
  data: NotificationListResponse,
  notification: NotificationItem
): NotificationListResponse {
  if (containsNotification(data.notifications, notification)) return data
  const limit = Math.max(data.pagination.limit, 1)
  const notifications = [notification, ...data.notifications].slice(0, limit)
  return {
    ...data,
    notifications,
    unreadCount:
      data.pagination.page === 1 && !notification.read ? data.unreadCount + 1 : data.unreadCount,
    pagination: { ...data.pagination, total: data.pagination.total + 1 }
  }
}

export function mergeNotificationIntoFeed(
  data: NotificationFeed,
  notification: NotificationItem
): NotificationFeed {
  if (data.pages.some((page) => containsNotification(page.notifications, notification))) return data
  return {
    ...data,
    pages: data.pages.map((page, index) =>
      index === 0
        ? mergeNotificationIntoPage(page, notification)
        : {
            ...page,
            pagination: { ...page.pagination, total: page.pagination.total + 1 }
          }
    )
  }
}

/** True when the notification is already in any cached list (used before toasting). */
export function hasNotificationInCache(
  queryClient: QueryClient,
  notification: NotificationItem
): boolean {
  const listCaches = queryClient.getQueriesData<NotificationListResponse>({
    queryKey: notificationKeys.lists()
  })
  return listCaches.some(([, data]) => {
    if (!data) return false
    if ('notifications' in data) {
      return containsNotification(data.notifications, notification)
    }
    if ('pages' in data) {
      return (data as NotificationFeed).pages.some((page) =>
        containsNotification(page.notifications, notification)
      )
    }
    return false
  })
}

/** Writes a socket notification into every cached list without duplicating it. */
export function applyRealtimeNotification(
  queryClient: QueryClient,
  notification: NotificationItem
): void {
  queryClient.setQueriesData<NotificationListResponse>({ queryKey: notificationKeys.lists() }, (data) =>
    data && 'notifications' in data ? mergeNotificationIntoPage(data, notification) : data
  )
  queryClient.setQueriesData<NotificationFeed>({ queryKey: notificationKeys.lists() }, (data) =>
    data && 'pages' in data ? mergeNotificationIntoFeed(data, notification) : data
  )
}

/** Bell dropdown: one page of the newest notifications. */
export function useNotificationList(page = 1, limit = 8, options?: { enabled?: boolean }) {
  const owner = useAuthStore(state => state.user?.id)
  return useQuery<NotificationListResponse, Error>({
    queryKey: notificationKeys.list(page, limit),
    queryFn: () => notificationApi.getNotifications(page, limit),
    staleTime: 15_000,
    gcTime: 0,
    enabled: Boolean(owner) && options?.enabled !== false
  })
}

/** Full page: keeps loading pages while `pagination.totalPages` is not reached. */
export function useNotificationFeed(limit = 10, options?: { enabled?: boolean }) {
  const owner = useAuthStore(state => state.user?.id)
  return useInfiniteQuery<NotificationListResponse, Error, NotificationFeed, readonly unknown[], number>({
    queryKey: notificationKeys.infinite(limit),
    queryFn: ({ pageParam }) => notificationApi.getNotifications(pageParam, limit),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.page < lastPage.pagination.totalPages
        ? lastPage.pagination.page + 1
        : undefined,
    staleTime: 15_000,
    gcTime: 0,
    enabled: Boolean(owner) && options?.enabled !== false
  })
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient()
  return useMutation<NotificationItem, Error, string>({
    mutationFn: (id) => notificationApi.markRead(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.lists() })
    }
  })
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient()
  return useMutation<{ updatedCount: number }, Error, void>({
    mutationFn: () => notificationApi.markAllRead(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.lists() })
    }
  })
}
