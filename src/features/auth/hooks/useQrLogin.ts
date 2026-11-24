import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { errorCode, errorMessage } from '@/lib/apiResponse'
import { authKeys, useCreateQrLogin, useQrLoginStatus } from '../api/auth.queries'
import type { QrStatusResponse } from '../api/auth.api'
import { useAuthStore } from '../stores/useAuthStore'
import type { User } from '../types/auth.types'

interface QrLoginOptions {
  enabled?: boolean
  onApproved: (user: User) => void
}

function useQrInitialization(active: boolean, tick: () => void) {
  const [attempt, nextAttempt] = useReducer(value => value + 1, 0)
  const { mutateAsync, reset, data, error, isIdle, isPending, variables } = useCreateQrLogin()
  const controller = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!active) return
    const request = new AbortController()
    controller.current = request
    const unsubscribe = useAuthStore.subscribe((state, previous) => {
      if (state.loading || state.user !== previous.user || state.accessToken !== previous.accessToken) request.abort()
    })
    void mutateAsync(request.signal).then(() => {
      if (!request.signal.aborted) tick()
    }).catch(() => { /* Mutation exposes the error; canceled attempts stay silent. */ })
    return () => {
      unsubscribe()
      request.abort()
      reset()
    }
  }, [active, attempt, mutateAsync, reset, tick])

  const refresh = useCallback(() => {
    controller.current?.abort()
    reset()
    nextAttempt()
  }, [reset])

  return {
    qrData: active && !isPending ? data ?? null : null,
    isLoading: active && (isIdle || isPending),
    initError: active && error ? errorMessage(errorCode(error) ? error : undefined) : null,
    requestSignal: variables,
    refresh
  }
}

function useQrRequestCleanup(qrId: string | undefined, expired: boolean) {
  const client = useQueryClient()
  useEffect(() => {
    if (!qrId) return
    const queryKey = authKeys.qrStatus(qrId)
    return () => {
      void client.cancelQueries({ queryKey, exact: true })
      client.removeQueries({ queryKey, exact: true })
    }
  }, [client, qrId])
  useEffect(() => {
    if (qrId && expired) void client.cancelQueries({ queryKey: authKeys.qrStatus(qrId), exact: true })
  }, [client, qrId, expired])
}

function useQrApproval(
  qrId: string | undefined, expiresAt: string | undefined, result: QrStatusResponse | undefined,
  signal: AbortSignal | undefined, allowed: boolean, onApproved: (user: User) => void
) {
  const consumed = useRef<string | null>(null)
  useEffect(() => {
    if (!allowed || !qrId || !expiresAt || !signal || signal.aborted || result?.status !== 'APPROVED') return
    if (Date.now() >= Date.parse(expiresAt)) return
    if (!result.accessToken || !result.user || consumed.current === qrId) return
    const auth = useAuthStore.getState()
    if (auth.loading || auth.user || auth.accessToken) return
    consumed.current = qrId
    auth.setSession({ accessToken: result.accessToken, user: result.user })
    toast.success('Đăng nhập bằng mã QR thành công!')
    onApproved(result.user)
  }, [qrId, expiresAt, result, signal, allowed, onApproved])
}

export function useQrLogin({ enabled = true, onApproved }: QrLoginOptions) {
  const authBusy = useAuthStore(state => state.loading || Boolean(state.user || state.accessToken))
  const active = enabled && !authBusy
  const [now, setNow] = useState(() => Date.now())
  const tick = useCallback(() => setNow(Date.now()), [])
  const initialization = useQrInitialization(active, tick)
  const { qrData } = initialization
  const countdown = qrData ? Math.max(0, Math.ceil((Date.parse(qrData.expiresAt) - now) / 1000)) : 0
  const status = useQrLoginStatus(qrData, active && countdown > 0)
  const isExpired = Boolean(qrData && (countdown === 0 || errorCode(status.error) === 'QR_EXPIRED'))
  const isRejected = status.data?.status === 'REJECTED'

  useEffect(() => {
    if (!qrData || isExpired || isRejected) return
    const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [qrData, isExpired, isRejected, tick])

  useQrRequestCleanup(qrData?.qrId, isExpired)
  useQrApproval(qrData?.qrId, qrData?.expiresAt, status.data, initialization.requestSignal, active && !isExpired, onApproved)
  const invalidApproval = status.data?.status === 'APPROVED' && (!status.data.accessToken || !status.data.user)
  const pollError = !isExpired && status.error ? errorMessage(errorCode(status.error) ? status.error : undefined) : null

  return {
    qrData,
    qrPayload: qrData ? JSON.stringify({ qrId: qrData.qrId, nonce: qrData.nonce }) : '',
    countdown,
    isLoading: initialization.isLoading,
    isExpired,
    isRejected,
    initError: initialization.initError ?? (invalidApproval ? 'Phản hồi đăng nhập chưa hợp lệ. Vui lòng tạo lại mã QR.' : pollError),
    refreshQrSession: initialization.refresh
  }
}
