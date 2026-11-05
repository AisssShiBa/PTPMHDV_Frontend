import { io, type Socket } from 'socket.io-client'

let socketInstance: Socket | null = null

export function getSocket(token?: string): Socket {
  if (!socketInstance) {
    const socketUrl = import.meta.env.VITE_SOCKET_URL || (import.meta.env.DEV ? 'http://localhost:3000' : '/')
    socketInstance = io(socketUrl, {
      autoConnect: false, // Chưa bật mặc định theo yêu cầu Prompt A
      auth: {
        token: token ? `Bearer ${token}` : ''
      },
      transports: ['websocket', 'polling']
    })
  } else if (token) {
    socketInstance.auth = { token: `Bearer ${token}` }
  }
  return socketInstance
}

export function disconnectSocket(): void {
  if (socketInstance) {
    socketInstance.disconnect()
    socketInstance = null
  }
}
