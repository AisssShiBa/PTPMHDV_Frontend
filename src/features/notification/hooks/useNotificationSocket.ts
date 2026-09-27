import { useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import type { NotificationItem } from '../types/notification.types'

const socketUrl = import.meta.env.VITE_NOTIFICATION_SOCKET_URL || 'http://localhost:3006'

export function useNotificationSocket(
  userId: string | undefined,
  accessToken: string | null,
  onNotification: (notification: NotificationItem) => void
) {
  const handlerRef = useRef(onNotification)
  handlerRef.current = onNotification

  useEffect(() => {
    if (!userId || !accessToken) return

    const socket = io(socketUrl, {
      auth: { token: accessToken },
      transports: ['websocket', 'polling']
    })

    socket.on('notification:new', (notification: NotificationItem) => {
      handlerRef.current(notification)
    })

    return () => {
      socket.disconnect()
    }
  }, [userId, accessToken])
}