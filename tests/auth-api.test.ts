import { afterEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import api from '../src/lib/axios'
import { useAuthStore } from '../src/features/auth/stores/useAuthStore'
import { userService } from '../src/features/user/services/userService'
import { merchantService } from '../src/features/merchant/services/merchantService'
import { adminService } from '../src/features/admin/services/adminService'
import { walletService } from '../src/features/wallet/services/walletService'

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
  assert.equal((await adminService.updateKycTier(user.id, 2, ' Bank simulation ')).kycTier, 2)
  await adminService.reviewKyc(user.id, 'REJECTED', ' Invalid documents ')
  await adminService.getKycDocuments(user.id)
  assert.deepEqual(calls, [
    { method: 'patch', url: `/admin/kyc/${user.id}/tier`, body: { tier: 2, reason: 'Bank simulation' } },
    { method: 'post', url: `/admin/kyc/${user.id}/review`, body: { status: 'REJECTED', detail: 'Invalid documents' } },
    { method: 'get', url: `/admin/kyc/${user.id}/documents`, body: undefined }
  ])
  api.defaults.adapter = async (config) => response(config, { success: false, error: { code: 'ERROR', message: 'Error' } })
  await assert.rejects(adminService.updateKycTier(user.id, 1, 'Restore'))
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

test('transfer preserves the caller reference when reconciling an uncertain attempt', async () => {
  session()
  const recipientId = '20000000-0000-4000-8000-000000000001'
  const bodies: unknown[] = []
  api.defaults.adapter = async (config) => {
    assert.equal(config.url, `/wallets/${user.id}/transfer`)
    bodies.push(JSON.parse(config.data))
    return response(config, { success: true, data: { transactionId: 'txn-1', replayed: bodies.length > 1 } })
  }
  await walletService.transfer(user.id, recipientId, '50000', 'P2P-stable-reference')
  assert.equal((await walletService.transfer(user.id, recipientId, '50000', 'P2P-stable-reference')).replayed, true)
  assert.deepEqual(bodies, Array(2).fill({ toUserId: recipientId, amount: '50000', referenceId: 'P2P-stable-reference' }))
  api.defaults.adapter = async (config) => response(config, { success: true, data: {} })
  await assert.rejects(walletService.transfer(user.id, recipientId, '50000', 'P2P-stable-reference'))
})
