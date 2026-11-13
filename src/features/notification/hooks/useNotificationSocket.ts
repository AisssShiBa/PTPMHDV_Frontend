import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { notificationApi } from '../api/notification.api'
import type { NotificationItem, NotificationType } from '../types/notification.types'
import { isNotificationType } from '../types/notification.types'
import { createSocketAuth, resolveSocketOrigin } from './socketConfig'

const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL || (import.meta.env.DEV ? 'http://localhost:3000/api' : '/api')
const useMock = import.meta.env.VITE_USE_MOCK === 'true'

function parseRealtimeNotification(value: unknown): NotificationItem | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const candidate = value as Partial<NotificationItem>
  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.userId !== 'string' ||
    typeof candidate.message !== 'string' ||
    typeof candidate.createdAt !== 'string' ||
    typeof candidate.read !== 'boolean' ||
    !isNotificationType(candidate.type as NotificationType)
  ) {
    return undefined
  }
  return candidate as NotificationItem
}

/**
 * Connects to `/socket.io` with a fresh one-use ticket per auth attempt and
 * forwards validated `notification:new` payloads. The ticket/token is only
 * kept in memory (never in localStorage/sessionStorage).
 */
export function useNotificationSocket(
  userId: string | undefined,
  accessToken: string | undefined,
  onNotification: (notification: NotificationItem) => void
): boolean {
  const handlerRef = useRef(onNotification)
  const [connection, setConnection] = useState({ userId, accessToken, connected: false })

  useEffect(() => {
    handlerRef.current = onNotification
  }, [onNotification])

  useEffect(() => {
    if (!userId || !accessToken || useMock) return

    let active = true
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined
    const socket = io(resolveSocketOrigin(apiBaseUrl, window.location.origin), {
      path: '/socket.io',
      auth: createSocketAuth(
        async () => (await notificationApi.getSocketTicket()).ticket,
        () => { if (active) setConnection({ userId, accessToken, connected: false }) }
      )
    })

    socket.on('connect', () => { if (active) setConnection({ userId, accessToken, connected: true }) })
    socket.on('connect_error', () => { if (active) setConnection({ userId, accessToken, connected: false }) })
    socket.on('disconnect', (reason) => {
      if (active) setConnection({ userId, accessToken, connected: false })
      if (active && reason === 'io server disconnect') {
        reconnectTimer = setTimeout(() => socket.connect(), 1000)
      }
    })
    socket.on('notification:new', (payload: unknown) => {
      const notification = parseRealtimeNotification(payload)
      if (active && notification?.userId === userId) handlerRef.current(notification)
    })

    return () => {
      active = false
      if (reconnectTimer) clearTimeout(reconnectTimer)
      socket.disconnect()
    }
  }, [userId, accessToken])

  return Boolean(userId && accessToken && connection.userId === userId && connection.accessToken === accessToken && connection.connected)
}
