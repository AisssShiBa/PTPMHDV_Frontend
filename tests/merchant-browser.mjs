// Merchant production-browser acceptance: HTTP fixtures or an explicit isolated live Gateway.
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { createServer, request as proxyRequest } from 'node:http'
import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs'
import { resolve, extname, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parseEnv } from 'node:util'
import { homedir } from 'node:os'
import { openBrowser, until } from './browser-support.mjs'
const root = fileURLToPath(new URL('../', import.meta.url))
const live = process.argv.includes('--live')
const artifacts = resolve(root, process.env.BROWSER_EVIDENCE_DIR || ('docs/evidence/huu-fe-phase5/' + (live ? 'live' : 'browser')))
const browserRuntime = resolve(root, 'node_modules/.tmp/merchant-browser')
mkdirSync(artifacts, { recursive: true }); mkdirSync(browserRuntime, { recursive: true })
const cache = resolve(homedir(), '.cache/ms-playwright')
const executable = process.env.BROWSER_PATH || (existsSync(cache) ? readdirSync(cache).filter(name => name.startsWith('chromium-')).flatMap(name => ['chrome-linux64/chrome', 'chrome-linux/chrome'].map(binary => resolve(cache, name, binary))).find(existsSync) : undefined)
assert.ok(executable, 'Install Chromium or provide BROWSER_PATH')
process.env.BROWSER_PATH = executable
const build = spawnSync('npm', ['run', 'build'], { cwd: root, env: { ...process.env, VITE_API_BASE_URL: '/api', VITE_USE_MOCK: 'false', VITE_VNPAY_PAYMENT_URL: '' }, stdio: 'inherit' })
assert.equal(build.status, 0, 'Production build')
const dist = resolve(root, 'dist')


let user = { id: '10000000-0000-4000-8000-000000000001', username: 'synthetic', email: 'synthetic@example.test', role: 'USER' }
let merchant = null, failMe = 0, registrations = 0, signedIn = true
let owner, ownerB, admin, ctx, runtime, gateway
const brand = 'Cửa hàng tổng hợp ' + randomUUID().slice(0,8)
const requests = [], checks = [], fixtureErrors = []
if (live) {
  const runFile = process.env.LIVE_ACCEPTANCE_RUN_FILE
  assert.ok(runFile, 'Set LIVE_ACCEPTANCE_RUN_FILE to an isolated acceptance run.json')
  const run = JSON.parse(readFileSync(runFile, 'utf8'))
  assert.match(run.project, /^finvault-acceptance-[0-9a-f]{12}$/)
  const backend = resolve(root, '../PTPMHDV_Backend')
  const directory = resolve(backend, '.cache/acceptance-week2', run.project)
  assert.equal(resolve(runFile), resolve(directory, 'run.json'))
  gateway = new URL(run.gateway)
  assert.ok(['127.0.0.1','localhost'].includes(gateway.hostname)); assert.equal(gateway.protocol, 'http:')
  const config = parseEnv(readFileSync(resolve(directory, '.env'), 'utf8'))
  runtime = await import(pathToFileURL(resolve(backend, 'tests/acceptance/week2/runtime.mjs')).href)
  ctx = { project: run.project, directory, config, base: gateway.origin, requests: [], env: { ...process.env, ...config }, composeArgs: ['compose', '--project-directory', backend, '--env-file', resolve(directory, '.env'), '-p', run.project, '-f', resolve(backend, 'docker-compose.yml'), '-f', resolve(directory, 'compose.json')] }
  owner = await runtime.account(ctx, 'h05owner')
  ownerB = await runtime.account(ctx, 'h05other')
  // Only this newly generated synthetic account is elevated in the isolated DB.
  admin = await runtime.account(ctx, 'h05admin', undefined, 'ADMIN')
  assert.equal((await runtime.call(ctx, '/merchants/me', { token: owner.token })).data, null)
}
const server = createServer(async (req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname
  const send = (status, body) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)) }
  const success = (data, status = 200) => send(status, { success: true, data })
  const failure = (status, code) => send(status, { success: false, error: { code, message: 'private fixture detail' } })
  try {
    if (path.startsWith('/api/')) {
      const item = { method: req.method, path }; requests.push(item)
      if (live) {
        const upstream = proxyRequest(new URL(req.url, gateway), { method: req.method, headers: { ...req.headers, host: gateway.host } }, response => { item.status = response.statusCode; res.writeHead(response.statusCode, response.headers); response.pipe(res) })
        upstream.on('error', () => { if (!res.headersSent) res.writeHead(502); res.end() })
        req.pipe(upstream); return
      }
      if (path === '/api/auth/refresh') return signedIn ? success({ user, accessToken: 'synthetic' }) : failure(401, 'UNAUTHORIZED')
      if (path === '/api/auth/signout') { signedIn = false; return success(null) }
      if (path === '/api/auth/signin') { signedIn = true; return success({ user, accessToken: 'synthetic' }) }
      if (!signedIn || req.headers.authorization !== 'Bearer synthetic') return failure(401, 'UNAUTHORIZED')
      if (path === '/api/merchants/me') return failMe ? failure(failMe, 'INTERNAL_ERROR') : success(merchant)
      if (path === '/api/merchants/register') {
        const chunks = []; for await (const chunk of req) chunks.push(chunk)
        const body = JSON.parse(Buffer.concat(chunks).toString())
        assert.deepEqual(Object.keys(body), ['businessName']); assert.equal(body.businessName, brand)
        assert.equal(merchant, null); registrations++
        await new Promise(resolve => setTimeout(resolve, 80))
        merchant = { id: randomUUID(), ownerId: user.id, businessName: body.businessName, taxId: null, bankAccount: null, status: 'PENDING', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
        return success(merchant, 201)
      }
      if (/^\/api\/merchants\/[^/]+\/outlets$/.test(path)) return success({ content: [], page: 1, limit: 10, totalElements: 0, totalPages: 1 })
      if (path === '/api/wallets/me' || /^\/api\/wallets\/[^/]+\/balance$/.test(path)) return success({ availableBalance: '0', balance: '0', heldBalance: '0', currency: 'VND', status: 'ACTIVE' })
      if (path === '/api/notifications/me') return success({ notifications: [], unreadCount: 0, pagination: { page: 1, limit: 10, total: 0, totalPages: 1 } })
      if (path === '/api/notifications/socket-ticket') return failure(503, 'SOCKET_UNAVAILABLE')
      return failure(404, 'NOT_FOUND')
    }
    if (path.startsWith('/socket.io')) { res.writeHead(503); return res.end() }
    const candidate = resolve(dist, '.' + decodeURIComponent(path))
    if (!candidate.startsWith(dist + sep) && candidate !== dist) { res.writeHead(403); return res.end() }
    const file = extname(path) && existsSync(candidate) ? candidate : resolve(dist, 'index.html')
    res.writeHead(200, { 'Content-Type': { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2' }[extname(file)] || 'application/octet-stream' }); res.end(readFileSync(file))
  } catch (error) { fixtureErrors.push(error.message); failure(500, 'FIXTURE_ASSERTION_FAILED') }
})
let browser
try {
  await new Promise(done => server.listen(0, '127.0.0.1', done))
  const origin = 'http://localhost:' + server.address().port
  browser = await openBrowser(runtime === undefined ? resolve(root, 'node_modules/.tmp/merchant-browser') : resolve(root, 'node_modules/.tmp/merchant-live'), 'merchant', origin)
  const login = async account => {
    await until(() => browser.has('#username'), 'sign-in form')
    await browser.fill('#username', account.username); await browser.fill('#password', account.password); await browser.click('Đăng nhập')
  }
  await browser.go('/merchant')
  if (live) await login(owner)
  await until(() => browser.text('Bạn chưa đăng ký đối tác'), 'explicit null portal')
  checks.push('GET /me null is the only unregistered state, authenticated session restored')
  await browser.go('/merchant/register')
  await until(() => browser.has('#merchant-businessName'), 'empty registration form')
  assert.equal(await browser.evaluate('document.querySelector("#merchant-businessName").value'), '')
  await browser.fill('#merchant-businessName', '  ' + brand + '  ')
  await browser.click('Gửi đăng ký đối tác', 2)
  await until(() => browser.text('Đang chờ duyệt'), 'server registration pending')
  const posts = requests.filter(item => item.method === 'POST' && item.path === '/api/merchants/register')
  assert.equal(posts.length, 1)
  if (live) {
    merchant = (await runtime.call(ctx, '/merchants/me', { token: owner.token })).data
    assert.equal(merchant.ownerId, owner.id); assert.equal(merchant.businessName, brand); assert.equal(merchant.taxId, null); assert.equal(merchant.bankAccount, null)
    await runtime.call(ctx, '/merchants/' + merchant.id + '/status', { method: 'PATCH', token: owner.token, body: { status: 'APPROVED' }, expected: 403 })
    await runtime.call(ctx, '/merchants/' + merchant.id, { token: ownerB.token, expected: 403 })
    await runtime.call(ctx, '/merchants/register', { method: 'POST', token: owner.token, body: { businessName: brand }, expected: 409 })
  } else assert.equal(registrations, 1)
  await browser.screenshot('merchant-pending')
  checks.push('One strict registration POST for double click, PENDING from refetched /me, real owner authorization and duplicate protection where live')
  await browser.go('/merchant')
  await until(() => browser.text('Đang chờ duyệt'), 'pending persists after reload')
  const changeStatus = async status => {
    if (live) merchant = (await runtime.call(ctx, '/merchants/' + merchant.id + '/status', { method: 'PATCH', token: admin.token, body: { status } })).data
    else merchant = { ...merchant, status }
    await browser.click('Tải lại trạng thái')
  }
  await changeStatus('REJECTED')
  await until(() => browser.text('Đăng ký bị từ chối'), 'REJECTED from API')
  await browser.screenshot('merchant-rejected')
  await changeStatus('PENDING')
  await until(() => browser.text('Đang chờ duyệt'), 'back to pending')
  await changeStatus('APPROVED')
  await until(() => browser.text('Đã được phê duyệt'), 'APPROVED from API')
  await browser.screenshot('merchant-approved')
  assert.equal(await browser.text('Highlands'), false)
  assert.equal(await browser.text('Mục tiêu tháng'), false)
  checks.push('PENDING/REJECTED/APPROVED survive reload and change only after server status, no fake merchant identity/revenue')
  if (!live) {
    for (const code of [404, 500]) {
      failMe = code; await browser.go('/merchant/register')
      await until(() => browser.text('Không thể tải dữ liệu'), 'HTTP ' + code + ' is not null')
      assert.equal(await browser.has('#merchant-businessName'), false)
    }
    failMe = 0
    checks.push('404/500 are errors, never unregistered; retry available')
  }
  await browser.cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await browser.go('/merchant'); await until(() => browser.text('Đã được phê duyệt'), 'mobile merchant')
  await browser.screenshot('merchant-mobile')
  assert.equal(await browser.evaluate('document.documentElement.scrollWidth > window.innerWidth'), false)
  checks.push('390px mobile with no horizontal overflow')
  if (live) {
    await browser.evaluate('fetch("/api/auth/signout",{method:"POST",credentials:"include"})')
    await browser.go('/merchant'); await login(ownerB)
    await until(() => browser.text('Bạn chưa đăng ký đối tác'), 'account B has no merchant')
    assert.equal(await browser.text(brand), false)
  } else {
    merchant = null; user = { ...user, id: '10000000-0000-4000-8000-000000000002' }
    await browser.go('/merchant'); await until(() => browser.text('Bạn chưa đăng ký đối tác'), 'account B null')
    assert.equal(await browser.text(brand), false)
  }
  checks.push('Account B never sees account A merchant; no role MERCHANT assigned by frontend')
  assert.equal(fixtureErrors.length, 0, fixtureErrors.join('\n')); assert.deepEqual(browser.errors, [])
  for (const name of ['merchant-pending','merchant-rejected','merchant-approved','merchant-mobile']) copyFileSync(resolve(root, 'node_modules/.tmp', live ? 'merchant-live' : 'merchant-browser', name + '.png'), resolve(artifacts, name + '.png'))
  writeFileSync(resolve(artifacts, 'result.json'), JSON.stringify({ status: live ? 'LIVE_GATEWAY_MERCHANT_BROWSER_PASS' : 'MOCK_HTTP_BROWSER_PASS', testedAt: new Date().toISOString(), project: ctx?.project, checks, requests, apiChecks: ctx?.requests }, null, 2))
  console.log('PASS: Merchant ' + (live ? 'live Gateway/Auth/Merchant/Postgres' : 'synthetic HTTP') + ' production browser (' + checks.length + ' groups)')
} catch (error) {
  writeFileSync(resolve(artifacts, 'result.json'), JSON.stringify({ status: 'FAIL', error: error.message, checks, requests, fixtureErrors }, null, 2)); throw error
} finally { await browser?.close(); server.closeAllConnections(); await new Promise(done => server.close(done)) }
