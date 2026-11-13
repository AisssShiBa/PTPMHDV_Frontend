// Current H01 routes against a fresh, explicitly identified isolated backend stack.
import assert from 'node:assert/strict'
import { createServer, request as proxyRequest } from 'node:http'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve, extname, sep, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parseEnv } from 'node:util'
import { deflateSync } from 'node:zlib'
import { openBrowser, until } from './browser-support.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const backend = resolve(root, '../PTPMHDV_Backend')
const runFile = process.env.LIVE_ACCEPTANCE_RUN_FILE
assert.ok(runFile, 'Set LIVE_ACCEPTANCE_RUN_FILE to the fresh backend acceptance run.json')
const run = JSON.parse(readFileSync(runFile, 'utf8'))
assert.match(run.project, /^finvault-acceptance-[0-9a-f]{12}$/)
const gateway = new URL(run.gateway)
assert.ok(['127.0.0.1', 'localhost'].includes(gateway.hostname), 'Only an isolated local Gateway is allowed')
assert.equal(gateway.protocol, 'http:')
const directory = dirname(resolve(runFile))
assert.equal(directory, resolve(backend, '.cache/acceptance-week2', run.project))
const config = parseEnv(readFileSync(resolve(directory, '.env'), 'utf8'))
const runtime = await import(pathToFileURL(resolve(backend, 'tests/acceptance/week2/runtime.mjs')).href)
const ctx = { project: run.project, directory, config, base: gateway.origin, requests: [],
  env: { ...process.env, ...config }, composeArgs: ['compose', '--project-directory', backend, '--env-file', resolve(directory, '.env'), '-p', run.project, '-f', resolve(backend, 'docker-compose.yml'), '-f', resolve(directory, 'compose.json')] }
const dist = resolve(root, 'dist')
assert.ok(existsSync(resolve(dist, 'index.html')), 'Build the frontend with VITE_API_BASE_URL=/api first')
const artifacts = resolve(root, 'docs/evidence/huu-fe-phase1/final/live')
const temporary = resolve(root, 'node_modules/.tmp/profile-live')
mkdirSync(artifacts, { recursive: true }); mkdirSync(temporary, { recursive: true })
const image = resolve(temporary, 'synthetic.png')
function crc32(bytes) {
  let crc = 0xffffffff
  for (const byte of bytes) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
  }
  return (crc ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const tag = Buffer.from(type)
  const size = Buffer.alloc(4); size.writeUInt32BE(data.length)
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([tag, data])))
  return Buffer.concat([size, tag, data, crc])
}
const header = Buffer.alloc(13)
header.writeUInt32BE(16, 0); header.writeUInt32BE(16, 4); header[8] = 8; header[9] = 2
const pixels = Buffer.concat(Array.from({ length: 16 }, () => Buffer.concat([Buffer.from([0]), Buffer.alloc(48, 180)])))
writeFileSync(image, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(pixels)), chunk('IEND', Buffer.alloc(0))]))

const server = createServer((req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname
  if (path.startsWith('/api/') || path.startsWith('/socket.io')) {
    const upstream = proxyRequest(new URL(req.url, gateway), { method: req.method, headers: { ...req.headers, host: gateway.host } }, (response) => {
      res.writeHead(response.statusCode, response.headers); response.pipe(res)
    })
    upstream.on('error', () => { if (!res.headersSent) res.writeHead(502); res.end() })
    req.pipe(upstream); return
  }
  const candidate = resolve(dist, '.' + decodeURIComponent(path))
  if (!candidate.startsWith(dist + sep) && candidate !== dist) { res.writeHead(403); res.end(); return }
  const file = extname(path) && existsSync(candidate) ? candidate : resolve(dist, 'index.html')
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2' }
  res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream' }); res.end(readFileSync(file))
})
const checks = []
writeFileSync(resolve(artifacts, 'result.json'), JSON.stringify({ status: 'RUNNING', project: run.project, startedAt: new Date().toISOString() }, null, 2))
let browser
try {
  assert.ok((await fetch(new URL('/health', gateway), { signal: AbortSignal.timeout(5000) })).ok, 'Isolated Gateway unavailable')
  const owner = await runtime.account(ctx, 'h01user')
  // Role elevation is restricted to a generated synthetic account in this fresh isolated DB.
  const admin = await runtime.account(ctx, 'h01admin', undefined, 'ADMIN')
  const foreign = await runtime.account(ctx, 'h01other')
  await new Promise((done, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', done) })
  const origin = 'http://localhost:' + server.address().port
  browser = await openBrowser(temporary, 'profile-live', origin)
  await browser.go('/app/profile')
  await until(() => browser.has('#username'), 'real signin after guard')
  await browser.fill('#username', owner.username)
  await browser.fill('#password', owner.password)
  await browser.evaluate('document.querySelector("form").requestSubmit()')
  await until(() => browser.has('#profile-email'), 'real profile')
  await browser.fill('#profile-fullName', 'Người dùng nghiệm thu tổng hợp')
  await browser.click('Lưu thông tin')
  await until(async () => (await runtime.call(ctx, '/users/me', { token: owner.token })).data.fullName === 'Người dùng nghiệm thu tổng hợp', 'persist profile')
  await browser.go('/app/profile')
  await until(() => browser.evaluate('document.querySelector("#profile-fullName")?.value === "Người dùng nghiệm thu tổng hợp"'), 'cookie refresh and reload persisted profile')
  checks.push('HU-F01: UI login + PUT + backend GET + browser reload/refresh cookie')
  await browser.fill('#kyc-number', 'SYNTHETIC123')
  await browser.upload('#kyc-front', image)
  await browser.click('Gửi xác thực')
  await until(() => browser.text('Vui lòng chọn ảnh giấy tờ.'), 'missing back blocked')
  assert.equal(browser.network.some((r) => r.method === 'POST' && r.path === '/api/users/kyc/documents'), false)
  await browser.upload('#kyc-back', image)
  await browser.click('Gửi xác thực', 2)
  await until(() => browser.text('Đang chờ xét duyệt'), 'real multipart creates PENDING')
  const uploads = browser.network.filter((r) => r.method === 'POST' && r.path === '/api/users/kyc/documents')
  assert.equal(uploads.length, 1); assert.equal(uploads[0].status, 202)
  const saved = (await runtime.call(ctx, '/users/me', { token: owner.token })).data
  assert.equal(saved.hasKycDocument, true)
  const docs = (await runtime.call(ctx, '/admin/kyc/' + saved.id + '/documents', { token: admin.token })).data
  for (const url of [docs.frontUrl, docs.backUrl]) assert.ok((await fetch(url)).ok)
  await runtime.call(ctx, '/users/by-auth/' + owner.id + '/kyc/document', { token: foreign.token, expected: 403 })
  checks.push('HU-F02: two-sided multipart, double submit one 202, both MinIO objects readable, foreign USER rejected')
  await browser.click('Xem giấy tờ đã gửi')
  await until(() => browser.evaluate('(()=>{const i=document.querySelector(\'img[alt="Giấy tờ xác thực đã gửi"]\');return !!i?.complete && i.naturalWidth>0})()'), 'real MinIO image in browser')
  await until(() => browser.text('Liên kết xem ảnh đã hết hạn.'), 'viewer hides after real TTL', 15000)
  for (const url of [docs.frontUrl, docs.backUrl]) {
    const expired = await fetch(url, { cache: 'no-store' })
    assert.equal(expired.status, 403)
  }
  checks.push('HU-F04: real private image, viewer TTL and uncached MinIO requests return 403 after expiry')
  await runtime.call(ctx, '/admin/kyc/' + saved.id + '/review', { method: 'POST', token: admin.token, body: { status: 'APPROVED', detail: 'Synthetic acceptance approval' } })
  await browser.click('Làm mới trạng thái')
  await until(() => browser.text('Cấp xác thực: 1'), 'approved tier in UI')
  await runtime.call(ctx, '/admin/kyc/' + saved.id + '/review', { method: 'POST', token: admin.token, body: { status: 'REJECTED', detail: 'Ảnh cần chụp lại (nghiệm thu tổng hợp).' } })
  await browser.click('Làm mới trạng thái')
  await until(() => browser.text('Ảnh cần chụp lại (nghiệm thu tổng hợp).'), 'real rejection reason')
  assert.equal(await browser.has('#kyc-front'), true)
  checks.push('HU-F03: Admin approval tier 1, rejection reason/tier from real User status API')
  await browser.cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  assert.equal(await browser.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true)
  await browser.screenshot('live-profile-mobile')
  writeFileSync(resolve(artifacts, 'live-profile-mobile.png'), readFileSync(resolve(temporary, 'live-profile-mobile.png')))
  await browser.evaluate(`document.querySelector('button[aria-label="Tài khoản"]').focus()`)
  await browser.cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowDown', code: 'ArrowDown', windowsVirtualKeyCode: 40 })
  await browser.cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowDown', code: 'ArrowDown', windowsVirtualKeyCode: 40 })
  await until(() => browser.evaluate(`[...document.querySelectorAll('[role="menuitem"]')].some((el)=>el.textContent.includes("Đăng xuất"))`), 'logout menu')
  await browser.evaluate(`[...document.querySelectorAll('[role="menuitem"]')].find((el)=>el.textContent.includes("Đăng xuất")).click()`)
  await until(() => browser.has('#username'), 'logout revoked UI session')
  await browser.fill('#username', foreign.username)
  await browser.fill('#password', foreign.password)
  await browser.evaluate('document.querySelector("form").requestSubmit()')
  await until(() => browser.evaluate('location.pathname === "/app"'), 'second account login')
  await browser.go('/app/profile')
  await until(() => browser.evaluate('document.querySelector("#profile-email")?.value === ' + JSON.stringify(foreign.email)), 'foreign account profile')
  assert.equal(await browser.text('Ảnh cần chụp lại (nghiệm thu tổng hợp).'), false)
  assert.equal(await browser.has('img[alt="Giấy tờ xác thực đã gửi"]'), false)
  checks.push('HU-F15: UI logout and login another account; no prior profile/reason/signed image')
  assert.deepEqual(browser.errors, [])
  writeFileSync(resolve(artifacts, 'result.json'), JSON.stringify({ status: 'HTTP_LIVE_PASS', project: run.project, testedAt: new Date().toISOString(), checks, api: ctx.requests, browserNetwork: browser.network }, null, 2))
  console.log('PASS: H01 live Gateway/Auth/User/Admin/MinIO (' + checks.length + ' groups), synthetic accounts, no transfers')
} catch (error) {
  writeFileSync(resolve(artifacts, 'result.json'), JSON.stringify({ status: 'FAIL', project: run.project, reason: error.message.split('\\n')[0], checks, api: ctx.requests }, null, 2))
  console.error('H01 live failed; inspect credential-free result.json')
  process.exitCode = 1
} finally {
  if (browser) await browser.close()
  server.closeAllConnections()
  if (server.listening) await new Promise((done) => server.close(done))
}
