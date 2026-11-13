export type SocketAuth = { ticket?: string }
export type SocketAuthCallback = (auth: SocketAuth) => void

export function resolveSocketOrigin(apiBaseUrl: string, pageOrigin: string): string {
  return new URL(apiBaseUrl, pageOrigin).origin
}

/**
 * The backend accepts the one-use socket ticket as `auth.ticket`. A new ticket
 * is fetched for every Socket.IO auth attempt (initial connect and reconnects)
 * because tickets are single-use.
 */
export function createSocketAuth(
  getTicket: () => Promise<string>,
  onError: (error: unknown) => void
) {
  return (callback: SocketAuthCallback) => {
    void getTicket()
      .then((ticket) => callback({ ticket }))
      .catch((error: unknown) => {
        onError(error)
        callback({})
      })
  }
}
