import { useEffect, useRef, useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { useAuthStore } from '@/features/auth'
import { errorMessage, isApiAxiosError } from '@/lib/apiResponse'
import { isValidMoneyInput, validateTransferAmount } from '@/lib/format'
import { useP2pQuote } from '../api/payment.queries'
import type { P2pQuoteResult } from '../types/payment.types'
import { parsePaymentError } from '../utils/paymentErrors'

interface TransferQuoteInput {
  destinationUserId: string | null
  amount: string
  availableBalance: string
}

interface QuoteContext extends TransferQuoteInput {
  ownerId: string
}

interface QuoteFailure {
  error: string
  limitExceededError: {
    message: string
    limitType?: string
    limit?: string
    remaining?: string
  } | null
}

interface QuoteSnapshot extends QuoteContext {
  quote: P2pQuoteResult | null
  receivedAt: number
  failure: QuoteFailure | null
}

function sameIntent(snapshot: QuoteSnapshot | null, context: QuoteContext): snapshot is QuoteSnapshot {
  return snapshot?.ownerId === context.ownerId && snapshot?.destinationUserId === context.destinationUserId
    && snapshot?.amount === context.amount
}

function validateInput(context: QuoteContext): string | null {
  if (!context.ownerId) return 'Vui lòng đăng nhập để chuyển tiền.'
  if (!context.destinationUserId) return 'Vui lòng kiểm tra và xác nhận người nhận tiền hợp lệ.'
  if (!isValidMoneyInput(context.amount)) return 'Vui lòng nhập số tiền hợp lệ.'
  const result = validateTransferAmount(context.amount, context.availableBalance)
  return result.valid ? null : result.error || 'Số tiền không hợp lệ.'
}

function quoteFailure(error: unknown): QuoteFailure {
  const parsed = parsePaymentError(error)
  if (parsed.isLimitExceeded && parsed.limitDetails && parsed.limitMessage) {
    return { error: parsed.limitMessage, limitExceededError: {
      message: parsed.limitMessage, limitType: parsed.limitDetails.limitType,
      limit: parsed.limitDetails.limit, remaining: parsed.limitDetails.remaining
    } }
  }
  return { error: errorMessage(isApiAxiosError(error) ? error : undefined), limitExceededError: null }
}

function useQuoteCancellation(context: QuoteContext) {
  const activeRef = useRef<AbortController | null>(null)
  const { ownerId, destinationUserId, amount } = context
  useEffect(() => {
    const cancel = () => activeRef.current?.abort()
    const unsubscribe = useAuthStore.subscribe(state => {
      if (state.user?.id !== ownerId || !state.accessToken) cancel()
    })
    return () => { unsubscribe(); cancel() }
  }, [ownerId, destinationUserId, amount])
  return activeRef
}

function useQuoteClock(quote: P2pQuoteResult | null, receivedAt: number) {
  const [now, setNow] = useState(() => Date.now())
  const expiresAt = quote?.expiresAt
  useEffect(() => {
    if (!expiresAt) return
    const tick = () => {
      const time = Date.now()
      setNow(time)
      if (time >= Date.parse(expiresAt)) clearInterval(timer)
    }
    const timer = setInterval(tick, 1000)
    document.addEventListener('visibilitychange', tick)
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', tick) }
  }, [expiresAt])
  return expiresAt ? Math.max(0, Math.ceil((Date.parse(expiresAt) - Math.max(now, receivedAt)) / 1000)) : 0
}

function useQuoteRequest(context: QuoteContext, save: Dispatch<SetStateAction<QuoteSnapshot | null>>) {
  const activeRef = useQuoteCancellation(context)
  const { mutateAsync, reset, isPending } = useP2pQuote()
  const empty = (): QuoteSnapshot => ({ ...context, quote: null, receivedAt: 0, failure: null })
  const clear = () => { activeRef.current?.abort(); reset(); save(null) }
  const request = async (): Promise<P2pQuoteResult | null> => {
    activeRef.current?.abort()
    const validation = validateInput(context)
    const destinationUserId = context.destinationUserId
    if (validation || !destinationUserId) {
      save({ ...empty(), failure: { error: validation || 'Vui lòng xác nhận người nhận tiền.', limitExceededError: null } })
      return null
    }
    const controller = new AbortController()
    activeRef.current = controller
    save(previous => sameIntent(previous, context) ? { ...previous, failure: null } : empty())
    try {
      const quote = await mutateAsync({
        dto: { destinationUserId, amount: context.amount },
        signal: controller.signal
      })
      if (controller.signal.aborted) return null
      const deadline = Date.parse(quote.expiresAt)
      if (!Number.isFinite(deadline) || deadline <= Date.now()) {
        save({ ...empty(), failure: { error: 'Báo giá đã hết hạn hoặc chưa hợp lệ. Vui lòng lấy lại báo giá.', limitExceededError: null } })
        return null
      }
      save({ ...context, quote, receivedAt: Date.now(), failure: null })
      return quote
    } catch (error: unknown) {
      if (!controller.signal.aborted) save({ ...empty(), failure: quoteFailure(error) })
      return null
    } finally {
      if (activeRef.current === controller) { activeRef.current = null; reset() }
    }
  }
  return { request, clear, isPending }
}

export function useTransferQuote(input: TransferQuoteInput) {
  const ownerId = useAuthStore(state => state.user?.id) ?? ''
  const [snapshot, setSnapshot] = useState<QuoteSnapshot | null>(null)
  const context = { ...input, ownerId }
  const mutation = useQuoteRequest(context, setSnapshot)
  const matches = sameIntent(snapshot, context)
  const quote = matches ? snapshot.quote : null
  const failure = matches ? snapshot.failure : null
  const quoteCountdown = useQuoteClock(quote, matches ? snapshot.receivedAt : 0)
  return {
    quote, quoteCountdown, isQuoting: mutation.isPending,
    error: failure?.error ?? null, limitExceededError: failure?.limitExceededError ?? null,
    requestQuote: mutation.request, refreshQuote: mutation.request, resetQuote: mutation.clear
  }
}
