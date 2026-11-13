// Feature: notification — the only public entry point for this feature.
export { NotificationBell } from './components/NotificationBell'
export { NotificationCenter } from './components/NotificationCenter'
export { NotificationListItem, NotificationIcon } from './components/NotificationList'
export { notificationApi } from './api/notification.api'
export {
  notificationKeys,
  useNotificationList,
  useNotificationFeed,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  applyRealtimeNotification,
  hasNotificationInCache
} from './api/notification.queries'
export { useNotificationSocket } from './hooks/useNotificationSocket'
export { createSocketAuth, resolveSocketOrigin } from './hooks/socketConfig'
export type {
  NotificationItem,
  NotificationListResponse,
  NotificationType,
  NotificationFilter,
  NotificationSocketTicket
} from './types/notification.types'
export { isNotificationType, notificationFilter } from './types/notification.types'
