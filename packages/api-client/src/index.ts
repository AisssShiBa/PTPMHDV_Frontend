import axios, {
  type AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig
} from 'axios'

export interface ApiUser {
  id: string
}

export interface SessionData {
  accessToken: string
  refreshToken?: string
  user: ApiUser
}

export interface TokenStore {
  getAccessToken(): string | null | undefined
  getRefreshToken(): string | null | undefined
  getUserId(): string | null | undefined
  setSession(session: SessionData): void
  clear(): void
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: { code?: string; message?: string } | null
  message?: string | null
  requestId?: string
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly requestId?: string

  constructor(status: number, code: string, message: string, requestId?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.requestId = requestId
  }
}

interface SessionRequestConfig extends InternalAxiosRequestConfig {
  _retried?: boolean
  _owner?: string
}

interface ApiRequestConfig extends AxiosRequestConfig {
  _owner?: string
  _retried?: boolean
}

export type Platform = 'web' | 'mobile'

export interface CreateApiClientOptions {
  baseURL: string
  platform: Platform
  tokenStore: TokenStore
  onSessionExpired?: () => void
  timeoutMs?: number
}

const localizedMessages: Record<string, string> = {
  DUPLICATE_RESOURCE: 'Thông tin đã tồn tại. Vui lòng kiểm tra lại.',
  INVALID_CREDENTIALS: 'Tên đăng nhập hoặc mật khẩu không đúng.',
  INVALID_GATEWAY_TOKEN: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  NOT_FOUND: 'Không tìm thấy dữ liệu. Vui lòng thử tải lại.',
  VALIDATION_ERROR: 'Thông tin chưa hợp lệ. Vui lòng kiểm tra các trường và thử lại.'
}

const statusMessages: Record<number, string> = {
  400: 'Thông tin chưa hợp lệ. Vui lòng kiểm tra các trường và thử lại.',
  401: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  403: 'Bạn không có quyền thực hiện thao tác này.',
  404: 'Không tìm thấy dữ liệu. Vui lòng thử tải lại.',
  409: 'Dữ liệu đã thay đổi hoặc đã tồn tại. Vui lòng tải lại.',
  413: 'Tệp quá lớn. Vui lòng chọn ảnh tối đa 5 MiB.',
  429: 'Bạn thao tác quá nhanh. Vui lòng đợi một lúc rồi thử lại.'
}

function errorFromBody(status: number, body: unknown, requestId?: string): ApiError {
  const response = body && typeof body === 'object' ? body as ApiResponse<unknown> : undefined
  const code = response?.error?.code || 'REQUEST_FAILED'
  const message = response?.error?.message ||
    (response?.message && typeof response.message === 'string' ? response.message : undefined) ||
    localizedMessages[code] ||
    statusMessages[status] ||
    'Không thể hoàn tất thao tác. Vui lòng thử lại.'

  return new ApiError(status, code, message, response?.requestId || requestId)
}

export function unwrap<T>(body: ApiResponse<T>): T {
  if (!body?.success || body.data === undefined) {
    throw errorFromBody(200, body)
  }
  return body.data
}

function normalizeAxiosError(error: AxiosError): ApiError {
  const status = error.response?.status ?? 0
  const requestId = error.response?.headers['x-request-id']
  if (error.response) return errorFromBody(status, error.response.data, requestId)

  return new ApiError(
    status,
    'NETWORK_ERROR',
    'Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối và thử lại.',
    requestId
  )
}

function isAuthRequest(url?: string): boolean {
  if (!url) return false
  try {
    return new URL(url, 'http://finvault.local').pathname.startsWith('/auth/')
  } catch {
    return url.startsWith('/auth/')
  }
}

function platformSession(session: SessionData, platform: Platform): SessionData {
  if (platform === 'mobile') return session
  const webSession = { ...session }
  delete webSession.refreshToken
  return webSession
}

export function createApiClient({
  baseURL,
  platform,
  tokenStore,
  onSessionExpired,
  timeoutMs = 20_000
}: CreateApiClientOptions) {
  const http: AxiosInstance = axios.create({
    baseURL,
    withCredentials: platform === 'web',
    timeout: timeoutMs
  })
  const refreshHttp = axios.create({
    baseURL,
    withCredentials: platform === 'web',
    timeout: timeoutMs
  })
  let refreshInFlight: { ownerId: string | undefined; promise: Promise<SessionData | null> } | null = null
  const currentOwnerId = () => tokenStore.getUserId() || undefined

  const refreshSession = (ownerId: string | undefined): Promise<SessionData | null> => {
    if (refreshInFlight) {
      return refreshInFlight.ownerId === ownerId
        ? refreshInFlight.promise
        : Promise.resolve(null)
    }

    const refreshToken = platform === 'mobile' ? tokenStore.getRefreshToken() : undefined
    const body = platform === 'mobile' ? { refreshToken } : {}
    const headers = platform === 'mobile' ? { 'x-client-platform': 'mobile' } : undefined

    const promise = (async () => {
      try {
        const response = await refreshHttp.post<ApiResponse<SessionData>>('/auth/refresh', body, { headers })
        const session = unwrap(response.data)
        if (!session.accessToken || !session.user?.id || currentOwnerId() !== ownerId) {
          return null
        }
        const savedSession = platformSession(session, platform)
        tokenStore.setSession(savedSession)
        return savedSession
      } catch {
        if (currentOwnerId() === ownerId) {
          tokenStore.clear()
          onSessionExpired?.()
        }
        return null
      }
    })()

    refreshInFlight = { ownerId, promise }
    void promise.finally(() => {
      if (refreshInFlight?.promise === promise) refreshInFlight = null
    })
    return promise
  }

  http.interceptors.request.use((config: SessionRequestConfig) => {
    const userId = currentOwnerId()
    if (config._owner === undefined) config._owner = userId
    if (config._owner !== userId) {
      return Promise.reject(new ApiError(401, 'SESSION_CHANGED', 'Tài khoản đã thay đổi. Vui lòng thử lại.'))
    }
    const accessToken = tokenStore.getAccessToken()
    if (accessToken) config.headers.set('Authorization', `Bearer ${accessToken}`)
    else config.headers.delete('Authorization')
    if (platform === 'mobile' && isAuthRequest(config.url)) {
      config.headers.set('x-client-platform', 'mobile')
    }
    return config
  })

  http.interceptors.response.use(
    response => response,
    async (unknownError: unknown) => {
      if (!axios.isAxiosError(unknownError)) return Promise.reject(unknownError)
      const error = unknownError as AxiosError
      const original = error.config as SessionRequestConfig | undefined
      if (original?.signal?.aborted) return Promise.reject(error)
      if (!original || isAuthRequest(original.url) ||
          error.response?.status !== 401 || original._retried) {
        return Promise.reject(normalizeAxiosError(error))
      }

      const ownerId = currentOwnerId()
      if (!original._owner || original._owner !== ownerId) {
        return Promise.reject(normalizeAxiosError(error))
      }
      original._retried = true

      const sentToken = original.headers.get('Authorization')
      if (sentToken === `Bearer ${tokenStore.getAccessToken()}`) {
        if (!await refreshSession(ownerId)) return Promise.reject(normalizeAxiosError(error))
      }

      if (!tokenStore.getAccessToken() || original._owner !== currentOwnerId() ||
          original.signal?.aborted) {
        return Promise.reject(normalizeAxiosError(error))
      }
      return http(original as ApiRequestConfig)
    }
  )

  const auth = {
    async signUp<T = unknown>(payload: Record<string, unknown>): Promise<T> {
      const response = await http.post<ApiResponse<T>>('/auth/signup', payload)
      return unwrap(response.data)
    },
    async signIn<T extends SessionData = SessionData>(payload: Record<string, unknown>): Promise<T> {
      const response = await http.post<ApiResponse<T>>('/auth/signin', payload)
      const session = unwrap(response.data)
      const savedSession = platformSession(session, platform) as T
      tokenStore.setSession(savedSession)
      return savedSession
    },
    async signOut<T = unknown>(): Promise<T | undefined> {
      try {
        const response = await http.post<ApiResponse<T>>('/auth/signout', {})
        return response.data?.data
      } finally {
        tokenStore.clear()
      }
    },
    async refresh<T extends SessionData = SessionData>(): Promise<T> {
      const session = await refreshSession(currentOwnerId())
      if (!session) {
        throw new ApiError(401, 'SESSION_EXPIRED', 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')
      }
      return session as T
    }
  }

  const notifications = {
    async list<T = unknown>(page = 1, limit = 10): Promise<T> {
      const response = await http.get<ApiResponse<T>>('/notifications/me', { params: { page, limit } })
      return unwrap(response.data)
    },
    async markRead<T = unknown>(id: string): Promise<T> {
      const response = await http.patch<ApiResponse<T>>(`/notifications/${encodeURIComponent(id)}/read`)
      return unwrap(response.data)
    },
    async markAllRead<T = unknown>(): Promise<T> {
      const response = await http.patch<ApiResponse<T>>('/notifications/me/read-all')
      return unwrap(response.data)
    },
    async socketTicket<T = { ticket: string }>(): Promise<T> {
      const response = await http.get<ApiResponse<T>>('/notifications/socket-ticket')
      return unwrap(response.data)
    }
  }

  return { http, auth, notifications }
}