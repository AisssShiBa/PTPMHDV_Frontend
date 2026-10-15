export type SocketAuth = { token?: string }
export type SocketAuthCallback = (auth: SocketAuth) => void

export function resolveSocketOrigin(apiBaseUrl: string, pageOrigin: string): string {
  return new URL(apiBaseUrl, pageOrigin).origin
}

export function createSocketAuth(
  getTicket: () => Promise<string>,
  onError: (error: unknown) => void
) {
  return (callback: SocketAuthCallback) => {
    void getTicket()
      .then((ticket) => callback({ token: ticket }))
      .catch((error: unknown) => {
        onError(error)
        callback({})
      })
  }
}
