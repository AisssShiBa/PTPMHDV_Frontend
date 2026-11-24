import { useEffect, useRef, useState } from 'react'
import { useAuthStore } from '@/features/auth'
import { errorMessage, isApiAxiosError } from '@/lib/apiResponse'
import { isValidMoneyInput } from '@/lib/format'
import { useP2pCheckout } from '../api/payment.queries'
import type { P2pCheckoutDto, P2pCheckoutResult, P2pQuoteResult } from '../types/payment.types'
import { parsePaymentError } from '../utils/paymentErrors'

interface CheckoutInput {
  destinationUserId: string | null
  amount: string
  note?: string
  quote: P2pQuoteResult | null
}

interface CheckoutPayment {
  id: string
  amount: string
  status: P2pCheckoutResult['status']
  holdExpiresAt: string
}

interface Attempt {
  ownerId: string
  key: string
  dto: P2pCheckoutDto
  phase: 'pending' | 'unknown' | 'ready' | 'rejected'
  payment: CheckoutPayment | null
  message: string | null
  promise?: Promise<CheckoutPayment | null>
}

const UNKNOWN_RESULT = 'Chưa xác định được kết quả tạo giao dịch. Thử lại cùng yêu cầu để kiểm tra; không tạo giao dịch khác.'
const DIFFERENT_INTENT = 'Yêu cầu trước chưa rõ kết quả. Giữ nguyên người nhận, số tiền và nội dung để thử lại.'

function matches(attempt: Attempt, input: CheckoutInput): boolean {
  return attempt.dto.destinationUserId === input.destinationUserId
    && attempt.dto.amount === input.amount && attempt.dto.note === (input.note?.trim() || undefined)
}

function validate(input: CheckoutInput, ownerId: string): string | null {
  if (!ownerId || !useAuthStore.getState().accessToken) return 'Vui lòng đăng nhập để chuyển tiền.'
  if (!input.destinationUserId) return 'Vui lòng xác nhận người nhận tiền hợp lệ.'
  if (!isValidMoneyInput(input.amount) || BigInt(input.amount) <= 0n) return 'Vui lòng nhập số tiền hợp lệ.'
  const deadline = Date.parse(input.quote?.expiresAt ?? '')
  if (!input.quote || input.quote.amount !== input.amount || !Number.isFinite(deadline) || deadline <= Date.now()) {
    return 'Báo giá đã hết hạn hoặc không khớp số tiền. Vui lòng lấy báo giá mới.'
  }
  return null
}

function failure(attempt: Attempt, error: unknown): void {
  const parsed = parsePaymentError(error)
  // A failed response does not prove that the server did not create a hold.
  const uncertain = parsed.isNetworkOrTimeout || !isApiAxiosError(error)
    || (parsed.status ?? 0) >= 500 || parsed.isIdempotencyReused
  attempt.phase = uncertain ? 'unknown' : 'rejected'
  attempt.message = uncertain ? UNKNOWN_RESULT
    : parsed.limitMessage || errorMessage(isApiAxiosError(error) ? error : undefined)
}

function bindPayment(attempt: Attempt, result: P2pCheckoutResult): CheckoutPayment | null {
  const id = result.paymentId || result.id
  const statuses = ['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED', 'CANCELLED', 'EXPIRED']
  if (typeof id !== 'string' || !id.trim() || !statuses.includes(result.status)
    || !Number.isFinite(Date.parse(result.holdExpiresAt))) {
    attempt.phase = 'unknown'
    attempt.message = UNKNOWN_RESULT
    return null
  }
  attempt.phase = 'ready'
  attempt.message = null
  attempt.payment = { id, amount: attempt.dto.amount, status: result.status, holdExpiresAt: result.holdExpiresAt }
  return attempt.payment
}

function useAttemptState(ownerId: string) {
  const attemptRef = useRef<Attempt | null>(null)
  const mountedRef = useRef(false)
  const [snapshot, setSnapshot] = useState<Attempt | null>(null)
  const [notice, setNotice] = useState<{ ownerId: string; message: string } | null>(null)
  useEffect(() => {
    mountedRef.current = true
    const invalidate = () => { attemptRef.current = null }
    const unsubscribe = useAuthStore.subscribe(auth => {
      if (auth.user?.id !== ownerId || !auth.accessToken) {
        invalidate()
        setSnapshot(null)
        setNotice(null)
      }
    })
    return () => { mountedRef.current = false; invalidate(); unsubscribe() }
  }, [ownerId])
  const publish = (attempt: Attempt) => {
    if (mountedRef.current && attemptRef.current === attempt && useAuthStore.getState().user?.id === ownerId) {
      setSnapshot({ ...attempt })
    }
  }
  return { attemptRef, snapshot, notice, setNotice, setSnapshot, publish }
}

type AttemptState = ReturnType<typeof useAttemptState>
type CheckoutMutation = ReturnType<typeof useP2pCheckout>

async function execute(attempt: Attempt, state: AttemptState, mutation: CheckoutMutation) {
  try {
    const result = await mutation.mutateAsync({ dto: attempt.dto, idempotencyKey: attempt.key })
    if (state.attemptRef.current !== attempt) return null
    return bindPayment(attempt, result)
  } catch (error: unknown) {
    if (state.attemptRef.current === attempt) failure(attempt, error)
    return null
  } finally {
    attempt.promise = undefined
    state.publish(attempt)
  }
}

function startCheckout(input: CheckoutInput, ownerId: string, state: AttemptState, mutation: CheckoutMutation) {
  const auth = useAuthStore.getState()
  if (auth.user?.id !== ownerId || !auth.accessToken) return Promise.resolve(null)
  const previous = state.attemptRef.current
  state.setNotice(null)
  if (previous?.ownerId === ownerId) {
    if (!matches(previous, input) && (previous.phase === 'pending' || previous.phase === 'unknown')) {
      state.setNotice({ ownerId, message: DIFFERENT_INTENT })
      return Promise.resolve(null)
    }
    if (matches(previous, input) && previous.phase === 'pending') return previous.promise ?? Promise.resolve(null)
    if (matches(previous, input) && previous.phase === 'ready') return Promise.resolve(previous.payment)
  }
  const invalid = validate(input, ownerId)
  if (invalid) {
    state.setNotice({ ownerId, message: invalid })
    return Promise.resolve(null)
  }
  const attempt: Attempt = previous?.ownerId === ownerId && matches(previous, input) ? previous : {
    ownerId, key: crypto.randomUUID(), dto: {
      destinationUserId: input.destinationUserId!, amount: input.amount, note: input.note?.trim() || undefined
    }, phase: 'pending', payment: null, message: null
  }
  attempt.phase = 'pending'
  attempt.message = null
  state.attemptRef.current = attempt
  state.publish(attempt)
  attempt.promise = execute(attempt, state, mutation)
  return attempt.promise
}

function resetCheckout(ownerId: string, state: AttemptState): boolean {
  const attempt = state.attemptRef.current
  if (attempt?.ownerId === ownerId && (attempt.phase === 'pending' || attempt.phase === 'unknown')) {
    state.setNotice({ ownerId, message: UNKNOWN_RESULT })
    return false
  }
  state.attemptRef.current = null
  state.setSnapshot(null)
  state.setNotice(null)
  return true
}

export function useTransferCheckout(input: CheckoutInput) {
  const ownerId = useAuthStore(state => state.user?.id) ?? ''
  const mutation = useP2pCheckout()
  const state = useAttemptState(ownerId)
  const current = state.snapshot?.ownerId === ownerId ? state.snapshot : null
  return {
    checkoutPayment: current && matches(current, input) ? current.payment : null,
    isCheckingOut: current?.phase === 'pending',
    hasUnresolvedCheckout: current?.phase === 'pending' || current?.phase === 'unknown',
    processingMessage: current?.phase === 'unknown' ? current.message : null,
    error: state.notice?.ownerId === ownerId ? state.notice.message
      : current?.phase === 'rejected' ? current.message : null,
    checkout: () => startCheckout(input, ownerId, state, mutation),
    resetCheckout: () => resetCheckout(ownerId, state)
  }
}
