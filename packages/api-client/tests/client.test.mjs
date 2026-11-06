import assert from 'node:assert/strict'
import { once } from 'node:events'
import http from 'node:http'
import test from 'node:test'
import { ApiError, createApiClient } from '../src/index.ts'

async function listen(handler) {
  const server = http.createServer(handler)
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  return {
    server,
    baseURL: `http://127.0.0.1:${server.address().port}/api`,
    close: () => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
  }
}

function json(response, status, body) {
  response.writeHead(status, { 'content-type': 'application/json', 'x-request-id': 'request-test' })
  response.end(JSON.stringify(body))
}

function store(initial = {}) {
  let session = {
    accessToken: initial.accessToken ?? 'old-token',
    refreshToken: initial.refreshToken ?? 'refresh-token',
    user: { id: initial.userId ?? 'user-a' }
  }
  let clearCount = 0
  return {
    getAccessToken: () => session.accessToken,
    getRefreshToken: () => session.refreshToken,
    getUserId: () => session.user?.id,
    setSession: value => { session = value },
    clear: () => { clearCount += 1; session = {} },
    replace: value => { session = value },
    get clearCount() { return clearCount }
  }
}

test('attaches Bearer, refreshes once after 401, and replays the request', async t => {
  let protectedCalls = 0
  let refreshCalls = 0
  const server = await listen((request, response) => {
    if (request.url === '/api/auth/refresh') {
      refreshCalls += 1
      return json(response, 200, { success: true, data: { accessToken: 'new-token', user: { id: 'user-a' } } })
    }
    protectedCalls += 1
    if (request.headers.authorization === 'Bearer old-token') {
      return json(response, 401, { success: false, error: { code: 'EXPIRED', message: 'expired' } })
    }
    return json(response, 200, { success: true, data: { ok: true } })
  })
  t.after(server.close)
  const tokenStore = store()
  const api = createApiClient({ baseURL: server.baseURL, platform: 'web', tokenStore })

  assert.deepEqual((await api.http.get('/protected')).data, { success: true, data: { ok: true } })
  assert.equal(protectedCalls, 2)
  assert.equal(refreshCalls, 1)
})

test('20 concurrent 401 responses share exactly one refresh request', async t => {
  let refreshCalls = 0
  const server = await listen((request, response) => {
    if (request.url === '/api/auth/refresh') {
      refreshCalls += 1
      setTimeout(() => json(response, 200, {
        success: true,
        data: { accessToken: 'new-token', user: { id: 'user-a' } }
      }), 30)
      return
    }
    if (request.headers.authorization === 'Bearer old-token') {
      return json(response, 401, { success: false, error: { code: 'EXPIRED', message: 'expired' } })
    }
    return json(response, 200, { success: true, data: { ok: true } })
  })
  t.after(server.close)
  const api = createApiClient({ baseURL: server.baseURL, platform: 'web', tokenStore: store() })

  const responses = await Promise.all(
    Array.from({ length: 20 }, (_, index) => api.http.get(`/protected/${index}`))
  )
  assert.equal(responses.length, 20)
  assert.equal(refreshCalls, 1)
})

test('failed refresh clears the session and notifies the app', async t => {
  let expiredCalls = 0
  const server = await listen((request, response) => {
    json(response, 401, { success: false, error: { code: 'REFRESH_REJECTED', message: 'expired' } })
  })
  t.after(server.close)
  const tokenStore = store()
  const api = createApiClient({
    baseURL: server.baseURL,
    platform: 'web',
    tokenStore,
    onSessionExpired: () => { expiredCalls += 1 }
  })

  await assert.rejects(api.http.get('/protected'), error => {
    assert.ok(error instanceof ApiError)
    assert.equal(error.status, 401)
    assert.equal(error.code, 'REFRESH_REJECTED')
    assert.equal(error.requestId, 'request-test')
    return true
  })
  assert.equal(tokenStore.clearCount, 1)
  assert.equal(expiredCalls, 1)
})

test('refresh network failure preserves the session and does not notify expiration', async t => {
  const server = await listen(request => request.socket.destroy())
  t.after(server.close)
  const tokenStore = store()
  let expiredCalls = 0
  const api = createApiClient({
    baseURL: server.baseURL,
    platform: 'mobile',
    tokenStore,
    onSessionExpired: () => { expiredCalls += 1 }
  })

  await assert.rejects(api.auth.refresh(), error => {
    assert.ok(error instanceof ApiError)
    assert.equal(error.code, 'NETWORK_ERROR')
    return true
  })
  assert.equal(tokenStore.clearCount, 0)
  assert.equal(expiredCalls, 0)
  assert.equal(tokenStore.getRefreshToken(), 'refresh-token')
})

test('refresh server error preserves the session', async t => {
  const server = await listen((request, response) => {
    json(response, 500, { success: false, error: { code: 'INTERNAL_ERROR', message: 'unavailable' } })
  })
  t.after(server.close)
  const tokenStore = store()
  let expiredCalls = 0
  const api = createApiClient({
    baseURL: server.baseURL,
    platform: 'mobile',
    tokenStore,
    onSessionExpired: () => { expiredCalls += 1 }
  })

  await assert.rejects(api.auth.refresh(), error => {
    assert.ok(error instanceof ApiError)
    assert.equal(error.status, 500)
    assert.equal(error.code, 'INTERNAL_ERROR')
    return true
  })
  assert.equal(tokenStore.clearCount, 0)
  assert.equal(expiredCalls, 0)
  assert.equal(tokenStore.getRefreshToken(), 'refresh-token')
})

test('refresh rejection with 401 clears the session and notifies expiration', async t => {
  const server = await listen((request, response) => {
    json(response, 401, { success: false, error: { code: 'REFRESH_REJECTED', message: 'expired' } })
  })
  t.after(server.close)
  const tokenStore = store()
  let expiredCalls = 0
  const api = createApiClient({
    baseURL: server.baseURL,
    platform: 'mobile',
    tokenStore,
    onSessionExpired: () => { expiredCalls += 1 }
  })

  await assert.rejects(api.auth.refresh(), error => {
    assert.ok(error instanceof ApiError)
    assert.equal(error.code, 'SESSION_EXPIRED')
    return true
  })
  assert.equal(tokenStore.clearCount, 1)
  assert.equal(expiredCalls, 1)
})

test('successful refresh response without session credentials expires the session', async t => {
  const server = await listen((request, response) => {
    json(response, 200, { success: true, data: { accessToken: 'new-token', user: {} } })
  })
  t.after(server.close)
  const tokenStore = store()
  let expiredCalls = 0
  const api = createApiClient({
    baseURL: server.baseURL,
    platform: 'mobile',
    tokenStore,
    onSessionExpired: () => { expiredCalls += 1 }
  })

  await assert.rejects(api.auth.refresh(), error => {
    assert.ok(error instanceof ApiError)
    assert.equal(error.code, 'SESSION_EXPIRED')
    return true
  })
  assert.equal(tokenStore.clearCount, 1)
  assert.equal(expiredCalls, 1)
})

test('does not replay an old account request using a new account session', async t => {
  let refreshStarted
  const refreshReady = new Promise(resolve => { refreshStarted = resolve })
  let releaseRefresh
  const refreshGate = new Promise(resolve => { releaseRefresh = resolve })
  let protectedCalls = 0
  const server = await listen(async (request, response) => {
    if (request.url === '/api/auth/refresh') {
      refreshStarted()
      await refreshGate
      return json(response, 200, { success: true, data: { accessToken: 'new-a', user: { id: 'user-a' } } })
    }
    protectedCalls += 1
    return json(response, 401, { success: false, error: { code: 'EXPIRED', message: 'expired' } })
  })
  t.after(server.close)
  const tokenStore = store()
  const api = createApiClient({ baseURL: server.baseURL, platform: 'web', tokenStore })
  const oldRequest = api.http.get('/protected')
  await refreshReady
  tokenStore.replace({ accessToken: 'account-b-token', user: { id: 'user-b' } })
  releaseRefresh()

  await assert.rejects(oldRequest)
  assert.equal(protectedCalls, 1)
  assert.equal(tokenStore.getAccessToken(), 'account-b-token')
})

test('does not retry auth endpoints after 401', async t => {
  let refreshCalls = 0
  const server = await listen((request, response) => {
    if (request.url === '/api/auth/refresh') refreshCalls += 1
    json(response, 401, { success: false, error: { code: 'INVALID_CREDENTIALS', message: 'bad credentials' } })
  })
  t.after(server.close)
  const api = createApiClient({ baseURL: server.baseURL, platform: 'web', tokenStore: store() })

  await assert.rejects(api.auth.signIn({ username: 'user', password: 'bad' }))
  assert.equal(refreshCalls, 0)
})

test('does not refresh for 403, aborted requests, or more than one retry', async t => {
  let refreshCalls = 0
  let protectedCalls = 0
  const server = await listen(async (request, response) => {
    if (request.url === '/api/auth/refresh') {
      refreshCalls += 1
      return json(response, 200, { success: true, data: { accessToken: 'new-token', user: { id: 'user-a' } } })
    }
    if (request.url === '/api/forbidden') {
      return json(response, 403, { success: false, error: { code: 'FORBIDDEN', message: 'forbidden' } })
    }
    protectedCalls += 1
    if (request.url === '/api/aborted') {
      await new Promise(resolve => setTimeout(resolve, 40))
    }
    return json(response, 401, { success: false, error: { code: 'EXPIRED', message: 'expired' } })
  })
  t.after(server.close)
  const api = createApiClient({ baseURL: server.baseURL, platform: 'web', tokenStore: store() })

  await assert.rejects(api.http.get('/forbidden'), error => error.status === 403)
  const controller = new AbortController()
  const aborted = api.http.get('/aborted', { signal: controller.signal })
  await new Promise(resolve => setTimeout(resolve, 5))
  controller.abort()
  await assert.rejects(aborted)
  await assert.rejects(api.http.get('/always-unauthorized'))

  assert.equal(refreshCalls, 1)
  assert.equal(protectedCalls, 3)
})

test('mobile auth sends platform header and refresh token in request body', async t => {
  const requests = []
  const server = await listen(async (request, response) => {
    const chunks = []
    for await (const chunk of request) chunks.push(chunk)
    requests.push({
      url: request.url,
      platform: request.headers['x-client-platform'],
      body: Buffer.concat(chunks).toString()
    })
    if (request.url === '/api/auth/signin') {
      return json(response, 200, { success: true, data: {
        accessToken: 'mobile-access',
        refreshToken: 'mobile-refresh',
        user: { id: 'mobile-user' }
      } })
    }
    return json(response, 200, { success: true, data: {
      accessToken: 'mobile-access-2',
      refreshToken: 'mobile-refresh-2',
      user: { id: 'mobile-user' }
    } })
  })
  t.after(server.close)
  const tokenStore = store({ accessToken: null, userId: null, refreshToken: 'seed-refresh' })
  const api = createApiClient({ baseURL: server.baseURL, platform: 'mobile', tokenStore })

  await api.auth.signIn({ username: 'mobile', password: 'password' })
  await api.auth.refresh()
  assert.equal(api.http.defaults.withCredentials, false)
  assert.equal(requests[0].platform, 'mobile')
  assert.equal(requests[1].platform, 'mobile')
  assert.deepEqual(JSON.parse(requests[1].body), { refreshToken: 'mobile-refresh' })
})

test('web auth uses cookies and never sends refresh token in the body', async t => {
  let refreshBody
  const server = await listen(async (request, response) => {
    const chunks = []
    for await (const chunk of request) chunks.push(chunk)
    if (request.url === '/api/auth/signin') {
      return json(response, 200, { success: true, data: {
        accessToken: 'web-access',
        refreshToken: 'must-not-be-stored-on-web',
        user: { id: 'user-a' }
      } })
    }
    refreshBody = Buffer.concat(chunks).toString()
    return json(response, 200, { success: true, data: {
      accessToken: 'web-access-2',
      user: { id: 'user-a' }
    } })
  })
  t.after(server.close)
  const tokenStore = store()
  const api = createApiClient({ baseURL: server.baseURL, platform: 'web', tokenStore })

  await api.auth.signIn({ username: 'web', password: 'password' })
  assert.equal(tokenStore.getRefreshToken(), undefined)
  await api.auth.refresh()
  assert.equal(api.http.defaults.withCredentials, true)
  assert.equal(refreshBody, '{}')
})
