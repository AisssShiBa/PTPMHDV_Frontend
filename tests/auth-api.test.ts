import { afterEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { setImmediate as nextTurn } from 'node:timers/promises'
import { MutationObserver, QueryClient, onlineManager } from '@tanstack/react-query'
import { toast } from 'sonner'
import { AxiosError, isCancel, type InternalAxiosRequestConfig } from 'axios'
import api from '../src/lib/axios'
import { authApi } from '../src/features/auth/api/auth.api'
import { qrLoginMutationOptions } from '../src/features/auth/api/auth.queries'
import { useAuthStore } from '../src/features/auth/stores/useAuthStore'
import { userService } from '../src/features/user/services/userService'
import { merchantService } from '../src/features/merchant/services/merchantService'
import { adminApi } from '../src/features/admin/api/admin.api'

const user = { id: '10000000-0000-4000-8000-000000000001', username: 'user', firstName: 'A', lastName: 'B', email: 'a@example.com', role: 'USER' as const }
const originalAdapter = api.defaults.adapter
const response = (config: InternalAxiosRequestConfig, data: unknown) => ({
  data, status: 200, statusText: 'OK', headers: {}, config
})
function reject(config: InternalAxiosRequestConfig, status: number): never {
  throw new AxiosError('HTTP error', 'ERR_BAD_RESPONSE', config, undefined, {
    ...response(config, { success: false, error: { code: 'ERROR', message: 'Error' } }), status
  })
}
const session = (token = 'old') => useAuthStore.setState({ user, accessToken: token, initialized: true, loading: false })
afterEach(() => {
  api.defaults.adapter = originalAdapter
  useAuthStore.getState().clearState()
  useAuthStore.setState({ loading: false })
})

test('signin unwraps backend session and avoids nonexistent /user/me', async () => {
  const calls: string[] = []
  api.defaults.adapter = async (config) => {
    calls.push(config.url!)
    return response(config, { success: true, data: { user, accessToken: 'signed-in' } })
  }
  assert.equal(await useAuthStore.getState().signIn('user', 'password'), true)
  assert.equal(useAuthStore.getState().user?.id, user.id)
  assert.equal(useAuthStore.getState().accessToken, 'signed-in')
  assert.deepEqual(calls, ['/auth/signin'])
})

test('failed signin returns false so the form does not navigate', async () => {
  api.defaults.adapter = async (config) => reject(config, 401)
  assert.equal(await useAuthStore.getState().signIn('user', 'wrong'), false)
  assert.equal(useAuthStore.getState().accessToken, null)
})

test('signin waiting for refresh is not sent after a replacement session', async () => {
  session()
  let release!: () => void
  const gate = new Promise<void>((resolve) => { release = resolve })
  let started!: () => void
  const entered = new Promise<void>((resolve) => { started = resolve })
  const calls: string[] = []
  api.defaults.adapter = async (config) => {
    calls.push(config.url!)
    if (config.url === '/auth/refresh') {
      started(); await gate
    }
    return response(config, { success: true, data: { user, accessToken: 'old-session-response' } })
  }

  const refreshing = useAuthStore.getState().refresh()
  await entered
  const signingIn = useAuthStore.getState().signIn('user', 'password')
  const replacement = { user: { ...user, id: '20000000-0000-4000-8000-000000000002' }, accessToken: 'replacement-token' }
  useAuthStore.getState().setSession(replacement)
  release()

  assert.equal(await refreshing, false)
  assert.equal(await signingIn, false)
  assert.deepEqual(calls, ['/auth/refresh'])
  assert.equal(useAuthStore.getState().user?.id, replacement.user.id)
  assert.equal(useAuthStore.getState().accessToken, replacement.accessToken)
  assert.equal(useAuthStore.getState().loading, false)
})

test('a stale signin failure is silent while a current failure still shows an error', async (t) => {
  const errors = t.mock.method(toast, 'error', () => 'synthetic-toast')
  let release!: () => void
  const gate = new Promise<void>((resolve) => { release = resolve })
  let started!: () => void
  const entered = new Promise<void>((resolve) => { started = resolve })
  api.defaults.adapter = async (config) => {
    assert.equal(config.url, '/auth/signin')
    started(); await gate
    return reject(config, 401)
  }

  const signingIn = useAuthStore.getState().signIn('user', 'wrong')
  await entered
  const replacement = { user: { ...user, id: '20000000-0000-4000-8000-000000000002' }, accessToken: 'replacement-token' }
  useAuthStore.getState().setSession(replacement)
  release()

  assert.equal(await signingIn, false)
  assert.equal(errors.mock.callCount(), 0)
  assert.equal(useAuthStore.getState().user?.id, replacement.user.id)
  assert.equal(useAuthStore.getState().accessToken, replacement.accessToken)
  assert.equal(useAuthStore.getState().loading, false)

  // Suppressing a stale failure must not hide errors from a current attempt.
  api.defaults.adapter = async (config) => reject(config, 401)
  assert.equal(await useAuthStore.getState().signIn('user', 'wrong'), false)
  assert.equal(errors.mock.callCount(), 1)
})

test('initialization restores the session once even with duplicate mount effects', async () => {
  useAuthStore.setState({ initialized: false })
  let calls = 0
  api.defaults.adapter = async (config) => {
    calls++
    assert.equal(config.url, '/auth/refresh')
    await new Promise((resolve) => setTimeout(resolve, 10))
    return response(config, { success: true, data: { user, accessToken: 'restored' } })
  }
  await Promise.all([useAuthStore.getState().initialize(), useAuthStore.getState().initialize()])
  assert.equal(calls, 1)
  assert.equal(useAuthStore.getState().initialized, true)
  assert.equal(useAuthStore.getState().accessToken, 'restored')
})

test('concurrent 401s share one refresh and replay requests with the new token', async () => {
  session()
  let refreshes = 0
  let replays = 0
  api.defaults.adapter = async (config) => {
    if (config.url === '/auth/refresh') {
      refreshes++
      await new Promise((resolve) => setTimeout(resolve, 15))
      return response(config, { success: true, data: { user, accessToken: 'new' } })
    }
    if (config.headers.get('Authorization') === 'Bearer old') return reject(config, 401)
    replays++
    assert.equal(config.headers.get('Authorization'), 'Bearer new')
    return response(config, { success: true, data: {} })
  }
  await Promise.all([api.get('/users/profile'), api.get('/merchants/me'), api.get('/users/kyc')])
  assert.equal(refreshes, 1)
  assert.equal(replays, 3)
})

test('403 does not trigger refresh', async () => {
  session()
  let calls = 0
  api.defaults.adapter = async (config) => { calls++; return reject(config, 403) }
  await assert.rejects(api.get('/merchants/'))
  assert.equal(calls, 1)
  assert.equal(useAuthStore.getState().accessToken, 'old')
})

test('failed refresh clears the session and does not loop', async () => {
  session()
  let calls = 0
  api.defaults.adapter = async (config) => { calls++; return reject(config, 401) }
  await assert.rejects(api.get('/users/profile'))
  assert.equal(calls, 2)
  assert.equal(useAuthStore.getState().user, null)
})

test('a retried 401 is not refreshed indefinitely', async () => {
  session()
  let refreshes = 0
  let requests = 0
  api.defaults.adapter = async (config) => {
    if (config.url === '/auth/refresh') {
      refreshes++
      return response(config, { success: true, data: { user, accessToken: 'new' } })
    }
    requests++
    return reject(config, 401)
  }
  await assert.rejects(api.get('/users/profile'))
  assert.equal(refreshes, 1)
  assert.equal(requests, 2)
})

test('logout during refresh cannot restore the old session', async () => {
  session()
  let release!: () => void
  const gate = new Promise<void>((resolve) => { release = resolve })
  let started!: () => void
  const entered = new Promise<void>((resolve) => { started = resolve })
  const calls: string[] = []
  api.defaults.adapter = async (config) => {
    calls.push(config.url!)
    if (config.url === '/auth/refresh') {
      started(); await gate
      return response(config, { success: true, data: { user, accessToken: 'new' } })
    }
    return response(config, { success: true, data: null })
  }
  const refreshing = useAuthStore.getState().refresh()
  await entered
  const logout = useAuthStore.getState().signOut()
  release()
  assert.equal(await refreshing, false)
  await logout
  assert.equal(useAuthStore.getState().user, null)
  assert.deepEqual(calls, ['/auth/refresh', '/auth/signout'])
})

test('old account request is never retried with a new account session', async () => {
  session()
  let calls = 0
  api.defaults.adapter = async (config) => {
    calls++
    useAuthStore.setState({ user: { ...user, id: 'another-account' }, accessToken: 'another-token' })
    return reject(config, 401)
  }
  await assert.rejects(api.get('/users/profile'))
  assert.equal(calls, 1)
})

test('QR creation fails offline without pausing and reconnect requires explicit retry', async () => {
  const previousOnline = onlineManager.isOnline()
  const previousInit = authApi.initQrLogin
  const client = new QueryClient()
  const observer = new MutationObserver(client, qrLoginMutationOptions)
  const offlineError = new AxiosError('Synthetic offline failure', 'ERR_NETWORK')
  const firstSignal = new AbortController().signal
  let calls = 0
  authApi.initQrLogin = async signal => {
    calls++
    assert.equal(signal, firstSignal)
    throw offlineError
  }
  client.mount()
  onlineManager.setOnline(false)
  // Handle rejection immediately, including when checking a paused-regression variant.
  const pending = observer.mutate(firstSignal).catch((error: unknown) => error)
  try {
    await nextTurn()
    assert.equal(calls, 1, 'offline creation must reach the API instead of waiting for reconnect')
    assert.equal(observer.getCurrentResult().isPaused, false)
    assert.equal(await pending, offlineError)
    assert.equal(observer.getCurrentResult().status, 'error')
    onlineManager.setOnline(true)
    await nextTurn()
    assert.equal(calls, 1, 'reconnect must not automatically create another QR')
    assert.equal(observer.getCurrentResult().status, 'error')

    const retrySignal = new AbortController().signal
    const qr = { qrId: 'synthetic-fresh-qr', nonce: 'synthetic-nonce', pollSecret: 'synthetic-secret', expiresAt: new Date(Date.now() + 120000).toISOString() }
    authApi.initQrLogin = async signal => {
      calls++
      assert.equal(signal, retrySignal)
      return qr
    }
    assert.deepEqual(await observer.mutate(retrySignal), qr)
    assert.equal(calls, 2)
    assert.equal(observer.getCurrentResult().status, 'success')
  } finally {
    // Resume a queued regression while the API is still mocked, then restore global state.
    onlineManager.setOnline(true)
    await pending
    observer.reset()
    client.unmount()
    client.clear()
    authApi.initQrLogin = previousInit
    onlineManager.setOnline(previousOnline)
  }
})

test('QR init and polling forward cancellation and reject a late response after abort', async () => {
  const operations = [
    { run: (signal: AbortSignal) => authApi.initQrLogin(signal), url: '/auth/qr-login/init' },
    { run: (signal: AbortSignal) => authApi.getQrStatus('synthetic/qr', 'synthetic-secret', signal), url: '/auth/qr-login/synthetic%2Fqr/status' }
  ]
  for (const operation of operations) {
    const controller = new AbortController()
    let entered!: () => void
    let release!: () => void
    const started = new Promise<void>(resolve => { entered = resolve })
    const gate = new Promise<void>(resolve => { release = resolve })
    api.defaults.adapter = async config => {
      entered()
      assert.equal(config.url, operation.url)
      assert.equal(config.signal, controller.signal)
      if (config.method === 'get') {
        assert.deepEqual(config.params, { pollSecret: 'synthetic-secret' })
        assert.equal(config.headers.get('x-poll-secret'), 'synthetic-secret')
      }
      await gate
      return response(config, { success: true, data: { status: 'PENDING' } })
    }
    const rejected = assert.rejects(operation.run(controller.signal), error => isCancel(error))
    try {
      await started
      controller.abort()
      release()
      await rejected
    } finally {
      release()
      await rejected.catch(() => {})
    }
  }
})

test('already-aborted QR init and polling never reach the adapter', async () => {
  let calls = 0
  api.defaults.adapter = async config => {
    calls++
    return response(config, { success: true, data: { status: 'PENDING' } })
  }
  const controller = new AbortController()
  controller.abort()
  await assert.rejects(authApi.initQrLogin(controller.signal), error => isCancel(error))
  await assert.rejects(authApi.getQrStatus('synthetic-qr', 'synthetic-secret', controller.signal), error => isCancel(error))
  assert.equal(calls, 0)
})

test('KYC service sends both images and idNumber to the current-user endpoint with bearer auth', async () => {
  session()
  api.defaults.adapter = async (config) => {
    assert.equal(config.url, '/users/kyc/documents')
    assert.equal(config.headers.get('Authorization'), 'Bearer old')
    assert.ok(config.data instanceof FormData)
    assert.deepEqual([...config.data.keys()], ['idNumber', 'front', 'back'])
    assert.equal(config.data.get('idNumber'), 'B123')
    const document = config.data.get('front')
    assert.ok(document instanceof File)
    assert.equal(document.name, 'id.png')
    const back = config.data.get('back')
    assert.ok(back instanceof File)
    assert.equal(back.name, 'back.png')
    return response(config, { success: true, data: { kycStatus: 'PENDING' } })
  }
  const saved = await userService.submitKyc({ idNumber: ' B123 ', front: new File(['image'], 'id.png', { type: 'image/png' }), back: new File(['back'], 'back.png', { type: 'image/png' }) })
  assert.equal(saved.kycStatus, 'PENDING')
})

test('admin KYC uses audited endpoints, exact mutation fields and response envelopes', async () => {
  session()
  const calls: Array<{ method?: string; url?: string; body: unknown }> = []
  api.defaults.adapter = async (config) => {
    calls.push({ method: config.method, url: config.url, body: config.data && JSON.parse(config.data) })
    assert.equal(config.headers.get('Authorization'), 'Bearer old')
    return response(config, { success: true, data: { kycTier: 2 }, auditLog: { id: 'audit' } })
  }
  assert.equal((await adminApi.changeKycTier(user.id, 2, ' Bank simulation ')).kycTier, 2)
  await adminApi.reviewKyc(user.id, 'REJECTED', ' Invalid documents ')
  await adminApi.getKycDocuments(user.id)
  assert.deepEqual(calls, [
    { method: 'patch', url: `/admin/kyc/${user.id}/tier`, body: { tier: 2, reason: 'Bank simulation' } },
    { method: 'post', url: `/admin/kyc/${user.id}/review`, body: { status: 'REJECTED', detail: 'Invalid documents' } },
    { method: 'get', url: `/admin/kyc/${user.id}/documents`, body: undefined }
  ])
  api.defaults.adapter = async (config) => response(config, { success: false, error: { code: 'ERROR', message: 'Error' } })
  await assert.rejects(adminApi.changeKycTier(user.id, 1, 'Restore'))
})

test('merchant lookup accepts null but never treats 404 as an empty registration', async () => {
  session()
  api.defaults.adapter = async (config) => response(config, { success: true, data: null })
  assert.equal(await merchantService.getMyMerchant(), null)
  api.defaults.adapter = async (config) => reject(config, 404)
  await assert.rejects(merchantService.getMyMerchant())
})

test('recipient lookup uses authenticated exact search, cancellation and only the masked contract', async () => {
  session()
  const signal = new AbortController().signal
  const recipientId = '20000000-0000-4000-8000-000000000001'
  let calls = 0
  api.defaults.adapter = async (config) => {
    calls++
    assert.equal(config.url, '/users/lookup')
    assert.deepEqual(config.params, { q: '+84 912 345 678' })
    assert.equal(config.signal, signal)
    assert.equal(config.headers.get('Authorization'), 'Bearer old')
    return response(config, { success: true, data: { authUserId: recipientId, maskedName: 'Nguyễn V. B.', email: 'not-for-display@example.com' } })
  }
  assert.deepEqual(await userService.lookupRecipient(' +84 912 345 678 ', signal), { authUserId: recipientId, maskedName: 'Nguyễn V. B.' })
  await assert.rejects(userService.lookupRecipient('partial'))
  assert.equal(calls, 1)
  api.defaults.adapter = async (config) => response(config, { success: true, data: { authUserId: 'not-an-id', maskedName: 'Name' } })
  await assert.rejects(userService.lookupRecipient('user@example.com'))
})
