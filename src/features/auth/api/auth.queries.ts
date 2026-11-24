import { mutationOptions, queryOptions, useMutation, useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { errorCode } from '@/lib/apiResponse'
import { authApi } from './auth.api'
import type { QrInitResponse, QrStatusResponse, SignUpPayload } from './auth.api'

export const authKeys = {
  all: ['auth'] as const,
  signUp: ['auth', 'sign-up'] as const,
  qrCreate: ['auth', 'qr-login', 'create'] as const,
  qrStatus: (qrId: string) => ['auth', 'qr-login', 'status', qrId] as const
}

export const signUpMutationOptions = mutationOptions({
  mutationKey: authKeys.signUp,
  // Fail immediately offline instead of submitting credentials after reconnect.
  networkMode: 'always',
  mutationFn: (payload: SignUpPayload) => authApi.signUp(payload),
  retry: false,
  gcTime: 0
})

export function useSignUp() {
  return useMutation(signUpMutationOptions)
}

function validQrSession(session: QrInitResponse | null): session is QrInitResponse {
  return session !== null
    && [session.qrId, session.nonce, session.pollSecret].every(value => typeof value === 'string' && value.trim().length > 0)
    && typeof session.expiresAt === 'string' && Number.isFinite(Date.parse(session.expiresAt))
}

function assertQrNotExpired(session: QrInitResponse): void {
  if (Date.parse(session.expiresAt) <= Date.now()) {
    throw new Error('Phiên mã QR đã hết hạn. Vui lòng tạo lại mã.')
  }
}

function canPollQr(session: QrInitResponse | null, data?: QrStatusResponse, error?: unknown): boolean {
  if (!validQrSession(session) || Date.parse(session.expiresAt) <= Date.now()) return false
  if (data && data.status !== 'PENDING') return false
  if (errorCode(error) === 'QR_EXPIRED') return false
  if (axios.isAxiosError(error)) {
    const status = error.response?.status
    if (status && status >= 400 && status < 500) return false
  }
  return true
}

export const qrLoginMutationOptions = mutationOptions({
  mutationKey: authKeys.qrCreate,
  // Report offline failures immediately; creating a QR must not queue until reconnect.
  networkMode: 'always',
  mutationFn: async (signal?: AbortSignal): Promise<QrInitResponse> => {
    const session = await authApi.initQrLogin(signal)
    if (!validQrSession(session)) throw new Error('Phản hồi mã QR chưa hợp lệ. Vui lòng tạo lại mã.')
    return session
  },
  retry: false,
  gcTime: 0
})

export function useCreateQrLogin() {
  return useMutation(qrLoginMutationOptions)
}

export function qrStatusQueryOptions(session: QrInitResponse | null, enabled = true) {
  return queryOptions({
    // pollSecret belongs in the request, never in the cache key.
    queryKey: authKeys.qrStatus(session?.qrId ?? ''),
    queryFn: async ({ signal }): Promise<QrStatusResponse> => {
      if (!validQrSession(session)) throw new Error('Phiên mã QR chưa hợp lệ. Vui lòng tạo lại mã.')
      assertQrNotExpired(session)
      const result = await authApi.getQrStatus(session.qrId, session.pollSecret, signal)
      // Do not expose a late approval after the server-provided session deadline.
      assertQrNotExpired(session)
      return result
    },
    enabled: query => enabled && canPollQr(session, query.state.data, query.state.error),
    refetchInterval: query => enabled && canPollQr(session, query.state.data, query.state.error) ? 2000 : false,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    retry: false,
    staleTime: 0,
    gcTime: 0
  })
}

export function useQrLoginStatus(session: QrInitResponse | null, enabled = true) {
  return useQuery(qrStatusQueryOptions(session, enabled))
}
