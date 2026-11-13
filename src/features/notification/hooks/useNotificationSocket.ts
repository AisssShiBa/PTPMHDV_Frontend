import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { notificationService } from '../services/notificationService'
import type { NotificationItem } from '../types/notification.types'
import { createSocketAuth, resolveSocketOrigin } from './socketConfig'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? 'http://localhost:3000/api' : '/api')
const useMock = import.meta.env.VITE_USE_MOCK === 'true'

export function useNotificationSocket(
  userId: string | undefined,
  accessToken: string | undefined,
  onNotification: (notification: NotificationItem) => void
) {
  const handlerRef = useRef(onNotification)
  const [connection, setConnection] = useState({ userId, accessToken, connected: false })
  useEffect(() => { handlerRef.current = onNotification }, [onNotification])

  useEffect(() => {
    if (!userId || !accessToken || useMock) {
      return
    }

    let active = true
    let serverDisconnectTimer: ReturnType<typeof setTimeout> | undefined
    const socket = io(resolveSocketOrigin(apiBaseUrl, window.location.origin), {
      path: '/socket.io',
      auth: createSocketAuth(
        () => notificationService.getSocketTicket(),
        () => setConnection({ userId, accessToken, connected: false })
      )
    })

    socket.on('connect', () => {
      if (active) setConnection({ userId, accessToken, connected: true })
    })
    socket.on('connect_error', () => {
      if (active) setConnection({ userId, accessToken, connected: false })
    })
    socket.on('disconnect', (reason) => {
      if (active) setConnection({ userId, accessToken, connected: false })
      if (active && reason === 'io server disconnect') {
        serverDisconnectTimer = setTimeout(() => socket.connect(), 1000)
      }
    })
    socket.on('notification:new', (notification: NotificationItem) => {
      handlerRef.current(notification)
    })

    return () => {
      active = false
      if (serverDisconnectTimer) clearTimeout(serverDisconnectTimer)
      socket.disconnect()
    }
  }, [userId, accessToken])

  return Boolean(userId && accessToken && !useMock && connection.userId === userId && connection.accessToken === accessToken && connection.connected)
}