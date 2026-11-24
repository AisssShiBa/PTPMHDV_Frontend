// Production frontend -> real local Gateway/User/Auth/MinIO. Additive synthetic
// accounts and simulated balances on an isolated acceptance stack only.
import assert from 'node:assert/strict'
import { createServer, request as proxyRequest } from 'node:http'
import { connect } from 'node:net'
import { createHmac, randomUUID } from 'node:crypto'
import { deflateSync } from 'node:zlib'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname, extname, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parseEnv } from 'node:util'
import { setTimeout as delay } from 'node:timers/promises'
import { openBrowser, until } from './browser-support.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const dist = resolve(root, 'dist')
const artifacts = resolve(root, process.env.BROWSER_EVIDENCE_DIR || 'node_modules/.tmp/phase3-live')
const scope = process.env.LIVE_PHASE3_SCOPE || 'all'
mkdirSync(artifacts, { recursive: true })
writeFileSync(resolve(artifacts, 'result.json'), JSON.stringify({ result: 'RUNNING', mode: 'live-isolated', startedAt: new Date().toISOString() }, null, 2))
function validateTarget() {
  try {
    assert.ok(['all', 'admin-topup', 'utilities', 'cashout', 'reconciliation'].includes(scope), 'Unsupported LIVE_PHASE3_SCOPE')
    // Localhost alone does not identify a test database: require the acceptance manifest.
    assert.ok(process.env.LIVE_ACCEPTANCE_RUN_FILE, 'Set LIVE_ACCEPTANCE_RUN_FILE to the isolated acceptance run.json')
    const run = JSON.parse(readFileSync(resolve(process.env.LIVE_ACCEPTANCE_RUN_FILE), 'utf8'))
    assert.match(run.project ?? '', /^finvault-acceptance-[0-9a-f]{12}$/)
    assert.equal(dirname(resolve(process.env.LIVE_ACCEPTANCE_RUN_FILE)), resolve(root, '../Backend/.cache/acceptance-week2', run.project))
    const gateway = new URL(process.env.LIVE_API_ORIGIN || run.gateway)
    assert.equal(gateway.origin, new URL(run.gateway).origin, 'LIVE_API_ORIGIN must match the acceptance manifest')
    assert.ok(['127.0.0.1', 'localhost'].includes(gateway.hostname), 'Only a local acceptance backend is allowed')
    assert.equal(gateway.protocol, 'http:')
    assert.ok(existsSync(resolve(dist, 'index.html')), 'Build the frontend first')
    return { run, gateway }
  } catch (error) {
    writeFileSync(resolve(artifacts, 'result.json'), JSON.stringify({ result: 'BLOCKED_SETUP', mode: 'live-isolated', error: error.message, testedAt: new Date().toISOString() }, null, 2))
    throw error
  }
}
const { run, gateway } = validateTarget()
const evidence = []
async function call(path, { method = 'GET', token, body, headers = {}, expected = 200, expectedCode } = {}) {
  const response = await fetch(new URL(path, gateway), { method, headers: {
    ...headers, ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(body ? { 'Content-Type': 'application/json' } : {})
  }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(15000) })
  const json = await response.json()
  evidence.push({ method, path: path.split('?')[0], status: response.status, code: json.error?.code })
  if (expectedCode) assert.equal(json.error?.code, expectedCode)
  if (Array.isArray(expected)) assert.ok(expected.includes(response.status), 'Unexpected concurrent decision status')
  else if (expected !== null) assert.equal(response.status, expected, `${method} ${path.split('?')[0]}: ${json.error?.code || 'unexpected status'}`)
  return json.data
}
async function account() {
  const username = 'fe3_' + randomUUID().replaceAll('-', '')
  const password = 'Synthetic-' + randomUUID()
  const email = username + '@example.test'
  const created = await call('/api/auth/signup', { method: 'POST', expected: 201,
    body: { username, password, email, firstName: 'Synthetic', lastName: 'PhaseThree' } })
  const login = await call('/api/auth/signin', { method: 'POST', body: { username, password } })
  // Signup provisions the User profile and Wallet through asynchronous events.
  for (const path of ['/api/users/me', '/api/wallets/' + created.userId + '/balance']) {
    await until(async () => {
      const response = await fetch(new URL(path, gateway), {
        headers: { Authorization: 'Bearer ' + login.accessToken },
        signal: AbortSignal.timeout(5000),
      })
      evidence.push({ method: 'GET', path, status: response.status })
      if (response.status === 404) return false
      assert.equal(response.status, 200, 'Provisioning readiness: unexpected status')
      return true
    }, 'signup profile/wallet provisioning', 25000)
  }
  return { id: created.userId, username, password, email, token: login.accessToken }
}

// Generate a valid plain 16x16 PNG; no image dependencies or sensitive fixtures.
function crc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
  }
  return (crc ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const tag = Buffer.from(type)
  const length = Buffer.alloc(4); length.writeUInt32BE(data.length)
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([tag, data])))
  return Buffer.concat([length, tag, data, crc])
}
const header = Buffer.alloc(13)
header.writeUInt32BE(16, 0); header.writeUInt32BE(16, 4); header[8] = 8; header[9] = 2
const pixels = Buffer.concat(Array.from({ length: 16 }, () => Buffer.concat([Buffer.from([0]), Buffer.alloc(48, 180)])))
const imagePath = resolve(artifacts, 'synthetic-document.png')
writeFileSync(imagePath, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(pixels)), chunk('IEND', Buffer.alloc(0))]))

const server = createServer((req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname
  if (path.startsWith('/api/') || path.startsWith('/socket.io')) {
    const upstream = proxyRequest(new URL(req.url, gateway), { method: req.method, headers: { ...req.headers, host: gateway.host } }, (response) => {
      res.writeHead(response.statusCode, response.headers)
      response.pipe(res)
    })
    upstream.on('error', () => { res.writeHead(502); res.end() })
    req.pipe(upstream)
    return
  }
  const candidate = resolve(dist, '.' + decodeURIComponent(path))
  if (!candidate.startsWith(dist + sep) && candidate !== dist) { res.writeHead(403); res.end(); return }
  const file = extname(path) && existsSync(candidate) ? candidate : resolve(dist, 'index.html')
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2' }
  res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream' })
  res.end(readFileSync(file))
})

const upgradedSockets = new Set()
server.on('upgrade', (request, socket, head) => {
  if (!new URL(request.url, 'http://localhost').pathname.startsWith('/socket.io')) { socket.destroy(); return }
  const upstream = connect({ host: gateway.hostname, port: Number(gateway.port || '80') })
  upgradedSockets.add(socket); upgradedSockets.add(upstream)
  socket.on('error', () => upstream.destroy())
  upstream.on('error', () => socket.destroy())
  socket.on('close', () => { upgradedSockets.delete(socket); upstream.destroy() })
  upstream.on('close', () => { upgradedSockets.delete(upstream); socket.destroy() })
  upstream.once('connect', () => {
    const headers = Object.entries({ ...request.headers, host: gateway.host }).map(([name, value]) => `${name}: ${value}`).join('\r\n')
    upstream.write(`${request.method} ${request.url} HTTP/${request.httpVersion}\r\n${headers}\r\n\r\n`)
    if (head.length) upstream.write(head)
    socket.pipe(upstream); upstream.pipe(socket)
  })
})

// Reuse the protected acceptance runtime; SQL is restricted to this run's Compose project.
const backend = resolve(root, '../Backend')
const directory = dirname(resolve(process.env.LIVE_ACCEPTANCE_RUN_FILE))
async function prepareRuntime() {
  try {
    const config = parseEnv(readFileSync(resolve(directory, '.env'), 'utf8'))
    assert.ok(['utilities', 'cashout', 'reconciliation'].includes(scope) ? ['', 'SYNTH_TMN_CODE'].includes(config.VNP_TMN_CODE ?? '') : config.VNP_TMN_CODE === 'SYNTH_TMN_CODE', 'Use synthetic acceptance VNPAY configuration (SYNTH_TMN_CODE); never use the team terminal')
    const rt = await import(pathToFileURL(resolve(backend, 'tests/acceptance/week2/runtime.mjs')))
    const env = { ...process.env, ...config }
    for (const key of ['INTERNAL_KEY_FILE', 'ACCESS_TOKEN_SECRET_FILE', 'DATABASE_URL', 'COMPOSE_FILE']) delete env[key]
    const ctx = { project: run.project, directory, config, env, base: gateway.origin, requests: [], composeArgs: [
      'compose', '--project-directory', backend, '--env-file', resolve(directory, '.env'), '-p', run.project,
      '-f', resolve(backend, 'docker-compose.yml'), '-f', resolve(directory, 'compose.json')
    ] }
    if (['all', 'cashout'].includes(scope)) {
      const override = JSON.parse(readFileSync(resolve(directory, 'compose.json'), 'utf8'))
      assert.equal(override.services['payment-service']?.environment?.MOCK_PAYOUT_ENABLED, 'true', 'Enable the payout stand-in only in the isolated Compose override')
      assert.equal(override.services['payment-service']?.environment?.NODE_ENV, 'test')
    }
    return { rt, ctx }
  } catch (error) {
    writeFileSync(resolve(artifacts, 'result.json'), JSON.stringify({ result: 'BLOCKED_SETUP', mode: 'live-isolated', error: error.message, testedAt: new Date().toISOString() }, null, 2))
    throw error
  }
}
const { rt, ctx } = await prepareRuntime()
let browser
let demoRecorder
let lastConfirm
let overrideToken = null
const interceptionErrors = []
const socketNotifications = []
const pin = '741852'
const wallet = async user => {
  const data = await call('/api/wallets/me', { token: user.token })
  assert.equal(typeof data.balance, 'string')
  assert.match(data.balance, /^\d+(?:\.0{1,2})?$/, 'VND balance must be an exact integer string')
  return { ...data, balance: BigInt(data.balance.split('.')[0]).toString() }
}
async function login(user) {
  await browser.go('/sign-in')
  await until(() => browser.has('#username'), 'signin form')
  await browser.fill('#username', user.username)
  await browser.fill('#password', user.password)
  await browser.evaluate('document.querySelector("form").requestSubmit()')
  await until(() => browser.evaluate('location.pathname !== "/sign-in"'), 'real login')
}
async function logout() {
  if (await browser.has('button[aria-label="Tài khoản"]')) {
    await browser.evaluate(`document.querySelector('button[aria-label="Tài khoản"]').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, button: 0, pointerType: 'mouse', isPrimary: true }))`)
    await until(() => browser.has('[role="menuitem"]'), 'account menu')
    await browser.evaluate(`[...document.querySelectorAll('[role="menuitem"]')].find(item => item.textContent.trim() === 'Đăng xuất').click()`)
  } else {
    await browser.evaluate(`[...document.querySelectorAll('button')].find(button => button.textContent.trim() === 'Đăng xuất Quản trị').click()`)
  }
  await until(() => browser.has('#username'), 'logout returns to signin')
  await browser.go('/app/transfer')
  await until(() => browser.evaluate('location.pathname === "/sign-in"'), 'logged out session cannot reopen protected page')
}
async function reachPin(recipient, amount) {
  await browser.go('/app/transfer')
  await until(() => browser.has('#recipient'), 'transfer form with refreshed session')
  await browser.fill('#recipient', recipient.email)
  await browser.click('Kiểm tra')
  await until(() => browser.text('Nguyễn V. B.'), 'resolved recipient')
  await browser.fill('input[aria-label="Số tiền chuyển (VND)"]', amount)
  await browser.click('Tiếp tục kiểm tra')
  await until(() => browser.text('Xác nhận báo giá chuyển tiền'), 'live quote')
  await browser.click('Xác nhận chuyển tiền', 2)
  await until(() => browser.has('[role="dialog"]'), 'server checkout opens PIN')
}
async function enterPin(value) {
  for (const digit of value) await browser.evaluate(`[...document.querySelectorAll('[role="dialog"] button')].find(button => button.textContent.trim() === ${JSON.stringify(digit)}).click()`)
}
async function adminTopups(admin, recipient) {
  const before = await wallet(recipient)
  const create = async () => {
    const result = await call('/api/payments/topups', { method: 'POST', token: recipient.token, body: { amount: '10000' }, headers: { 'Idempotency-Key': randomUUID() }, expected: 201 })
    return call('/api/payments/topups/' + result.topupId, { token: recipient.token })
  }
  const approved = await create()
  const rejected = await create()
  await login(admin)
  await browser.go('/admin/topups')
  const details = async item => {
    await until(() => browser.text(item.code), 'topup row from real API')
    await browser.evaluate(`[...document.querySelectorAll('tbody tr')].find(row => row.textContent.includes(${JSON.stringify(item.code)})).querySelector('button').click()`)
    await until(() => browser.has('[role="dialog"]'), 'topup details')
  }
  await details(approved)
  await browser.click('Duyệt lệnh', 2)
  await until(() => browser.evaluate(`!document.querySelector('[role="dialog"]')`), 'manual approval completes', 25000)
  assert.equal(browser.network.filter(item => item.method === 'POST' && item.path === '/api/payments/admin/topups/' + approved.id + '/approve').length, 1)
  assert.equal((await wallet(recipient)).balance, (BigInt(before.balance) + 10000n).toString())
  await details(rejected)
  await browser.click('Từ chối')
  await until(() => browser.has('#topup-reject-reason'), 'reject reason form')
  await browser.click('Xác nhận từ chối')
  await until(() => browser.text('Vui lòng nhập lý do từ chối'), 'reject local validation')
  await browser.fill('#topup-reject-reason', 'Synthetic manual rejection')
  await browser.click('Xác nhận từ chối', 2)
  await until(() => browser.evaluate(`!document.querySelector('[role="dialog"]')`), 'manual rejection completes')
  assert.equal((await call('/api/payments/topups/' + rejected.id, { token: recipient.token })).status, 'REJECTED')
  assert.equal((await wallet(recipient)).balance, (BigInt(before.balance) + 10000n).toString())
  const ipn = async item => {
    const params = { vnp_Amount: '1000000', vnp_ResponseCode: '00', vnp_TmnCode: ctx.config.VNP_TMN_CODE, vnp_TransactionNo: 'synthetic-' + randomUUID(), vnp_TransactionStatus: '00', vnp_TxnRef: item.code }
    const canonical = Object.keys(params).sort().map(key => key + '=' + encodeURIComponent(params[key]).replace(/%20/g, '+')).join('&')
    const secret = readFileSync(resolve(directory, 'secrets/vnp_hash_secret.txt'), 'utf8').trim()
    const query = new URLSearchParams({ ...params, vnp_SecureHash: createHmac('sha512', secret).update(canonical).digest('hex') })
    const response = await fetch(new URL('/api/funding/vnpay/ipn?' + query, gateway), { signal: AbortSignal.timeout(15000) })
    assert.equal(response.status, 200)
    const result = await response.json()
    evidence.push({ method: 'GET', path: '/api/funding/vnpay/ipn', status: response.status, resultCode: result.RspCode })
    return result
  }
  assert.equal((await ipn(approved)).RspCode, '02')
  assert.equal((await ipn(rejected)).RspCode, '02')
  await call('/api/payments/admin/topups/' + approved.id + '/approve', { method: 'POST', token: admin.token })
  assert.equal((await wallet(recipient)).balance, (BigInt(before.balance) + 10000n).toString())
  const raced = await create()
  await Promise.all([
    call('/api/payments/admin/topups/' + raced.id + '/approve', { method: 'POST', token: admin.token, expected: [200, 409] }), ipn(raced)
  ])
  await until(async () => (await call('/api/payments/topups/' + raced.id, { token: recipient.token })).status === 'APPROVED', 'manual approval/IPN race resolves')
  assert.equal((await wallet(recipient)).balance, (BigInt(before.balance) + 20000n).toString())
  for (const item of [approved, raced]) {
    assert.match(item.code, /^[A-Z0-9]+$/)
    assert.equal(rt.sql(ctx, 'wallet_service', `SELECT count(DISTINCT "transactionId") FROM "LedgerEntry" WHERE "referenceId"='${item.code}'`), '1')
    assert.ok(Number(rt.sql(ctx, 'payment_service', `SELECT count(*) FROM "TopupAuditLog" WHERE "topupRequestId"='${item.id}'`)) >= 1)
  }
  await browser.screenshot('live-admin-manual-topups')
  checks.push('N17 manual Topup live: UI approve/reject with validation/double-click; real Wallet balances and ledger; late synthetic IPN/replay/concurrent IPN credit once; durable Payment audit. No real VNPAY sandbox transaction')
}
const utilitySql = statement => rt.docker(ctx, 'exec', '-T', 'postgres', 'psql', '-U', 'postgres', '-d', 'utilities_service', '-At', '-v', 'ON_ERROR_STOP=1', '-c', statement)
async function utilitiesFlows(admin, user) {
  if (scope === 'all') await logout()
  await call('/api/auth/pin/setup', { method: 'POST', token: user.token, body: { pin, confirmPin: pin }, expected: 201 })
  await call('/api/wallets/' + user.id + '/credit', { method: 'POST', token: admin.token, body: { amount: '100000', referenceId: randomUUID(), transferType: 'TOPUP' } })
  await login(user)
  const before = await wallet(user)
  const placeOrder = async phone => {
    await browser.go('/app/utilities')
    await until(() => browser.has('#utilityPhone'), 'phone topup form')
    await browser.fill('#utilityPhone', phone)
    await browser.evaluate(`[...document.querySelectorAll('button')].find(button => button.textContent.trim().startsWith('10.000')).click()`)
    await browser.evaluate(`(()=>{const button=[...document.querySelectorAll('button')].find(button=>button.textContent.trim().startsWith('Thanh toán ngay')); button.click(); button.click()})()`)
    await until(() => browser.has('[role="dialog"] input[aria-label="Chữ số PIN 1"]'), 'utility server order opens PIN')
    await enterPin(pin)
    const id = utilitySql(`SELECT id FROM utility_orders WHERE user_id='${user.id}' ORDER BY created_at DESC LIMIT 1`)
    assert.match(id, /^[0-9a-f-]{36}$/i)
    return id
  }
  const observeNotification = async (id, eventType, measureLatency = true) => {
    await until(() => utilitySql(`SELECT count(*) FROM utility_outbox WHERE order_id='${id}' AND event_type='${eventType}' AND published_at IS NOT NULL`) === '1', 'outbox confirmed publish', 30000)
    const outbox = JSON.parse(utilitySql(`SELECT json_build_object('id',id,'createdAt',created_at) FROM utility_outbox WHERE order_id='${id}' AND event_type='${eventType}'`))
    assert.match(outbox.id, /^[0-9a-f-]{36}$/i)
    await until(() => rt.sql(ctx, 'notification_service', `SELECT count(*) FROM "Notification" WHERE "eventId"='${outbox.id}' AND "userId"='${user.id}'`) === '1', 'real Notification inbox persistence', 30000)
    await until(() => socketNotifications.some(item => item.eventId === outbox.id), 'notification reaches owner WebSocket', 15000)
    if (measureLatency) {
      const at = rt.sql(ctx, 'notification_service', `SELECT "createdAt" FROM "Notification" WHERE "eventId"='${outbox.id}' AND "userId"='${user.id}'`)
      const persistedMs = Date.parse(at + 'Z') - Date.parse(outbox.createdAt + 'Z')
      const socketMs = socketNotifications.find(item => item.eventId === outbox.id).at - Date.parse(outbox.createdAt + 'Z')
      const latencyMs = Math.max(persistedMs, socketMs)
      assert.ok(Number.isFinite(latencyMs) && latencyMs >= 0 && latencyMs <= 3000, 'Utility notification latency must be <= 3 seconds')
      evidence.push({ eventType, latencyMs, transport: 'database-and-owner-websocket' })
    }
    return outbox.id
  }
  const succeeded = await placeOrder('0912345600')
  await until(() => browser.text('Giao dịch thành công'), 'T1 success UI', 30000)
  assert.equal((await call('/api/utilities/orders/' + succeeded, { token: user.token })).status, 'SUCCESS')
  assert.equal((await wallet(user)).balance, (BigInt(before.balance) - 10000n).toString())
  await observeNotification(succeeded, 'utility.order_succeeded')
  const refunded = await placeOrder('0912345611')
  await until(() => browser.text('Đã hoàn tiền'), 'T2 refund UI', 45000)
  assert.equal((await call('/api/utilities/orders/' + refunded, { token: user.token })).status, 'REFUNDED')
  assert.equal((await wallet(user)).balance, (BigInt(before.balance) - 10000n).toString())
  await observeNotification(refunded, 'utility.order_refunded')
  checks.push('T1/T2 UI + live money: provider 00 SUCCESS costs 10000 once; provider 11 REFUNDED restores full charge; durable utility events reach Notification <=3 seconds')
  const pending = await placeOrder('0912345622')
  await until(async () => (await call('/api/utilities/orders/' + pending, { token: user.token })).status === 'PROVIDER_PENDING', 'provider timeout pending')
  await rt.command(ctx, 'utility-a7-stop-broker', 'docker', [...ctx.composeArgs, 'stop', 'rabbitmq'])
  try {
    // Trigger the real recovery code without waiting for the cron stale window.
    rt.docker(ctx, 'exec', '-T', 'utilities-service', 'node', '--import', 'tsx', '-e', `const {createDefaultAppOptions}=require('./src/app');const {runRecoveryOnce}=require('./src/services/recoveryService');const {prisma}=require('./src/config/prisma');runRecoveryOnce(createDefaultAppOptions(),new Date(Date.now()+120000),0).finally(()=>prisma.$disconnect())`)
    await until(() => utilitySql(`SELECT status FROM utility_orders WHERE id='${pending}'`) === 'SUCCESS', 'real provider recovery succeeds while broker unavailable')
    assert.equal(utilitySql(`SELECT count(*) FROM utility_outbox WHERE order_id='${pending}' AND published_at IS NULL`), '1')
  } finally {
    console.log('A7: restoring the isolated RabbitMQ broker.')
    await rt.command(ctx, 'utility-a7-start-broker', 'docker', [...ctx.composeArgs, 'up', '-d', '--no-deps', '--wait', 'rabbitmq'])
  }
  const eventId = await observeNotification(pending, 'utility.order_succeeded', false)
  // Simulate a lost publish acknowledgement using the genuine persisted event.
  utilitySql(`UPDATE utility_outbox SET published_at=NULL,locked_until=NULL,lock_token=NULL WHERE id='${eventId}'`)
  await observeNotification(pending, 'utility.order_succeeded', false)
  assert.equal(rt.sql(ctx, 'notification_service', `SELECT count(*) FROM "Notification" WHERE "eventId"='${eventId}'`), '1')
  assert.equal(socketNotifications.filter(item => item.eventId === eventId).length, 1, 'Duplicate event does not emit another owner notification')
  assert.equal((await wallet(user)).balance, (BigInt(before.balance) - 20000n).toString())
  await browser.screenshot('live-utilities-outbox-recovery')
  checks.push('A7 Utilities live: stop RabbitMQ, real provider recovery commits state+outbox; restore broker; republish the same genuine eventId; Notification inbox retains one row')
}
async function cashoutFlows(admin, user) {
  if (scope === 'all') {
    console.log('Cashout: respecting the Gateway rate-limit window after the preceding full-system scenarios.')
    await delay(31000)
    console.log('Cashout: rate-limit window wait in progress.')
    await delay(31000)
  }
  if (scope !== 'all') {
    await call('/api/auth/pin/setup', { method: 'POST', token: user.token, body: { pin, confirmPin: pin }, expected: 201 })
    await login(user)
  }
  const override = JSON.parse(readFileSync(resolve(directory, 'compose.json'), 'utf8'))
  assert.equal(override.services['payment-service']?.environment?.MOCK_PAYOUT_ENABLED, 'true', 'Explicit isolated mock payout provider required')
  assert.equal(override.services['payment-service']?.environment?.NODE_ENV, 'test')
  await call('/api/wallets/' + user.id + '/credit', { method: 'POST', token: admin.token, body: { amount: '200000', referenceId: randomUUID(), transferType: 'TOPUP' } })
  const cases = [
    ['10000', 'SUCCEEDED', 'Rút tiền mô phỏng thành công'],
    ['10111', 'FAILED', 'Lệnh rút không thành công'],
    ['10222', 'PAYOUT_PENDING', 'Ngân hàng đang đối soát, chưa rõ kết quả']
  ]
  for (const [amount, status, label] of cases) {
    const before = await wallet(user)
    await browser.go('/app/withdraw')
    await until(() => browser.has('#cashout-amount'), 'cashout form')
    await browser.fill('#cashout-amount', amount)
    const createsBefore = browser.network.filter(item => item.method === 'POST' && item.path === '/api/funding/cash-out').length
    await browser.click('Tạo lệnh rút mô phỏng', 2)
    await until(() => browser.text('Xác nhận bằng PIN'), 'cashout review before PIN')
    await browser.click('Xác nhận bằng PIN')
    await until(() => browser.has('[role="dialog"] input[aria-label="Chữ số PIN 1"]'), 'cashout PIN bound to server order')
    await enterPin(pin)
    await until(() => browser.text(label), 'cashout UI ' + status, 30000)
    assert.equal(browser.network.filter(item => item.method === 'POST' && item.path === '/api/funding/cash-out').length, createsBefore + 1)
    const id = rt.sql(ctx, 'payment_service', `SELECT id FROM "CashOut" WHERE "userId"='${user.id}' ORDER BY "createdAt" DESC LIMIT 1`)
    assert.match(id, /^[0-9a-f-]{36}$/i)
    assert.equal((await call('/api/funding/cash-out/' + id, { token: user.token })).status, status)
    const after = await wallet(user)
    assert.equal(after.balance, (BigInt(before.balance) - (status === 'SUCCEEDED' ? BigInt(amount) : 0n)).toString())
    const holdBefore = BigInt(before.heldBalance.split('.')[0])
    assert.equal(BigInt(after.heldBalance.split('.')[0]), holdBefore + (status === 'PAYOUT_PENDING' ? BigInt(amount) : 0n))
    const reference = 'cashout_' + id
    const ledgerRows = rt.sql(ctx, 'wallet_service', `SELECT count(*) FROM "LedgerEntry" WHERE "referenceId"='${reference}'`)
    assert.equal(ledgerRows, status === 'SUCCEEDED' ? '2' : '0')
    if (status === 'PAYOUT_PENDING') {
      const confirms = browser.network.filter(item => item.method === 'POST' && item.path.endsWith('/confirm')).length
      const reads = browser.network.filter(item => item.method === 'GET' && item.path === '/api/funding/cash-out/' + id).length
      await browser.click('Kiểm tra lại trạng thái')
      await until(() => browser.network.filter(item => item.method === 'GET' && item.path === '/api/funding/cash-out/' + id).length > reads, 'pending cashout read-only recovery')
      assert.equal(browser.network.filter(item => item.method === 'POST' && item.path.endsWith('/confirm')).length, confirms)
    }
    await browser.screenshot('live-cashout-' + status.toLowerCase())
    checks.push('Cashout UI ' + status + ': one create on double click; real PIN; exact Wallet balance/held/ledger; provider is test-only simulation')
  }
}
const checks = []
async function reconciliationFlow(admin, sender, recipient) {
  const initial = await call('/api/admin/reconciliation/run?mode=quick', { method: 'POST', token: admin.token })
  assert.equal(initial.isBalanced, true, 'RC1 clean baseline')
  const pending = await call('/api/payments/checkout', { method: 'POST', token: sender.token,
    headers: { 'Idempotency-Key': randomUUID() }, body: { type: 'WALLET_TRANSFER', destinationUserId: recipient.id, amount: '50000' }, expected: 201 })
  const snapshot = () => JSON.parse(rt.sql(ctx, 'wallet_service', `SELECT json_build_object('id',id,'balance',balance::text,'held',"heldBalance"::text,'ledger',(SELECT md5(COALESCE(string_agg(row_to_json(e)::text,'' ORDER BY e.id),'')) FROM "LedgerEntry" e WHERE e."walletId"=w.id)) FROM "Wallet" w WHERE "userId"='${sender.id}' AND "ownerType"='USER'`))
  const before = snapshot()
  assert.equal(BigInt(before.held.split('.')[0]), 50000n)
  rt.sql(ctx, 'wallet_service', `UPDATE "Wallet" SET balance=balance+5000 WHERE id=${before.id}`)
  let repaired = false
  try {
    if (scope === 'all') await logout()
    await login(admin)
    await browser.go('/admin/reconciliation')
    await until(() => browser.text('Chạy đối soát đầy đủ'), 'real reconciliation UI')
    await browser.click('Chạy đối soát đầy đủ')
    await until(() => browser.has('button') && browser.text('Điều chỉnh'), 'A8 drift row')
    const reports = await call('/api/admin/reconciliation/reports?page=1&limit=10', { token: admin.token })
    const detail = await call('/api/admin/reconciliation/reports/' + reports.items[0].id, { token: admin.token })
    const anomaly = detail.anomalies.find(item => item.walletId === before.id && item.type.startsWith('BALANCE_DRIFT'))
    assert.ok(anomaly, 'A8 reports the deliberately drifted wallet')
    await browser.click('Điều chỉnh')
    await until(() => browser.text('Khôi phục số dư theo sổ cái'), 'cache repair dialog, not ledger reversal')
    await browser.evaluate('document.querySelector("input[value=DEBIT]").click()')
    await browser.fill('#adjust-amount', '5000')
    await browser.evaluate(`(() => { const e=document.querySelector('#adjust-reason'); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(e,'Khôi phục cache theo sổ cái - A8'); e.dispatchEvent(new Event('input',{bubbles:true})); })()`)
    const posted = browser.network.filter(row => row.method === 'POST' && row.path.endsWith('/adjust')).length
    await browser.click('Xác nhận khôi phục số dư', 2)
    await until(() => browser.text('Đã khôi phục số dư theo sổ cái'), 'Admin repair success')
    assert.equal(browser.network.filter(row => row.method === 'POST' && row.path.endsWith('/adjust')).length - posted, 1)
    assert.deepEqual(snapshot(), before, 'Cache restored; real reservation and immutable ledger unchanged')
    repaired = true
    assert.equal(rt.sql(ctx, 'wallet_service', `SELECT count(*) FROM "AnomalyAdjustment" WHERE "anomalyId"=${BigInt(anomaly.id)}`), '1')
    assert.equal(rt.sql(ctx, 'admin_service', `SELECT count(*) FROM "AdminAuditLog" WHERE action='ADJUST_ANOMALY' AND "targetId"='${BigInt(anomaly.id)}' AND detail::jsonb->>'outcome'='SUCCEEDED'`), '1')
    await call('/api/admin/reconciliation/anomalies/' + anomaly.id + '/adjust', { method: 'POST', token: admin.token,
      body: { direction: 'DEBIT', amount: '5000', reason: 'Khôi phục cache theo sổ cái - A8' }, expected: 409, expectedCode: 'ALREADY_ADJUSTED' })
    assert.deepEqual(snapshot(), before)
    const final = await call('/api/admin/reconciliation/run?mode=quick', { method: 'POST', token: admin.token })
    assert.equal(final.isBalanced, true); assert.equal(final.anomaliesFound, 0)
    await browser.screenshot('a8-repaired-live')
    checks.push('A8/RC1 UI + real Admin/Wallet/PostgreSQL: baseline balanced, deliberate +5000 cache drift detected, double-click repairs once, immutable ledger and 50000 real hold unchanged, audit SUCCEEDED, replay 409, final balanced with zero anomalies. No financial reversal.')
  } finally {
    // Undo only the fixture corruption on failure; never create/delete ledger rows.
    if (!repaired) rt.sql(ctx, 'wallet_service', `UPDATE "Wallet" SET balance=${BigInt(before.balance.split('.')[0])} WHERE id=${before.id}`)
    await call('/api/payments/' + pending.id + '/cancel', { method: 'POST', token: sender.token })
  }
}

try {
  if (scope === 'all') {
    console.log('Full run: waiting 61 seconds for a clean Gateway IP window before setup; limits remain unchanged.')
    await delay(31000)
    console.log('Full run: startup cooldown in progress.')
    await delay(30000)
  }
  const admin = await rt.account(ctx, 'browseradmin', undefined, 'ADMIN')
  const sender = await account()
  const recipient = await account()
  const phone = '+84 ' + String(Math.floor(100000000 + Math.random() * 900000000))
  await call('/api/users/by-auth/' + recipient.id, { method: 'PUT', token: recipient.token, body: { fullName: 'Nguyễn Văn Bình', phone } })
  await call('/api/auth/pin/setup', { method: 'POST', token: sender.token, body: { pin, confirmPin: pin }, expected: 201 })
  await call('/api/wallets/' + sender.id + '/credit', { method: 'POST', token: admin.token, body: { amount: '300000', referenceId: randomUUID(), transferType: 'TOPUP' } })
  await new Promise((done) => server.listen(0, '127.0.0.1', done))
  // Auth's development CORS policy allows localhost ports, not 127.0.0.1 origins.
  const origin = 'http://localhost:' + server.address().port
  browser = await openBrowser(artifacts, 'phase3', origin)
  if (process.env.LIVE_DEMO_RECORD === '1') {
    const { createDemoRecorder } = await import('./demo-recorder.mjs')
    demoRecorder = await createDemoRecorder(browser, artifacts, origin)
  }
  browser.on('Network.webSocketFrameReceived', event => {
    const packet = event.response.payloadData
    if (!packet.startsWith('42')) return
    try {
      const [name, notification] = JSON.parse(packet.slice(2))
      if (name === 'notification:new' && typeof notification?.eventId === 'string') {
        socketNotifications.push({ eventId: notification.eventId, at: Date.now() })
      }
    } catch { /* Ignore unrelated Socket.IO frames; never log tickets or message bodies. */ }
  })
  browser.on('Fetch.requestPaused', async event => {
    try {
      const paymentId = new URL(event.request.url).pathname.split('/').at(-2)
      const original = Object.entries(event.request.headers).find(([name]) => name.toLowerCase() === 'x-transaction-token')?.[1]
      assert.ok(original, 'UI confirm must carry a transaction token')
      lastConfirm = { paymentId, token: original }
      const headers = Object.entries(event.request.headers).map(([name, value]) => ({ name,
        value: name.toLowerCase() === 'x-transaction-token' && overrideToken ? overrideToken : value }))
      overrideToken = null
      await browser.cdp('Fetch.continueRequest', { requestId: event.requestId, headers })
    } catch {
      interceptionErrors.push('Unable to inspect/continue synthetic confirm request')
      await browser.cdp('Fetch.continueRequest', { requestId: event.requestId }).catch(() => {})
    }
  })
  await browser.cdp('Fetch.enable', { patterns: [{ urlPattern: '*/api/payments/*/confirm', requestStage: 'Request' }] })
  if (scope === 'all') {
  await login(sender)

  await browser.go('/app/profile')
  await until(() => browser.has('#kyc-front'), 'real profile')
  await browser.fill('#kyc-number', 'SYNTHETIC1234')
  await browser.upload('#kyc-front', imagePath)
  await browser.click('Gửi xác thực')
  await until(() => browser.text('Vui lòng chọn ảnh giấy tờ.'), 'missing back validation')
  assert.equal(browser.network.filter(item => item.path === '/api/users/kyc/documents').length, 0)
  await browser.upload('#kyc-back', imagePath)
  await browser.click('Gửi xác thực', 2)
  await until(() => browser.text('Đang chờ xét duyệt'), 'real two-face upload', 25000)
  const uploads = browser.network.filter(item => item.method === 'POST' && item.path === '/api/users/kyc/documents')
  assert.equal(uploads.length, 1)
  assert.equal(uploads[0].status, 202)
  await browser.click('Xem giấy tờ đã gửi')
  await until(() => browser.evaluate('(()=>{const image=document.querySelector(\'img[alt="Giấy tờ xác thực đã gửi"]\');return !!image?.complete && image.naturalWidth>0})()'), 'real signed MinIO image')
  await browser.screenshot('live-kyc-two-sided')
  const saved = await call('/api/users/me', { token: sender.token })
  assert.equal(saved.kycStatus, 'PENDING')
  assert.equal(saved.hasKycDocument, true)
  await call('/api/admin/kyc/' + saved.id + '/documents', { token: recipient.token, expected: 403 })
  checks.push('H8: missing back blocked locally; one multipart upload returns 202; profile persisted; signed MinIO image loads; USER denied Admin document API')

  const senderBefore = await wallet(sender)
  const receiverBefore = await wallet(recipient)
  await reachPin(recipient, '60000')
  await enterPin(pin)
  await until(() => browser.text('Chuyển tiền thành công!'), 'real UI P2P receipt', 30000)
  const sent = lastConfirm
  assert.ok(sent?.paymentId)
  assert.equal((await wallet(sender)).balance, (BigInt(senderBefore.balance) - 60000n).toString())
  assert.equal((await wallet(recipient)).balance, (BigInt(receiverBefore.balance) + 60000n).toString())
  assert.equal(browser.network.filter(item => item.method === 'POST' && item.path === '/api/payments/p2p/checkout').length, 1)
  await call('/api/payments/' + sent.paymentId + '/confirm', { method: 'POST', token: sender.token, body: {}, headers: { 'X-Transaction-Token': sent.token }, expected: 409, expectedCode: 'TXN_TOKEN_REUSED' })
  assert.equal((await wallet(sender)).balance, (BigInt(senderBefore.balance) - 60000n).toString())
  await browser.screenshot('live-p2p-receipt')
  checks.push('WB1: login -> full navigation/refresh cookie -> real UI 60000 VND transfer -> receipt; exact sender/recipient balance deltas; double click creates one checkout')
  checks.push('A4 replay API: resend the actual UI-used token to the same payment returns 409 TXN_TOKEN_REUSED; balance unchanged')

  await reachPin(recipient, '1000')
  const pendingId = rt.sql(ctx, 'payment_service', `SELECT id FROM "Payment" WHERE "userId"='${sender.id}' AND status='PENDING' ORDER BY "createdAt" DESC LIMIT 1`)
  assert.match(pendingId, /^[0-9a-f-]{36}$/i)
  const expiring = await call('/api/auth/pin/verify', { method: 'POST', token: sender.token, body: { pin, paymentId: pendingId, amount: '1000' } })
  console.log('A4: waiting for a real transaction token to expire (61 seconds); no server clock or signing-key changes.')
  await delay(31000)
  console.log('A4: expiry wait in progress; isolated stack only.')
  await delay(31000)
  overrideToken = expiring.transactionToken
  const confirmBefore = browser.network.filter(item => item.path === '/api/payments/' + pendingId + '/confirm').length
  await enterPin(pin)
  await until(() => browser.network.some(item => item.path === '/api/payments/' + pendingId + '/confirm' && item.status === 401), 'live expired token rejected')
  await until(() => browser.network.some(item => item.method === 'GET' && item.path === '/api/payments/' + pendingId && item.status === 200), 'UI reconciles payment before allowing fresh PIN')
  assert.equal((await call('/api/payments/' + pendingId, { token: sender.token })).status, 'PENDING')
  assert.equal(browser.network.filter(item => item.path === '/api/payments/' + pendingId + '/confirm').length, confirmBefore + 1)
  assert.equal((await wallet(sender)).balance, (BigInt(senderBefore.balance) - 60000n).toString())
  await until(() => browser.has('input[aria-label="Chữ số PIN 1"]'), 'fresh PIN modal')
  await enterPin(pin)
  await until(() => browser.text('Chuyển tiền thành công!'), 'same payment succeeds with fresh PIN', 30000)
  assert.equal(lastConfirm.paymentId, pendingId)
  assert.equal((await wallet(sender)).balance, (BigInt(senderBefore.balance) - 61000n).toString())
  assert.equal((await wallet(recipient)).balance, (BigInt(receiverBefore.balance) + 61000n).toString())
  checks.push('A4 expired UI + real backend: CDP substitutes a naturally expired token for the same payment; HTTP 401 -> GET PENDING -> fresh PIN -> same payment SUCCESS; no automatic POST replay or extra debit')

  await reachPin(recipient, '1000')
  const pinBefore = browser.network.filter(item => item.path === '/api/auth/pin/verify').length
  for (let attempt = 1; attempt <= 5; attempt++) {
    await enterPin('111111')
    await until(() => browser.network.filter(item => item.path === '/api/auth/pin/verify').length === pinBefore + attempt, 'wrong PIN attempt ' + attempt)
    if (attempt < 5) await until(() => browser.text('Bạn còn ' + (5 - attempt) + ' lần thử.'), 'remaining PIN attempts')
  }
  await until(() => browser.text('Tài khoản tạm khóa giao dịch'), 'real PIN lock on fifth attempt')
  const pinState = await call('/api/auth/pin/status', { token: sender.token })
  assert.equal(pinState.isLocked, true)
  assert.ok(pinState.remainingLockSeconds >= 1700 && pinState.remainingLockSeconds <= 1800)
  const lockedPayment = rt.sql(ctx, 'payment_service', `SELECT id FROM "Payment" WHERE "userId"='${sender.id}' AND status='PENDING' ORDER BY "createdAt" DESC LIMIT 1`)
  await call('/api/auth/pin/verify', { method: 'POST', token: sender.token, body: { pin, paymentId: lockedPayment, amount: '1000' }, expected: 423, expectedCode: 'PIN_LOCKED' })
  await browser.screenshot('live-pin-locked')
  await call('/api/payments/' + lockedPayment + '/cancel', { method: 'POST', token: sender.token, body: {} })
  checks.push('A3: five wrong PINs entered through UI; real Auth locks for 30 minutes; sixth attempt API returns 423 PIN_LOCKED (UI blocks further entry)')
  await logout()
  checks.push('WB1 logout: signout clears refresh session; protected URL after full reload redirects to signin')
  const lookupUser = await account()
  await login(lookupUser)

  await browser.go('/app/transfer')
  await until(() => browser.has('#recipient'), 'current transfer page after full reload')
  const missing = 'Không tìm thấy người nhận phù hợp. Vui lòng kiểm tra lại email hoặc số điện thoại.'
  let uiLookups = 0
  const lookup = async (query, message, expected) => {
    const before = browser.network.filter(item => item.path === '/api/users/lookup').length
    await browser.fill('#recipient', query)
    await browser.click('Kiểm tra')
    await until(() => browser.network.filter(item => item.path === '/api/users/lookup').length === before + 1, 'real lookup response')
    const response = browser.network.filter(item => item.path === '/api/users/lookup').at(-1)
    assert.equal(response.status, expected)
    await until(() => browser.text(message), 'real lookup UI result')
    uiLookups++
    assert.equal(await browser.text(recipient.id), false, 'Recipient UUID is not exposed')
  }
  const lookupsBeforeValidation = browser.network.filter(item => item.path === '/api/users/lookup').length
  await browser.fill('#recipient', 'partial')
  await browser.click('Kiểm tra')
  await until(() => browser.text('Vui lòng nhập email đầy đủ'), 'local query validation')
  assert.equal(browser.network.filter(item => item.path === '/api/users/lookup').length, lookupsBeforeValidation)
  const expectedName = 'Nguyễn V. B.'
  await lookup(recipient.email, expectedName, 200)
  await lookup(phone, expectedName, 200)
  await lookup(lookupUser.email, missing, 404)
  await lookup('missing_' + randomUUID() + '@example.test', missing, 404)
  while (uiLookups < 10) await lookup(recipient.email, expectedName, 200)
  await lookup(recipient.email, 'Bạn đang thao tác quá nhanh.', 429)
  assert.equal(await browser.evaluate('[...document.querySelectorAll("button")].find(b => b.textContent.trim() === "Kiểm tra").disabled'), true)
  await browser.screenshot('live-recipient-rate-limit')
  checks.push('H11 UI + real API: local validation, exact email/phone, masked name/no UUID, self/missing generic 404, first ten requests then 429/cooldown; no checkout or transfer submitted')
  await logout()
  let qrData = null
  const qrRequests = new Set()
  browser.on('Network.responseReceived', event => {
    if (new URL(event.response.url).pathname === '/api/auth/qr-login/init' && event.response.status === 201) qrRequests.add(event.requestId)
  })
  browser.on('Network.loadingFinished', async event => {
    if (!qrRequests.delete(event.requestId)) return
    try {
      const response = await browser.cdp('Network.getResponseBody', { requestId: event.requestId })
      const body = response.base64Encoded ? Buffer.from(response.body, 'base64').toString('utf8') : response.body
      qrData = JSON.parse(body).data
    } catch { interceptionErrors.push('Unable to inspect synthetic QR init response') }
  })
  await browser.go('/qr-login')
  await until(() => qrData && browser.has('svg[aria-label="Mã QR đăng nhập FinVault"]'), 'real QR rendered')
  assert.ok(Date.parse(qrData.expiresAt) - Date.now() > 110000)
  const confirmQr = (await import('../scripts/qr-confirm.mjs')).main
  const previousEnv = Object.fromEntries(['QR_USER', 'QR_PASSWORD', 'API_BASE_URL'].map(key => [key, process.env[key]]))
  try {
    process.env.QR_USER = lookupUser.username
    process.env.QR_PASSWORD = lookupUser.password
    process.env.API_BASE_URL = gateway.origin + '/api'
    await confirmQr([qrData.qrId, qrData.nonce])
  } finally {
    for (const [key, value] of Object.entries(previousEnv)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value
    }
  }
  await until(() => browser.evaluate('location.pathname === "/app"'), 'script approved QR logs Web in', 20000)
  await browser.go('/app/profile')
  await until(() => browser.evaluate('document.querySelector("#profile-email")?.value === ' + JSON.stringify(lookupUser.email)), 'QR refresh cookie restores the correct user')
  checks.push('Q1 approval: real Web QR -> existing qr-confirm.mjs mobile signin/confirm -> polling logs in correct user; full reload restores refresh cookie')
  await logout()
  qrData = null
  await browser.go('/qr-login')
  await until(() => qrData && browser.has('svg[aria-label="Mã QR đăng nhập FinVault"]'), 'second QR session')
  const expiredQrId = qrData.qrId
  console.log('Q1: checking real 120-second QR expiry; progress every 30 seconds.')
  while (Date.now() < Date.parse(qrData.expiresAt) + 1000) {
    await delay(Math.min(30000, Math.max(1, Date.parse(qrData.expiresAt) + 1000 - Date.now())))
    console.log('Q1: expiry observation in progress on isolated stack.')
  }
  await until(() => browser.text('Mã QR đã hết hạn'), 'QR expiry UI')
  assert.equal(await browser.has('svg[aria-label="Mã QR đăng nhập FinVault"]'), false)
  const pollsAfterExpiry = browser.network.filter(item => item.path === '/api/auth/qr-login/' + expiredQrId + '/status').length
  await delay(2500)
  assert.equal(browser.network.filter(item => item.path === '/api/auth/qr-login/' + expiredQrId + '/status').length, pollsAfterExpiry, 'Polling stops after expiry')
  await browser.click('Làm mới mã QR')
  await until(() => qrData?.qrId !== expiredQrId && browser.has('svg[aria-label="Mã QR đăng nhập FinVault"]'), 'explicit QR renewal')
  checks.push('Q1 expiry: natural 120 seconds, SVG removed, polling stopped, explicit refresh creates a different QR session')
  }
  if (['all', 'admin-topup'].includes(scope)) await adminTopups(admin, recipient)
  if (['all', 'utilities'].includes(scope)) await utilitiesFlows(admin, recipient)
  if (['all', 'cashout'].includes(scope)) await cashoutFlows(admin, recipient)
  if (['all', 'reconciliation'].includes(scope)) await reconciliationFlow(admin, sender, recipient)
  assert.deepEqual(interceptionErrors, [])
  assert.equal(await browser.evaluate('localStorage.length + sessionStorage.length'), 0, 'No auth/PIN/transaction secrets persisted in browser storage')
  assert.ok(browser.network.some(item => item.path === '/api/auth/refresh' && item.status === 200), 'Refresh cookie restores session on full navigation')
  assert.deepEqual(browser.errors, [])
  let video
  if (demoRecorder) {
    const recorder = demoRecorder
    demoRecorder = null
    video = await recorder.stop()
  }
  writeFileSync(resolve(artifacts, 'result.json'), JSON.stringify({ result: 'PASS', mode: 'live-isolated', scope, project: run.project, testedAt: new Date().toISOString(), checks, api: evidence, browserNetwork: browser.network, video }, null, 2))
  console.log('PASS scope=' + scope + '; checks=' + checks.length)
  if (scope === 'all') console.log('PASS: Phase 3 frontend against real local backend. H8 two-face upload/private image/403; H11 current lookup UI; WB1 real P2P/login/refresh/logout; A3 lock; A4 natural expiry via UI and replay via API; Q1 script/expiry; N17 manual topup; T1/T2/A7 DB+owner socket; C1/C2/C3 cashout. All balances/providers are synthetic.')
  console.log('Evidence: ' + resolve(artifacts, 'result.json'))
} catch (error) {
  if (browser) await browser.screenshot('live-phase3-failure').catch(() => {})
  writeFileSync(resolve(artifacts, 'result.json'), JSON.stringify({ result: 'FAIL', mode: 'live-isolated', scope, project: run.project, error: error.message, checks, api: evidence, browserNetwork: browser?.network }, null, 2))
  throw error
} finally {
  try {
    if (demoRecorder) await demoRecorder.stop()
  } finally {
    if (browser) await browser.close()
    for (const socket of upgradedSockets) socket.destroy()
    server.closeAllConnections()
    if (server.listening) await new Promise((done) => server.close(done))
  }
}
