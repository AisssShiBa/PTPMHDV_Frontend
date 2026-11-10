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

export interface ApiErrorDetails {
  limitType?: 'PER_TXN' | 'PER_DAY' | 'PER_MONTH' | string
  limit?: string
  used?: string
  remaining?: string
  kycTier?: number
  attemptsLeft?: number
  lockedUntil?: string
  [key: string]: unknown
}

export interface ApiErrorPayload {
  code?: string
  message?: string
  details?: ApiErrorDetails
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: ApiErrorPayload | null
  message?: string | null
  requestId?: string
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: ApiErrorDetails
  readonly requestId?: string
  readonly isTimeout: boolean
  readonly isNetwork: boolean

  constructor(
    status: number,
    code: string,
    message: string,
    requestId?: string,
    details?: ApiErrorDetails,
    isTimeout = false,
    isNetwork = false
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.requestId = requestId
    this.details = details
    this.isTimeout = isTimeout
    this.isNetwork = isNetwork
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

type RefreshResult =
  | { session: SessionData; error?: never }
  | { session?: never; error: ApiError }

const localizedMessages: Record<string, string> = {
  DUPLICATE_RESOURCE: 'Thông tin đã tồn tại. Vui lòng kiểm tra lại.',
  INVALID_CREDENTIALS: 'Tên đăng nhập hoặc mật khẩu không đúng.',
  INVALID_GATEWAY_TOKEN: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  NOT_FOUND: 'Không tìm thấy dữ liệu. Vui lòng thử tải lại.',
  VALIDATION_ERROR: 'Thông tin chưa hợp lệ. Vui lòng kiểm tra các trường và thử lại.',
  INSUFFICIENT_FUNDS: 'Số dư khả dụng trong ví không đủ để thực hiện giao dịch.',
  LIMIT_EXCEEDED: 'Giao dịch vượt quá hạn mức cho phép.',
  PIN_INVALID: 'Mã PIN giao dịch không chính xác.',
  PIN_LOCKED: 'Tài khoản bị tạm khóa giao dịch do nhập sai mã PIN nhiều lần.',
  PIN_NOT_SET: 'Chưa thiết lập mã PIN giao dịch.',
  TRANSACTION_TOKEN_EXPIRED: 'Phiên xác thực giao dịch đã hết hạn. Vui lòng nhập lại mã PIN.',
  TXN_TOKEN_REUSED: 'Mã xác thực giao dịch đã được sử dụng.',
  PAYMENT_EXPIRED: 'Giao dịch đã hết hạn xử lý.',
  PAYMENT_NOT_PENDING: 'Giao dịch đã được xử lý hoặc không ở trạng thái chờ.'
}

const statusMessages: Record<number, string> = {
  400: 'Thông tin chưa hợp lệ. Vui lòng kiểm tra các trường và thử lại.',
  401: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
  403: 'Bạn không có quyền thực hiện thao tác này.',
  404: 'Không tìm thấy dữ liệu. Vui lòng thử tải lại.',
  409: 'Dữ liệu đã thay đổi hoặc đã tồn tại. Vui lòng tải lại.',
  410: 'Giao dịch đã hết hạn.',
  413: 'Tệp quá lớn. Vui lòng chọn ảnh tối đa 5 MiB.',
  422: 'Dữ liệu giao dịch không hợp lệ hoặc vượt hạn mức.',
  423: 'Tài khoản hoặc tính năng đang bị tạm khóa.',
  429: 'Bạn thao tác quá nhanh. Vui lòng đợi một lúc rồi thử lại.'
}

function errorFromBody(status: number, body: unknown, requestId?: string): ApiError {
  const response = body && typeof body === 'object' ? (body as ApiResponse<unknown>) : undefined
  const code = response?.error?.code || 'REQUEST_FAILED'
  const details = response?.error?.details
  const message =
    response?.error?.message ||
    (response?.message && typeof response.message === 'string' ? response.message : undefined) ||
    localizedMessages[code] ||
    statusMessages[status] ||
    'Không thể hoàn tất thao tác. Vui lòng thử lại.'

  return new ApiError(status, code, message, response?.requestId || requestId, details)
}

export function unwrap<T>(body: ApiResponse<T>): T {
  if (!body?.success || body.data === undefined) {
    throw errorFromBody(200, body)
  }
  return body.data
}

export function normalizeAxiosError(error: AxiosError): ApiError {
  const status = error.response?.status ?? 0
  const requestId = (error.response?.headers?.['x-request-id'] as string) || undefined
  const isTimeout = error.code === 'ECONNABORTED' || (error.message && error.message.toLowerCase().includes('timeout'))
  const isNetwork = !error.response && !isTimeout

  if (error.response) {
    return errorFromBody(status, error.response.data, requestId)
  }

  if (isTimeout) {
    return new ApiError(
      0,
      'TIMEOUT',
      'Yêu cầu vượt quá thời gian phản hồi. Vui lòng kiểm tra lại trạng thái giao dịch.',
      requestId,
      undefined,
      true,
      false
    )
  }

  return new ApiError(
    status,
    'NETWORK_ERROR',
    'Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại.',
    requestId,
    undefined,
    false,
    isNetwork
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

export interface WalletMeResponse {
  walletId: string
  userId: string
  balance: string
  availableBalance: string
  heldBalance: string
  status: string
  dailyLimit?: string
  dailyUsed?: string
  monthlyLimit?: string
  monthlyUsed?: string
  kycTier?: number
}

export interface LedgerEntry {
  id: string
  type: string
  direction: 'IN' | 'OUT' | 'CREDIT' | 'DEBIT'
  amount: string
  balanceAfter: string
  description?: string
  referenceId?: string
  counterpartName?: string
  counterpartMasked?: string
  createdAt: string
}

export interface LedgerResponse {
  entries: LedgerEntry[]
  nextCursor: string | null
}

export interface P2pQuoteResponse {
  amount: string
  fee: string
  expiresAt: string
}

export interface P2pCheckoutResponse {
  paymentId: string
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'EXPIRED' | 'CANCELLED'
  holdExpiresAt: string
  replayed?: boolean
}

export interface PaymentRecordResponse {
  id: string
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'EXPIRED' | 'CANCELLED'
  amount: string
  fee?: string
  senderUserId?: string
  destinationUserId?: string
  note?: string
  createdAt: string
  updatedAt?: string
}

export interface PinVerifyResponse {
  transactionToken: string
  expiresIn: number
}

export interface RecipientLookupResponse {
  authUserId: string
  maskedName: string
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
  let refreshInFlight: { ownerId: string | undefined; promise: Promise<RefreshResult> } | null = null
  const currentOwnerId = () => tokenStore.getUserId() || undefined

  const refreshSession = (ownerId: string | undefined): Promise<RefreshResult> => {
    if (refreshInFlight) {
      return refreshInFlight.ownerId === ownerId
        ? refreshInFlight.promise
        : Promise.resolve({
            error: new ApiError(401, 'SESSION_CHANGED', 'Tài khoản đã thay đổi. Vui lòng thử lại.')
          })
    }

    const refreshToken = platform === 'mobile' ? tokenStore.getRefreshToken() : undefined
    const body = platform === 'mobile' ? { refreshToken } : {}
    const headers = platform === 'mobile' ? { 'x-client-platform': 'mobile' } : undefined

    const promise = (async () => {
      try {
        const response = await refreshHttp.post<ApiResponse<SessionData>>('/auth/refresh', body, { headers })
        const session = response.data?.data
        if (response.data?.success !== true) {
          return {
            error: errorFromBody(response.status, response.data, response.headers['x-request-id'] as string)
          }
        }
        if (
          !session ||
          typeof session.accessToken !== 'string' ||
          session.accessToken.length === 0 ||
          typeof session.user?.id !== 'string' ||
          session.user.id.length === 0
        ) {
          if (currentOwnerId() === ownerId) {
            tokenStore.clear()
            onSessionExpired?.()
            return {
              error: new ApiError(401, 'SESSION_EXPIRED', 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')
            }
          }
          return {
            error: new ApiError(401, 'SESSION_CHANGED', 'Tài khoản đã thay đổi. Vui lòng thử lại.')
          }
        }

        if (currentOwnerId() !== ownerId) {
          return {
            error: new ApiError(401, 'SESSION_CHANGED', 'Tài khoản đã thay đổi. Vui lòng thử lại.')
          }
        }
        const savedSession = platformSession(session, platform)
        tokenStore.setSession(savedSession)
        return { session: savedSession }
      } catch (error) {
        if (
          axios.isAxiosError(error) &&
          [400, 401, 403].includes(error.response?.status ?? 0) &&
          currentOwnerId() === ownerId
        ) {
          tokenStore.clear()
          onSessionExpired?.()
          return {
            error: new ApiError(401, 'SESSION_EXPIRED', 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.')
          }
        }
        if (axios.isAxiosError(error)) return { error: normalizeAxiosError(error) }
        if (error instanceof ApiError) return { error }
        return {
          error: new ApiError(0, 'NETWORK_ERROR', 'Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối và thử lại.')
        }
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
      if (!original || isAuthRequest(original.url) || error.response?.status !== 401 || original._retried) {
        return Promise.reject(normalizeAxiosError(error))
      }

      const ownerId = currentOwnerId()
      if (!original._owner || original._owner !== ownerId) {
        return Promise.reject(normalizeAxiosError(error))
      }
      original._retried = true

      const sentToken = original.headers.get('Authorization')
      if (sentToken === `Bearer ${tokenStore.getAccessToken()}`) {
        const refreshResult = await refreshSession(ownerId)
        if (!refreshResult.session) return Promise.reject(normalizeAxiosError(error))
      }

      if (!tokenStore.getAccessToken() || original._owner !== currentOwnerId() || original.signal?.aborted) {
        return Promise.reject(normalizeAxiosError(error))
      }
      return http(original as ApiRequestConfig)
    }
  )

  const auth = {
    async signUp<T = unknown>(payload: Record<string, unknown>): Promise<T> {
      try {
        const response = await http.post<ApiResponse<T>>('/auth/signup', payload)
        return unwrap(response.data)
      } catch (err) {
        if (axios.isAxiosError(err)) throw normalizeAxiosError(err)
        throw err
      }
    },
    async signIn<T extends SessionData = SessionData>(payload: Record<string, unknown>): Promise<T> {
      try {
        const response = await http.post<ApiResponse<T>>('/auth/signin', payload)
        const session = unwrap(response.data)
        const savedSession = platformSession(session, platform) as T
        tokenStore.setSession(savedSession)
        return savedSession
      } catch (err) {
        if (axios.isAxiosError(err)) throw normalizeAxiosError(err)
        throw err
      }
    },
    async signOut<T = unknown>(): Promise<T | undefined> {
      try {
        const response = await http.post<ApiResponse<T>>('/auth/signout', {})
        return response.data?.data
      } catch (err) {
        if (axios.isAxiosError(err)) throw normalizeAxiosError(err)
        throw err
      } finally {
        tokenStore.clear()
      }
    },
    async refresh<T extends SessionData = SessionData>(): Promise<T> {
      const result = await refreshSession(currentOwnerId())
      if (!result.session) {
        throw result.error
      }
      return result.session as T
    }
  }

  const wallet = {
    async getMe(signal?: AbortSignal): Promise<WalletMeResponse> {
      try {
        const res = await http.get<ApiResponse<WalletMeResponse>>('/wallets/me', { signal })
        return unwrap(res.data)
      } catch (err) {
        if (axios.isAxiosError(err)) throw normalizeAxiosError(err)
        throw err
      }
    },
    async getLedger(params?: { cursor?: string | null; limit?: number }, signal?: AbortSignal): Promise<LedgerResponse> {
      try {
        const res = await http.get<ApiResponse<LedgerResponse>>('/wallets/me/ledger', { params, signal })
        return unwrap(res.data)
      } catch (err) {
        if (axios.isAxiosError(err)) throw normalizeAxiosError(err)
        throw err
      }
    }
  }

  const payments = {
    async p2pQuote(payload: { destinationUserId: string; amount: string }, signal?: AbortSignal): Promise<P2pQuoteResponse> {
      try {
        const res = await http.post<ApiResponse<P2pQuoteResponse>>('/payments/p2p/quote', payload, { signal })
        return unwrap(res.data)
      } catch (err) {
        if (axios.isAxiosError(err)) throw normalizeAxiosError(err)
        throw err
      }
    },
    async p2pCheckout(
      payload: { destinationUserId: string; amount: string; note?: string },
      idempotencyKey: string,
      signal?: AbortSignal
    ): Promise<P2pCheckoutResponse> {
      try {
        const res = await http.post<ApiResponse<P2pCheckoutResponse>>('/payments/p2p/checkout', payload, {
          headers: {
            'Idempotency-Key': idempotencyKey
          },
          signal
        })
        return unwrap(res.data)
      } catch (err) {
        if (axios.isAxiosError(err)) throw normalizeAxiosError(err)
        throw err
      }
    },
    async confirm(paymentId: string, transactionToken: string, signal?: AbortSignal): Promise<{ status: string }> {
      try {
        const res = await http.post<ApiResponse<{ status: string }>>(
          `/payments/${encodeURIComponent(paymentId)}/confirm`,
          {},
          {
            headers: {
              'X-Transaction-Token': transactionToken
            },
            signal
          }
        )
        return unwrap(res.data)
      } catch (err) {
        if (axios.isAxiosError(err)) throw normalizeAxiosError(err)
        throw err
      }
    },
    async getById(id: string, signal?: AbortSignal): Promise<PaymentRecordResponse> {
      try {
        const res = await http.get<ApiResponse<PaymentRecordResponse>>(`/payments/${encodeURIComponent(id)}`, { signal })
        return unwrap(res.data)
      } catch (err) {
        if (axios.isAxiosError(err)) throw normalizeAxiosError(err)
        throw err
      }
    }
  }

  const users = {
    async lookup(q: string, signal?: AbortSignal): Promise<RecipientLookupResponse> {
      try {
        const res = await http.get<ApiResponse<RecipientLookupResponse>>('/users/lookup', {
          params: { q: q.trim() },
          signal
        })
        return unwrap(res.data)
      } catch (err) {
        if (axios.isAxiosError(err)) throw normalizeAxiosError(err)
        throw err
      }
    }
  }

  const pin = {
    async verify(payload: { pin: string; paymentId: string; amount: string }): Promise<PinVerifyResponse> {
      try {
        const res = await http.post<ApiResponse<PinVerifyResponse>>('/auth/pin/verify', payload)
        return unwrap(res.data)
      } catch (err) {
        if (axios.isAxiosError(err)) throw normalizeAxiosError(err)
        throw err
      }
    },
    async status(): Promise<{ configured: boolean; lockedUntil?: string | null }> {
      try {
        const res = await http.get<ApiResponse<{ configured: boolean; lockedUntil?: string | null }>>('/auth/pin/status')
        return unwrap(res.data)
      } catch (err) {
        if (axios.isAxiosError(err)) throw normalizeAxiosError(err)
        throw err
      }
    }
  }

  const notifications = {
    async list<T = unknown>(page = 1, limit = 10): Promise<T> {
      try {
        const response = await http.get<ApiResponse<T>>('/notifications/me', { params: { page, limit } })
        return unwrap(response.data)
      } catch (err) {
        if (axios.isAxiosError(err)) throw normalizeAxiosError(err)
        throw err
      }
    },
    async markRead<T = unknown>(id: string): Promise<T> {
      try {
        const response = await http.patch<ApiResponse<T>>(`/notifications/${encodeURIComponent(id)}/read`)
        return unwrap(response.data)
      } catch (err) {
        if (axios.isAxiosError(err)) throw normalizeAxiosError(err)
        throw err
      }
    },
    async markAllRead<T = unknown>(): Promise<T> {
      try {
        const response = await http.patch<ApiResponse<T>>('/notifications/me/read-all')
        return unwrap(response.data)
      } catch (err) {
        if (axios.isAxiosError(err)) throw normalizeAxiosError(err)
        throw err
      }
    },
    async socketTicket<T = { ticket: string }>(): Promise<T> {
      try {
        const response = await http.get<ApiResponse<T>>('/notifications/socket-ticket')
        return unwrap(response.data)
      } catch (err) {
        if (axios.isAxiosError(err)) throw normalizeAxiosError(err)
        throw err
      }
    }
  }

  return { http, auth, wallet, payments, users, pin, notifications }
}
