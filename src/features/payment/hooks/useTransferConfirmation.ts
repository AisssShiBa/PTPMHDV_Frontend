import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth'
import { walletKeys } from '@/features/wallet'
import { errorMessage, isApiAxiosError } from '@/lib/apiResponse'
import { paymentKeys, paymentStatusQueryOptions, useConfirmPayment } from '../api/payment.queries'
import type { PaymentRecord, PaymentStatus } from '../types/payment.types'
import { parsePaymentError } from '../utils/paymentErrors'

type Phase = 'idle' | 'confirming' | 'checking' | 'pending' | 'pin-required' | 'success' | 'failed'

interface ConfirmationState {
  ownerId: string
  paymentId: string | null
  phase: Phase
  status: PaymentStatus | null
  record: PaymentRecord | null
  message: string | null
}

interface Session {
  ownerId: string
  paymentId: string
  phase: Phase
  controller: AbortController | null
  usedTokenHashes: Set<string>
}

const POLL_BUDGET_MS = 30000
const PENDING_MESSAGE = 'Chưa xác định được kết quả giao dịch. Hãy kiểm tra lại trạng thái hoặc xem lịch sử; không gửi lại mã xác thực cũ.'

function initialState(ownerId: string, paymentId: string | null): ConfirmationState {
  return { ownerId, paymentId, phase: 'idle', status: null, record: null, message: null }
}

function waitForPoll(milliseconds: number, signal: AbortSignal): Promise<void> {
  return new Promise(resolve => {
    const finish = () => { clearTimeout(timer); signal.removeEventListener('abort', finish); resolve() }
    const timer = setTimeout(finish, milliseconds)
    signal.addEventListener('abort', finish, { once: true })
    if (signal.aborted) finish()
  })
}

async function tokenHash(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
}

function useConfirmationRuntime(ownerId: string, paymentId: string | null, releaseToken: () => void) {
  const client = useQueryClient()
  const sessionRef = useRef<Session | null>(null)
  const contextRef = useRef<{ ownerId: string; paymentId: string | null } | null>(null)
  const [snapshot, setSnapshot] = useState(() => initialState(ownerId, paymentId))
  useEffect(() => {
    contextRef.current = { ownerId, paymentId }
    const cancel = () => {
      const session = sessionRef.current
      sessionRef.current = null
      session?.controller?.abort()
      releaseToken()
      if (session) void client.cancelQueries({ queryKey: paymentKeys.detail(session.ownerId, session.paymentId), exact: true })
    }
    const unsubscribe = useAuthStore.subscribe(auth => {
      if (auth.user?.id !== ownerId || !auth.accessToken) {
        cancel()
        setSnapshot(initialState('', null))
      }
    })
    return () => { contextRef.current = null; unsubscribe(); cancel() }
  }, [client, ownerId, paymentId, releaseToken])
  const isCurrent = (session: Session) => {
    const auth = useAuthStore.getState()
    return sessionRef.current === session && auth.user?.id === session.ownerId && Boolean(auth.accessToken)
  }
  const publish = (session: Session, update: Partial<ConfirmationState>) => {
    if (!isCurrent(session)) return
    if (update.phase) session.phase = update.phase
    setSnapshot(previous => ({ ...initialState(session.ownerId, session.paymentId),
      ...(previous.ownerId === session.ownerId && previous.paymentId === session.paymentId ? previous : {}), ...update }))
  }
  return { client, sessionRef, contextRef, snapshot, isCurrent, publish }
}

type Runtime = ReturnType<typeof useConfirmationRuntime>
type ConfirmMutation = ReturnType<typeof useConfirmPayment>

function getSession(runtime: Runtime, ownerId: string, paymentId: string | null): Session | null {
  const auth = useAuthStore.getState()
  if (runtime.contextRef.current?.ownerId !== ownerId || runtime.contextRef.current.paymentId !== paymentId) return null
  if (!paymentId?.trim() || !ownerId || auth.user?.id !== ownerId || !auth.accessToken) return null
  let session = runtime.sessionRef.current
  if (!session || session.ownerId !== ownerId || session.paymentId !== paymentId) {
    session = { ownerId, paymentId, phase: 'idle', controller: null, usedTokenHashes: new Set() }
    runtime.sessionRef.current = session
  }
  return session
}

function finishWithStatus(runtime: Runtime, session: Session, status: PaymentStatus, record: PaymentRecord | null) {
  runtime.publish(session, { phase: status === 'SUCCESS' ? 'success' : 'failed', status, record,
    message: status === 'SUCCESS' ? 'Chuyển tiền thành công.' : 'Giao dịch đã kết thúc. Vui lòng xem trạng thái giao dịch.' })
  void runtime.client.invalidateQueries({ queryKey: walletKeys.all })
}

function inspectRecord(runtime: Runtime, session: Session, record: PaymentRecord, allowNewPin: boolean): boolean {
  if (record.id !== session.paymentId || (record.userId && record.userId !== session.ownerId)
    || (record.senderUserId && record.senderUserId !== session.ownerId)) return false
  if (['SUCCESS', 'FAILED', 'CANCELLED', 'EXPIRED', 'REFUNDED'].includes(record.status)) {
    finishWithStatus(runtime, session, record.status, record)
    return true
  }
  if (record.status === 'PENDING' && allowNewPin) {
    runtime.publish(session, { phase: 'pin-required', status: 'PENDING', record,
      message: 'Máy chủ xác nhận đơn vẫn chờ xử lý. Vui lòng nhập PIN để lấy mã xác thực mới.' })
    return true
  }
  return false
}

async function pollStatus(runtime: Runtime, session: Session, controller: AbortController, allowNewPin = false) {
  const deadline = Date.now() + POLL_BUDGET_MS
  const cancelRead = () => {
    void runtime.client.cancelQueries({ queryKey: paymentKeys.detail(session.ownerId, session.paymentId), exact: true })
  }
  controller.signal.addEventListener('abort', cancelRead, { once: true })
  const timer = setTimeout(() => controller.abort(), POLL_BUDGET_MS)
  runtime.publish(session, { phase: 'checking', message: 'Đang kiểm tra trạng thái giao dịch...' })
  try {
    for (let attempt = 0; runtime.isCurrent(session) && !controller.signal.aborted && Date.now() < deadline; attempt++) {
      try {
        const record = await runtime.client.fetchQuery(paymentStatusQueryOptions(session.ownerId, session.paymentId))
        if (!runtime.isCurrent(session) || controller.signal.aborted) return
        if (inspectRecord(runtime, session, record, allowNewPin)) return
      } catch (error: unknown) {
        if (!runtime.isCurrent(session)) return
        if (isApiAxiosError(error) && [401, 403, 404].includes(error.response?.status ?? 0)) break
      }
      await waitForPoll(Math.max(0, Math.min(500 * 2 ** Math.min(attempt, 3), 4000, deadline - Date.now())), controller.signal)
    }
    runtime.publish(session, { phase: 'pending', status: null, message: PENDING_MESSAGE })
  } finally {
    clearTimeout(timer)
    controller.signal.removeEventListener('abort', cancelRead)
    // Cancellation is local; it does not cancel a transaction on the server.
    if (runtime.isCurrent(session) && session.phase === 'checking') {
      runtime.publish(session, { phase: 'pending', status: null, message: PENDING_MESSAGE })
    }
  }
}

async function sendConfirmation(runtime: Runtime, session: Session, mutation: ConfirmMutation,
  controller: AbortController, token: string) {
  try {
    const result = await mutation.mutateAsync({ paymentId: session.paymentId, transactionToken: token, signal: controller.signal })
    if (!runtime.isCurrent(session)) return
    mutation.reset()
    if (result.status === 'SUCCESS') finishWithStatus(runtime, session, 'SUCCESS', null)
    else await pollStatus(runtime, session, controller)
  } catch (error: unknown) {
    if (!runtime.isCurrent(session)) return
    mutation.reset()
    const parsed = parsePaymentError(error)
    runtime.publish(session, { message: parsed.isTokenExpired || parsed.isTokenReused
      ? 'Đang kiểm tra đơn trước khi tiếp tục xác thực.'
      : errorMessage(isApiAxiosError(error) ? error : undefined) })
    await pollStatus(runtime, session, controller, parsed.isTokenExpired)
  } finally {
    if (runtime.isCurrent(session)) mutation.reset()
  }
}

async function confirm(runtime: Runtime, session: Session | null, mutation: ConfirmMutation, token: string) {
  if (!session || session.controller || session.phase === 'success' || session.phase === 'failed') return
  if (session.phase !== 'idle' && session.phase !== 'pin-required') {
    await checkStatus(runtime, session)
    return
  }
  if (!token.trim()) {
    runtime.publish(session, { message: 'Chưa có mã xác thực giao dịch. Vui lòng nhập PIN.' })
    return
  }
  const controller = new AbortController()
  session.controller = controller
  try {
    const hash = await tokenHash(token)
    if (!runtime.isCurrent(session) || controller.signal.aborted) return
    if (session.usedTokenHashes.has(hash)) {
      await pollStatus(runtime, session, controller)
      return
    }
    session.usedTokenHashes.add(hash)
    runtime.publish(session, { phase: 'confirming', message: 'Đang xác nhận giao dịch...' })
    await sendConfirmation(runtime, session, mutation, controller, token)
  } catch {
    if (runtime.isCurrent(session)) runtime.publish(session, { message: 'Không thể chuẩn bị xác thực. Vui lòng kiểm tra lại trạng thái giao dịch.' })
  } finally {
    session.controller = null
  }
}

async function checkStatus(runtime: Runtime, session: Session | null) {
  if (!session || session.controller || session.phase === 'success' || session.phase === 'failed') return
  const controller = new AbortController()
  session.controller = controller
  try { await pollStatus(runtime, session, controller) }
  finally { session.controller = null }
}

export function useTransferConfirmation(paymentId: string | null) {
  const ownerId = useAuthStore(state => state.user?.id) ?? ''
  const mutation = useConfirmPayment()
  const runtime = useConfirmationRuntime(ownerId, paymentId, mutation.reset)
  const state = runtime.snapshot.ownerId === ownerId && runtime.snapshot.paymentId === paymentId
    ? runtime.snapshot : initialState(ownerId, paymentId)
  return {
    ...state,
    isBusy: state.phase === 'confirming' || state.phase === 'checking',
    needsPin: state.phase === 'pin-required',
    confirm: (token: string) => confirm(runtime, getSession(runtime, ownerId, paymentId), mutation, token),
    checkStatus: () => checkStatus(runtime, getSession(runtime, ownerId, paymentId))
  }
}
