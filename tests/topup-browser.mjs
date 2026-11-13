// Production browser regression against synthetic HTTP fixtures, not VNPAY live.
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs'
import { resolve, extname, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { homedir } from 'node:os'
import { openBrowser, until } from './browser-support.mjs'
const root = fileURLToPath(new URL('../', import.meta.url))
const artifacts = resolve(root, process.env.BROWSER_EVIDENCE_DIR || 'docs/evidence/huu-fe-phase3/browser')
const runtime = resolve(root, 'node_modules/.tmp/topup-browser')
mkdirSync(artifacts, { recursive: true }); mkdirSync(runtime, { recursive: true })
const cache = resolve(homedir(), '.cache/ms-playwright')
const executable = process.env.BROWSER_PATH || (existsSync(cache) ? readdirSync(cache).filter(name => name.startsWith('chromium-')).flatMap(name => ['chrome-linux64/chrome', 'chrome-linux/chrome'].map(binary => resolve(cache, name, binary))).find(existsSync) : undefined)
assert.ok(executable, 'Install Chromium or provide BROWSER_PATH')
process.env.BROWSER_PATH = executable
const build = spawnSync('npm', ['run', 'build'], { cwd: root, env: { ...process.env, VITE_API_BASE_URL: '/api', VITE_USE_MOCK: 'false', VITE_VNPAY_PAYMENT_URL: '' }, stdio: 'inherit' })
assert.equal(build.status, 0, 'Production build')
const dist = resolve(root, 'dist')
const id = '20000000-0000-4000-8000-000000000001'
let user = { id: '10000000-0000-4000-8000-000000000001', username: 'synthetic', email: 'synthetic@example.test', role: 'USER' }
let status = 'PROCESSING'
let balance = '100000'
let failRead = false
let otherAccount = false
let signedIn = true
let refreshes = 0
const requests = [], checks = [], fixtureErrors = []
const row = () => ({ id, code: 'NAPABC123', amount: '100000.00', status, expiresAt: '2020-01-01T00:00:00Z' })
const server = createServer(async (req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname
  const send = (code, data) => { res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)) }
  const success = data => send(200, { success: true, data })
  const failure = (code, error) => send(code, { success: false, error: { code: error, message: 'private fixture detail', traceId: 'fixture-trace' } })
  try {
    if (path.startsWith('/api/')) {
      requests.push({ method: req.method, path })
      if (path === '/api/auth/refresh') { refreshes++; return signedIn ? success({ user, accessToken: 'synthetic' }) : failure(401, 'UNAUTHORIZED') }
      if (path === '/api/auth/signin') { for await (const _ of req) { /* discard credentials */ } signedIn = true; return success({ user, accessToken: 'synthetic' }) }
      if (path === '/api/auth/signout') { signedIn = false; return success(null) }
      if (!signedIn || req.headers.authorization !== 'Bearer synthetic') return failure(401, 'UNAUTHORIZED')
      if (path === '/api/payments/topups') {
        if (req.method === 'POST') {
          const chunks = []; for await (const chunk of req) chunks.push(chunk)
          assert.deepEqual(JSON.parse(Buffer.concat(chunks).toString()), { amount: '100000' })
          assert.match(req.headers['idempotency-key'], /^[0-9a-f-]{36}$/)
          return success({ topupId: id, paymentUrl: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?synthetic=true' })
        }
        assert.equal(req.method, 'GET'); return success(otherAccount ? [] : [row()])
      }
      if (path === '/api/payments/topups/' + id) return otherAccount ? failure(403, 'FORBIDDEN') : failRead ? failure(503, 'HTTP_503') : success(row())
      if (path === '/api/wallets/me' || /^\/api\/wallets\/[^/]+\/balance$/.test(path)) return success({ availableBalance: balance, balance, heldBalance: '0', currency: 'VND', status: 'ACTIVE' })
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
  const origin = 'http://127.0.0.1:' + server.address().port
  browser = await openBrowser(runtime, 'topup', origin)
  await browser.go('/app/topup')
  await until(() => browser.has('#topup-amount'), 'topup form after cookie refresh')
  await until(() => browser.text('NAPABC123'), 'account topup history')
  assert.ok(refreshes > 0)
  await browser.click('Tiếp tục tới VNPAY', 2)
  await until(() => browser.text('Chưa thể chuyển tới cổng thanh toán. Vui lòng kiểm tra lệnh đã tạo trong lịch sử.'), 'unconfigured redirect remains blocked after safe create')
  assert.equal(requests.filter(row => row.method === 'POST' && row.path === '/api/payments/topups').length, 1)
  await browser.screenshot('topup-desktop')
  checks.push('Production string create with Idempotency-Key, one POST on double click; unconfigured redirect blocked, history/wallet from HTTP')
  await browser.go('/app/topup/result?vnp_TxnRef=NAPABC123&vnp_ResponseCode=00')
  await until(() => browser.text('Đang đối soát'), 'NAP history correlation')
  assert.equal(await browser.text('Nạp tiền thành công'), false)
  assert.ok(requests.some(row => row.path === '/api/payments/topups/' + id))
  checks.push('Full reload refresh, exact NAP-to-UUID account history lookup; fake callback 00 remains pending')
  await browser.screenshot('return-pending')
  status = 'APPROVED'; balance = '200000'
  await browser.click('Kiểm tra lại')
  await until(() => browser.text('Nạp tiền thành công'), 'server APPROVED')
  await until(() => browser.text('200.000 ₫'), 'server wallet refresh')
  await browser.screenshot('return-approved')
  checks.push('Server status APPROVED produces receipt; wallet read from server, no local credit')
  failRead = true
  await browser.go('/app/topup/result?topupId=' + id)
  await until(() => browser.text('Mã yêu cầu: fixture-trace'), '503 read error')
  assert.equal(await browser.text('Nạp tiền thành công'), false)
  failRead = false; status = 'EXPIRED'
  await browser.click('Kiểm tra lại')
  await until(() => browser.text('Đã hết hạn'), 'server EXPIRED')
  checks.push('503 is unknown outcome; EXPIRED only from backend, safe request ID shown')
  otherAccount = true; user = { ...user, id: '10000000-0000-4000-8000-000000000002' }
  await browser.go('/app/topup/result?vnp_TxnRef=NAPABC123&vnp_ResponseCode=00')
  await until(() => browser.text('Chưa xác định được lệnh nạp.'), 'other account no matching order')
  assert.equal(await browser.text('Nạp tiền thành công'), false)
  checks.push('Account change and empty history never select another account order')
  await browser.cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await browser.go('/app/topup')
  await until(() => browser.has('#topup-amount'), 'mobile form')
  await browser.screenshot('topup-mobile')
  assert.equal(await browser.evaluate('document.documentElement.scrollWidth > window.innerWidth'), false)
  checks.push('390px mobile layout without horizontal overflow')
  signedIn = false; otherAccount = false; status = 'PENDING'
  await browser.go('/app/topup/result?topupId=' + id)
  await until(() => browser.has('#username'), 'expired session redirects to login')
  await browser.fill('#username', 'synthetic')
  await browser.fill('#password', 'synthetic-password')
  await browser.click('Đăng nhập')
  await until(() => browser.text('Đang chờ thanh toán'), 'login returns to original topup UUID')
  assert.equal(await browser.evaluate('new URLSearchParams(location.search).get("topupId")'), id)
  checks.push('Expired session login preserves callback query and resolves the same UUID')
  for (const name of ['topup-desktop', 'return-pending', 'return-approved', 'topup-mobile']) copyFileSync(resolve(runtime, name + '.png'), resolve(artifacts, name + '.png'))
  assert.ok(!requests.some(row => row.path.includes('/ipn')))
  assert.equal(fixtureErrors.length, 0, fixtureErrors.join('\n'))
  assert.deepEqual(browser.errors, [])
  writeFileSync(resolve(artifacts, 'result.json'), JSON.stringify({ status: 'MOCK_HTTP_BROWSER_PASS', testedAt: new Date().toISOString(), checks, requests, realVnpaySandbox: 'NOT_RUN' }, null, 2))
  console.log('PASS: Phase 3 topup production browser regression (7 groups), synthetic HTTP only; REAL_VNPAY_SANDBOX=NOT_RUN')
} catch (error) {
  writeFileSync(resolve(artifacts, 'result.json'), JSON.stringify({ status: 'FAIL', checks, error: error.message }, null, 2)); throw error
} finally { await browser?.close(); await new Promise(done => server.close(done)) }
