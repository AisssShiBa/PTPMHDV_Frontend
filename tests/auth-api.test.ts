import { afterEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import api from '../src/lib/axios'
import { useAuthStore } from '../src/features/auth/stores/useAuthStore'
import { userService } from '../src/features/user/services/userService'
import { merchantService } from '../src/features/merchant/services/merchantService'

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

test('KYC service sends only multipart idNumber and document with bearer auth', async () => {
  session()
  api.defaults.adapter = async (config) => {
    assert.equal(config.url, '/users/by-auth/' + user.id + '/kyc')
    assert.equal(config.headers.get('Authorization'), 'Bearer old')
    assert.ok(config.data instanceof FormData)
    assert.deepEqual([...config.data.keys()], ['idNumber', 'document'])
    assert.equal(config.data.get('idNumber'), 'B123')
    const document = config.data.get('document')
    assert.ok(document instanceof File)
    assert.equal(document.name, 'id.png')
    return response(config, { success: true, data: { kycStatus: 'PENDING' } })
  }
  const saved = await userService.submitKyc(user.id, { idNumber: ' B123 ', document: new File(['image'], 'id.png', { type: 'image/png' }) })
  assert.equal(saved.kycStatus, 'PENDING')
})

test('merchant lookup accepts null but never treats 404 as an empty registration', async () => {
  session()
  api.defaults.adapter = async (config) => response(config, { success: true, data: null })
  assert.equal(await merchantService.getMyMerchant(), null)
  api.defaults.adapter = async (config) => reject(config, 404)
  await assert.rejects(merchantService.getMyMerchant())
})
