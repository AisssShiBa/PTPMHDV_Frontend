import axios from 'axios'
import { errorDetails } from '@/lib/apiResponse'
import { formatVnd } from '@/lib/format'
import type { LimitExceededDetails } from '../types/payment.types'

export interface ParsedPaymentError {
  code?: string
  message: string
  status?: number
  details?: unknown
  isNetworkOrTimeout: boolean
  isLimitExceeded: boolean
  limitDetails?: LimitExceededDetails
  limitMessage?: string
  isInsufficientFunds: boolean
  isIdempotencyReused: boolean
  isTokenExpired: boolean
  isTokenReused: boolean
  isPaymentExpired: boolean
}

export function isNetworkOrTimeout(err: unknown): boolean {
  if (axios.isAxiosError(err)) {
    if (err.code === 'ECONNABORTED' || err.message?.toLowerCase().includes('timeout')) return true
    if (!err.response) return true
    const status = err.response.status
    if (status === 504 || status === 502 || status === 503 || status === 408) return true
    const code = err.response.data?.error?.code || err.response.data?.code
    if (code === 'PAYMENT_PROCESSING' || code === 'GATEWAY_TIMEOUT') return true
  }
  return false
}

export function formatLimitExceededMessage(details: LimitExceededDetails): string {
  const limitFormatted = formatVnd(details.limit || '0')
  const remainingFormatted = formatVnd(details.remaining || '0')

  if (details.limitType === 'PER_TXN') {
    return `Vượt quá hạn mức tối đa cho mỗi lần chuyển (${limitFormatted}). Bạn còn được chuyển tối đa ${remainingFormatted} trong lần này.`
  }
  if (details.limitType === 'PER_DAY') {
    return `Vượt quá hạn mức giao dịch trong ngày (${limitFormatted}). Hôm nay bạn chỉ còn được chuyển thêm ${remainingFormatted}.`
  }
  if (details.limitType === 'PER_MONTH') {
    return `Vượt quá hạn mức giao dịch trong tháng (${limitFormatted}). Trong tháng này bạn chỉ còn lại ${remainingFormatted}.`
  }
  return `Giao dịch vượt quá hạn mức quy định (${limitFormatted}).`
}

export function parsePaymentError(err: unknown): ParsedPaymentError {
  const isNetTimeout = isNetworkOrTimeout(err)

  if (axios.isAxiosError(err)) {
    const errorData = err.response?.data?.error || err.response?.data
    const code = errorData?.code
    const details = (errorDetails(err) || errorData?.details) as LimitExceededDetails | undefined
    const status = err.response?.status
    const isLimit = code === 'LIMIT_EXCEEDED' || status === 422
    const limitDetails = details?.limitType ? details : undefined
    const limitMessage = limitDetails ? formatLimitExceededMessage(limitDetails) : undefined

    return {
      code,
      message: errorData?.message || err.message || 'Lỗi xử lý giao dịch',
      status,
      details,
      isNetworkOrTimeout: isNetTimeout,
      isLimitExceeded: Boolean(isLimit && limitDetails),
      limitDetails,
      limitMessage,
      isInsufficientFunds: code === 'INSUFFICIENT_FUNDS',
      isIdempotencyReused: code === 'IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD',
      isTokenExpired: code === 'TXN_TOKEN_EXPIRED',
      isTokenReused: code === 'TXN_TOKEN_REUSED',
      isPaymentExpired: code === 'PAYMENT_EXPIRED'
    }
  }

  return {
    message: err instanceof Error ? err.message : 'Lỗi kết nối mạng',
    isNetworkOrTimeout: isNetTimeout,
    isLimitExceeded: false,
    isInsufficientFunds: false,
    isIdempotencyReused: false,
    isTokenExpired: false,
    isTokenReused: false,
    isPaymentExpired: false
  }
}

