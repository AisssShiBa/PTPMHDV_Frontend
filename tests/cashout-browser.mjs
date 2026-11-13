// Production browser regression against synthetic HTTP fixtures, not VNPAY live.
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { createServer } from 'node:http'
import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync, mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs'
import { resolve, extname, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { homedir } from 'node:os'
import { openBrowser, until } from './browser-support.mjs'
const root = fileURLToPath(new URL('../', import.meta.url))
const artifacts = resolve(root, process.env.BROWSER_EVIDENCE_DIR || 'docs/evidence/huu-fe-phase4/browser')
const runtime = resolve(root, 'node_modules/.tmp/cashout-browser')
mkdirSync(artifacts, { recursive: true }); mkdirSync(runtime, { recursive: true })
const cache = resolve(homedir(), '.cache/ms-playwright')
const executable = process.env.BROWSER_PATH || (existsSync(cache) ? readdirSync(cache).filter(name => name.startsWith('chromium-')).flatMap(name => ['chrome-linux64/chrome', 'chrome-linux/chrome'].map(binary => resolve(cache, name, binary))).find(existsSync) : undefined)
assert.ok(executable, 'Install Chromium or provide BROWSER_PATH')
process.env.BROWSER_PATH = executable
const build = spawnSync('npm', ['run', 'build'], { cwd: root, env: { ...process.env, VITE_API_BASE_URL: '/api', VITE_USE_MOCK: 'false', VITE_VNPAY_PAYMENT_URL: '' }, stdio: 'inherit' })
assert.equal(build.status, 0, 'Production build')
const dist = resolve(root, 'dist')

let user = { id: '10000000-0000-4000-8000-000000000001', username: 'synthetic', email: 'synthetic@example.test', role: 'USER' }
let balance = '500000', mode = 'SUCCESS', unknownCreate = false
const orders = new Map(), keys = new Map(), tokens = new Map(), confirms = new Map()
const requests = [], checks = [], fixtureErrors = [], createKeys = []
let lastId
const server = createServer(async (req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname
  const send = (status, data) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(data)) }
  const success = (data, status = 200) => send(status, { success: true, data })
  const failure = (status, code) => send(status, { success: false, error: { code, message: 'private fixture detail', traceId: 'synthetic-cashout-trace' } })
  try {
    if (path.startsWith('/api/')) {
      requests.push({ method: req.method, path })
      if (path === '/api/auth/refresh') return success({ user, accessToken: 'synthetic' })
      if (path === '/api/auth/signout') return success(null)
      if (req.headers.authorization !== 'Bearer synthetic') return failure(401, 'UNAUTHORIZED')
      const chunks = []; for await (const chunk of req) chunks.push(chunk)
      const body = Buffer.concat(chunks).length ? JSON.parse(Buffer.concat(chunks).toString()) : undefined
      if (path === '/api/funding/cash-out' && req.method === 'POST') {
        assert.equal(typeof body.amount, 'string'); assert.equal(body.amount, '100000')
        const key = req.headers['idempotency-key']; assert.match(key, /^[0-9a-f-]{36}$/); createKeys.push(key)
        if (!keys.has(key)) {
          const id = randomUUID(); keys.set(key, id)
          orders.set(id, { id, userId: user.id, amount: body.amount, destination: body.destination || null, status: 'REQUESTED', failureReason: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() })
        }
        lastId = keys.get(key)
        if (unknownCreate) { unknownCreate = false; return failure(503, 'HTTP_503') }
        return success(orders.get(lastId), 201)
      }
      if (path === '/api/auth/pin/verify') {
        assert.equal(body.pin, '111111'); assert.equal(body.paymentId, lastId); assert.equal(body.amount, orders.get(lastId).amount)
        const token = 'synthetic-once-' + randomUUID(); tokens.set(token, body.paymentId)
        return success({ transactionToken: token, expiresIn: 60 })
      }
      const match = path.match(/^\/api\/funding\/cash-out\/([0-9a-f-]+)(\/confirm)?$/)
      if (match) {
        const order = orders.get(match[1])
        if (!order) return failure(404, 'CASHOUT_NOT_FOUND')
        if (order.userId !== user.id) return failure(403, 'FORBIDDEN')
        if (req.method === 'GET' && !match[2]) return success(order)
        assert.equal(req.method, 'POST'); assert.ok(match[2]); assert.deepEqual(body, {})
        const token = req.headers['x-transaction-token']; assert.equal(tokens.get(token), order.id); tokens.delete(token)
        confirms.set(order.id, (confirms.get(order.id) || 0) + 1)
        if (mode === 'UNKNOWN') { order.status = 'PAYOUT_PENDING'; return failure(503, 'CASHOUT_PAYOUT_PENDING') }
        if (mode === 'FAILED') { order.status = 'FAILED'; order.failureReason = 'BANK_DECLINED'; return failure(409, 'CASHOUT_FAILED') }
        order.status = 'SUCCEEDED'; balance = (BigInt(balance) - BigInt(order.amount)).toString(); return success(order)
      }
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
  browser = await openBrowser(runtime, 'cashout', origin)
  const enterPin = async () => { await browser.click('Xác nhận bằng PIN'); await until(() => browser.has('[role="dialog"]'), 'PIN modal'); for (let digit = 0; digit < 6; digit++) await browser.click('1') }
  const begin = async () => { await browser.go('/app/withdraw'); await until(() => browser.has('#cashout-amount'), 'cashout form'); await browser.fill('#cashout-destination', 'SYNTHETIC-DESTINATION'); await browser.click('Tạo lệnh rút mô phỏng', 2); await until(() => browser.text('Xác nhận bằng PIN'), 'server created order'); return lastId }
  const first = await begin()
  assert.equal(createKeys.length, 1)
  assert.equal(await browser.text('Rút tiền mô phỏng thành công'), false)
  assert.equal(await browser.evaluate('new URLSearchParams(location.search).get("cashOutId")'), first)
  await browser.screenshot('cashout-requested')
  checks.push('Cookie refresh, real HTTP create with string money and one idempotency key for double click, REQUESTED is not success; recovery UUID in URL')
  await enterPin()
  await until(() => browser.text('Rút tiền mô phỏng thành công'), 'server SUCCEEDED')
  await until(() => browser.text('400.000 ₫'), 'server wallet balance')
  assert.equal(confirms.get(first), 1)
  await browser.screenshot('cashout-success')
  checks.push('PIN bound to order/amount, one confirm with token header, receipt and wallet from server')
  mode = 'UNKNOWN'; unknownCreate = true
  await browser.go('/app/withdraw'); await until(() => browser.has('#cashout-amount'), 'new form')
  await browser.click('Tạo lệnh rút mô phỏng')
  await until(() => browser.text('Thử lại cùng yêu cầu'), 'unknown create outcome')
  await browser.click('Thử lại cùng yêu cầu')
  await until(() => browser.text('Xác nhận bằng PIN'), 'same key replay')
  const second = lastId
  assert.equal(createKeys[1], createKeys[2]); assert.equal(orders.size, 2)
  await enterPin()
  await until(() => browser.text('Ngân hàng đang đối soát, chưa rõ kết quả'), 'payout unknown')
  assert.equal(await browser.text('In biên lai mô phỏng'), false)
  assert.equal(await browser.text('Xác nhận bằng PIN'), false)
  await browser.screenshot('cashout-pending')
  await browser.go('/app/withdraw?cashOutId=' + second)
  await until(() => browser.text('Ngân hàng đang đối soát, chưa rõ kết quả'), 'reload status')
  assert.equal(confirms.get(second), 1)
  orders.get(second).status = 'SUCCEEDED'; balance = '300000'
  await browser.click('Kiểm tra lại trạng thái')
  await until(() => browser.text('Rút tiền mô phỏng thành công'), 'reconciled status')
  assert.equal(confirms.get(second), 1)
  checks.push('Unknown create retries same key; payout UNKNOWN stays pending across reload; GET reconciliation to SUCCEEDED never replays confirm')
  mode = 'FAILED'
  const third = await begin(); await enterPin()
  await until(() => browser.text('Lệnh rút không thành công'), 'server FAILED')
  assert.equal(balance, '300000'); assert.equal(confirms.get(third), 1)
  assert.equal(await browser.text('In biên lai mô phỏng'), false)
  await browser.screenshot('cashout-failed')
  checks.push('Deterministic FAILED safe reason, no success receipt or frontend refund arithmetic')
  user = { ...user, id: '10000000-0000-4000-8000-000000000002' }
  await browser.go('/app/withdraw?cashOutId=' + second)
  await until(() => browser.text('Bạn không có quyền'), 'foreign order 403')
  assert.equal(await browser.text('Rút tiền mô phỏng thành công'), false)
  checks.push('Account change and forbidden recovery never expose another account receipt')
  await browser.cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await browser.go('/app/withdraw'); await until(() => browser.has('#cashout-amount'), 'mobile form')
  await browser.screenshot('cashout-mobile')
  assert.equal(await browser.evaluate('document.documentElement.scrollWidth > window.innerWidth'), false)
  assert.equal(await browser.evaluate('JSON.stringify({...localStorage,...sessionStorage}).includes("synthetic-once")'), false)
  checks.push('Mobile 390px without horizontal overflow; no transaction token in browser storage')
  for (const name of ['cashout-requested', 'cashout-success', 'cashout-pending', 'cashout-failed', 'cashout-mobile']) copyFileSync(resolve(runtime, name + '.png'), resolve(artifacts, name + '.png'))
  assert.equal(fixtureErrors.length, 0, fixtureErrors.join('\n')); assert.deepEqual(browser.errors, [])
  writeFileSync(resolve(artifacts, 'result.json'), JSON.stringify({ status: 'MOCK_HTTP_BROWSER_PASS', testedAt: new Date().toISOString(), checks, requests, liveGatewayCashOut: 'BLOCKED_WHITELIST', liveLedger: 'NOT_RUN' }, null, 2))
  console.log('PASS: Phase 4 cashout production browser, 6 HTTP-fixture groups; live Gateway/ledger NOT_RUN')
} catch (error) {
  writeFileSync(resolve(artifacts, 'result.json'), JSON.stringify({ status: 'FAIL', checks, error: error.message, fixtureErrors }, null, 2)); throw error
} finally { await browser?.close(); server.closeAllConnections(); await new Promise(done => server.close(done)) }
