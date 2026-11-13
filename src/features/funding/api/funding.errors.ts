import axios from 'axios'
export class FundingError extends Error {
  readonly code: string
  readonly outcomeUnknown: boolean
  readonly requestId?: string
  constructor(code: string, outcomeUnknown = false, requestId?: string) {
    super(
      'Không thể hoàn tất yêu cầu giao dịch. Vui lòng kiểm tra trạng thái trước khi thử lại.',
    )
    this.name = 'FundingError'
    this.code = code
    this.outcomeUnknown = outcomeUnknown
    this.requestId = requestId
  }
}
export function fundingError(error: unknown): FundingError {
  if (error instanceof FundingError) return error
  if (!axios.isAxiosError(error))
    return new FundingError('INVALID_RESPONSE', true)
  const status = error.response?.status
  const body = error.response?.data as
    | { error?: { code?: unknown; traceId?: unknown }; requestId?: unknown }
    | undefined
  const rawCode = body?.error?.code
  const code =
    typeof rawCode === 'string' && /^[A-Z0-9_]{1,100}$/.test(rawCode)
      ? rawCode
      : status
        ? `HTTP_${status}`
        : error.code === 'ECONNABORTED'
          ? 'FUNDING_TIMEOUT'
          : 'FUNDING_NETWORK'
  const rawId =
    body?.error?.traceId ??
    body?.requestId ??
    error.response?.headers?.['x-request-id']
  const requestId =
    typeof rawId === 'string' && /^[a-zA-Z0-9_.:-]{1,128}$/.test(rawId)
      ? rawId
      : undefined
  return new FundingError(code, !status || status >= 500, requestId)
}
