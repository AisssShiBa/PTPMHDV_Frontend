import { useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import { notificationService } from '../services/notificationService'
import type { NotificationItem } from '../types/notification.types'

const socketUrl = import.meta.env.VITE_NOTIFICATION_SOCKET_URL || 'http://localhost:3006'

export function useNotificationSocket(
  userId: string | undefined,
  onNotification: (notification: NotificationItem) => void,
  onConnectionError: (error: unknown) => void
) {
  const handlerRef = useRef(onNotification)
  const errorHandlerRef = useRef(onConnectionError)
  handlerRef.current = onNotification
  errorHandlerRef.current = onConnectionError

  useEffect(() => {
    if (!userId) return

    let active = true
    let socket: ReturnType<typeof io> | undefined

    void notificationService.getSocketTicket().then((ticket) => {
      if (!active) return
      socket = io(socketUrl, {
        auth: { token: ticket },
        transports: ['websocket', 'polling'],
        reconnection: false
      })

      socket.on('notification:new', (notification: NotificationItem) => {
        handlerRef.current(notification)
      })
      socket.on('connect_error', (error) => {
        errorHandlerRef.current(error)
      })
    }).catch((error: unknown) => {
      if (active) errorHandlerRef.current(error)
    })

    return () => {
      active = false
      socket?.disconnect()
    }
  }, [userId])
}