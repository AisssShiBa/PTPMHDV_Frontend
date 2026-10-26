// Production frontend -> real local Gateway/User/Auth/MinIO. Additive synthetic
// accounts only; no DB resets, role changes, real identity documents or transfers.
import assert from 'node:assert/strict'
import { createServer, request as proxyRequest } from 'node:http'
import { randomUUID } from 'node:crypto'
import { deflateSync } from 'node:zlib'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve, extname, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { openBrowser, until } from './browser-support.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const dist = resolve(root, 'dist')
const artifacts = resolve(root, 'node_modules/.tmp/phase3-live')
mkdirSync(artifacts, { recursive: true })
const gateway = new URL(process.env.LIVE_API_ORIGIN || 'http://127.0.0.1:3000')
assert.ok(['127.0.0.1', 'localhost'].includes(gateway.hostname), 'Only a local development backend is allowed')
assert.equal(gateway.protocol, 'http:')
assert.ok(existsSync(resolve(dist, 'index.html')), 'Build the frontend first')
const evidence = []
async function call(path, { method = 'GET', token, body, expected = 200 } = {}) {
  const response = await fetch(new URL(path, gateway), { method, headers: {
    ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(body ? { 'Content-Type': 'application/json' } : {})
  }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(15000) })
  const json = await response.json()
  evidence.push({ method, path: path.split('?')[0], status: response.status })
  assert.equal(response.status, expected, `${method} ${path.split('?')[0]}: ${json.error?.code || 'unexpected status'}`)
  return json.data
}
async function account() {
  const username = 'fe3_' + randomUUID().replaceAll('-', '')
  const password = 'Synthetic-' + randomUUID()
  const email = username + '@example.test'
  const created = await call('/api/auth/signup', { method: 'POST', expected: 201,
    body: { username, password, email, firstName: 'Synthetic', lastName: 'PhaseThree' } })
  const login = await call('/api/auth/signin', { method: 'POST', body: { username, password } })
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
  if (path.startsWith('/api/')) {
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

let browser
const checks = []
try {
  const sender = await account()
  const recipient = await account()
  const phone = '+84 ' + String(Math.floor(100000000 + Math.random() * 900000000))
  await call('/api/users/by-auth/' + recipient.id, { method: 'PUT', token: recipient.token, body: { fullName: 'Nguyễn Văn Bình', phone } })
  await new Promise((done) => server.listen(0, '127.0.0.1', done))
  // Auth's development CORS policy allows localhost ports, not 127.0.0.1 origins.
  const origin = 'http://localhost:' + server.address().port
  browser = await openBrowser(artifacts, 'phase3', origin)
  await browser.go('/signin')
  await until(() => browser.has('#username'), 'signin')
  await browser.fill('#username', sender.username)
  await browser.fill('#password', sender.password)
  await browser.evaluate('document.querySelector("form").requestSubmit()')
  await until(() => browser.evaluate('location.pathname !== "/signin"'), 'real login')

  await browser.go('/profile')
  await until(() => browser.has('#kyc-front'), 'real profile')
  await browser.fill('#kyc-number', 'SYNTHETIC1234')
  await browser.upload('#kyc-front', imagePath)
  await browser.click('Gửi xác thực')
  await until(() => browser.text('Vui lòng chọn ảnh giấy tờ.'), 'missing back validation')
  assert.equal(browser.network.filter(item => item.path === '/api/users/kyc/documents').length, 0)
  await browser.upload('#kyc-back', imagePath)
  await browser.click('Gửi xác thực', 2)
  await until(() => browser.text('Hồ sơ đang được xét duyệt.'), 'real two-face upload', 25000)
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

  await browser.go('/wallet')
  await until(() => browser.text('Chuyển khoản'), 'wallet')
  await browser.click('Chuyển khoản')
  await until(() => browser.has('#transfer-recipient'), 'transfer dialog')
  const lookup = async (query, message) => {
    await browser.fill('#transfer-recipient', query)
    await browser.click('Tra cứu')
    await until(() => browser.text(message), 'lookup result')
  }
  await lookup(recipient.email, 'Nguyễn V. B.')
  await lookup(phone, 'Nguyễn V. B.')
  assert.equal(await browser.evaluate('document.querySelector("#transfer-confirm").checked'), false)
  assert.equal(await browser.text(recipient.id), false)
  await browser.cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await browser.screenshot('live-recipient-mobile')
  const notFound = 'Không tìm thấy người nhận phù hợp.'
  await lookup(sender.email, notFound)
  await lookup('missing-' + randomUUID() + '@example.test', notFound)
  for (let attempt = 4; attempt < 10; attempt++) await lookup(recipient.email, 'Nguyễn V. B.')
  await lookup(recipient.email, 'Bạn đã tra cứu quá nhiều lần.')
  const lookups = browser.network.filter(item => item.path === '/api/users/lookup')
  assert.equal(lookups.length, 11)
  assert.equal(lookups.at(-1).status, 429)
  await browser.evaluate('document.querySelector(\'button[aria-label="Đóng chuyển tiền"]\').click()')
  await browser.click('Chuyển khoản')
  await until(() => browser.has('#transfer-recipient'), 'reopen after 429')
  await browser.fill('#transfer-recipient', recipient.email)
  assert.equal(await browser.evaluate('[...document.querySelectorAll("dialog button")].find(b=>b.textContent.trim()==="Tra cứu").disabled'), true)
  assert.equal(browser.network.some(item => item.path.startsWith('/api/wallets/' + recipient.id)), false)
  assert.equal(browser.network.some(item => item.path.endsWith('/transfer')), false)
  await browser.screenshot('live-recipient-rate-limit')
  checks.push('H11: exact email/phone; masked recipient; generic self/missing 404; request 11 returns 429; cooldown survives reopen; no recipient balance reads or transfers')
  assert.deepEqual(browser.errors, [])
  writeFileSync(resolve(artifacts, 'result.json'), JSON.stringify({ result: 'PASS', testedAt: new Date().toISOString(), checks, api: evidence, browserNetwork: browser.network }, null, 2))
  console.log('PASS: Phase 3 frontend against real local backend. H8 two-face upload/private image/403; H11 exact lookup/masked name/generic 404/429/cooldown. No money transfers.')
  console.log('Evidence: ' + resolve(artifacts, 'result.json'))
} catch (error) {
  if (browser) await browser.screenshot('live-phase3-failure').catch(() => {})
  writeFileSync(resolve(artifacts, 'result.json'), JSON.stringify({ result: 'FAIL', error: error.message, checks, api: evidence, browserNetwork: browser?.network }, null, 2))
  throw error
} finally {
  if (browser) await browser.close()
  server.closeAllConnections()
  if (server.listening) await new Promise((done) => server.close(done))
}
