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
  const [connected, setConnected] = useState(false)
  handlerRef.current = onNotification

  useEffect(() => {
    if (!userId || !accessToken || useMock) {
      setConnected(false)
      return
    }

    let active = true
    let serverDisconnectTimer: ReturnType<typeof setTimeout> | undefined
    setConnected(false)
    const socket = io(resolveSocketOrigin(apiBaseUrl, window.location.origin), {
      path: '/socket.io',
      auth: createSocketAuth(
        () => notificationService.getSocketTicket(),
        (error) => console.error('Failed to fetch notification socket ticket', error)
      )
    })

    socket.on('connect', () => {
      if (active) setConnected(true)
    })
    socket.on('connect_error', (error) => {
      console.error('Notification socket connection failed', error)
    })
    socket.on('disconnect', (reason) => {
      if (active) setConnected(false)
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

  return connected
}