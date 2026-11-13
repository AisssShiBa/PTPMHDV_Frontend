// Current Auth/Profile/KYC routes against synthetic HTTP fixtures. Not live E2E.
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve, extname, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { setTimeout as delay } from 'node:timers/promises'
import { openBrowser, until } from './browser-support.mjs'

const root = fileURLToPath(new URL('../', import.meta.url))
const dist = resolve(root, 'dist')
const artifacts = resolve(root, process.env.BROWSER_EVIDENCE_DIR || 'docs/evidence/huu-fe-phase1/final/browser')
const runtime = resolve(root, 'node_modules/.tmp/profile-browser')
mkdirSync(artifacts, { recursive: true }); mkdirSync(runtime, { recursive: true })
assert.ok(existsSync(resolve(dist, 'index.html')), 'Build the current frontend first')
let user = { id: '10000000-0000-4000-8000-000000000001', username: 'synthetic', email: 'synthetic@example.test', role: 'USER' }
let profile = { id: '20000000-0000-4000-8000-000000000001', authUserId: user.id, email: user.email, fullName: 'Người dùng tổng hợp', phone: null, address: null, kycStatus: 'NONE', kycTier: 0, idNumber: null, hasKycDocument: false, version: 0, updatedAt: new Date().toISOString(), createdAt: new Date().toISOString() }
let signedIn = true
let failProfile = false
let uploads = 0
let refreshes = 0
const requests = []
const checks = []
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==', 'base64')
const imagePath = resolve(runtime, 'synthetic.png')
writeFileSync(imagePath, png)
let origin
const server = createServer(async (req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname
  const send = (status, data) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)) }
  const success = (data, status = 200) => send(status, { success: true, data })
  const failure = (status, code) => send(status, { success: false, error: { code, message: 'Synthetic backend error' } })
  try {
    if (path.startsWith('/api/')) {
      requests.push({ method: req.method, path })
      const chunks = []; for await (const chunk of req) chunks.push(chunk)
      const raw = Buffer.concat(chunks)
      if (path === '/api/auth/refresh') {
        refreshes += 1
        return signedIn ? success({ user, accessToken: 'synthetic-fixture-token' }) : failure(401, 'UNAUTHORIZED')
      }
      if (path === '/api/auth/signin') {
        const body = JSON.parse(raw.toString())
        if (body.password !== 'synthetic-password') return failure(401, 'INVALID_CREDENTIALS')
        signedIn = true
        return success({ user, accessToken: 'synthetic-fixture-token' })
      }
      if (path === '/api/auth/signout') { signedIn = false; return success(null) }
      if (!signedIn || req.headers.authorization !== 'Bearer synthetic-fixture-token') return failure(401, 'UNAUTHORIZED')
      if (path === '/api/users/by-auth/' + user.id) {
        if (failProfile) return failure(500, 'INTERNAL_SERVER_ERROR')
        if (req.method === 'PUT') {
          const body = JSON.parse(raw.toString())
          assert.ok(Object.keys(body).every((key) => ['fullName', 'phone', 'address'].includes(key)))
          profile = { ...profile, ...body, version: profile.version + 1 }
        }
        return success(profile)
      }
      if (path === '/api/users/me/kyc') return success({ kycStatus: profile.kycStatus, kycTier: profile.kycTier, hasKycDocument: profile.hasKycDocument, ...(profile.kycStatus === 'REJECTED' ? { kycRejectReason: 'Ảnh mặt sau bị mờ (dữ liệu tổng hợp).' } : {}) })
      if (path === '/api/users/kyc/documents') {
        const headers = { 'Content-Type': req.headers['content-type'] }
        const body = await new Request(origin + path, { method: 'POST', headers, body: raw }).formData()
        assert.equal(body.get('idNumber'), 'SYNTHETIC123')
        for (const side of ['front', 'back']) {
          const image = body.get(side)
          assert.equal(image.type, 'image/png')
          assert.equal(image.name, 'synthetic.png')
          assert.equal(image.size, png.length)
        }
        uploads += 1
        await delay(80)
        profile = { ...profile, kycStatus: 'PENDING', hasKycDocument: true, version: profile.version + 1, updatedAt: new Date().toISOString() }
        return success(profile, 202)
      }
      if (path === '/api/users/by-auth/' + user.id + '/kyc/document') return success({ url: origin + '/synthetic-document.png', expiresIn: 2 })
      if (/^\/api\/wallets\/[^/]+\/balance$/.test(path)) return success({ availableBalance: '100000', balance: '100000', heldBalance: '0', currency: 'VND', status: 'ACTIVE' })
      if (path === '/api/notifications/me') return success({ notifications: [], unreadCount: 0, pagination: { page: 1, limit: 10, total: 0, totalPages: 1 } })
      if (path === '/api/notifications/socket-ticket') return failure(503, 'SOCKET_UNAVAILABLE')
      return failure(404, 'NOT_FOUND')
    }
    if (path === '/synthetic-document.png') { res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' }); return res.end(png) }
    if (path.startsWith('/socket.io')) { res.writeHead(503); return res.end() }
    const candidate = resolve(dist, '.' + decodeURIComponent(path))
    if (!candidate.startsWith(dist + sep) && candidate !== dist) { res.writeHead(403); return res.end() }
    const file = extname(path) && existsSync(candidate) ? candidate : resolve(dist, 'index.html')
    const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.png': 'image/png' }
    res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream' })
    res.end(readFileSync(file))
  } catch { failure(500, 'FIXTURE_ASSERTION_FAILED') }
})
let browser
try {
  await new Promise((done, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', done) })
  origin = 'http://127.0.0.1:' + server.address().port
  browser = await openBrowser(runtime, 'profile', origin)
  const wait = (fn, label) => until(fn, label)
  await browser.go('/app/profile')
  await wait(() => browser.has('#profile-email'), 'profile API after refresh')
  assert.ok(refreshes >= 1)
  assert.equal(await browser.evaluate('document.querySelector("#profile-email").readOnly'), true)
  await browser.fill('#profile-phone', '+84 912 345 678')
  await browser.click('Lưu thông tin')
  await wait(() => profile.phone === '+84 912 345 678', 'profile PUT')
  await browser.go('/app/profile')
  await wait(() => browser.evaluate('document.querySelector("#profile-phone")?.value === "+84 912 345 678"'), 'persisted profile after reload')
  checks.push('Profile GET/PUT/reload, real AuthStore refresh against fixture API, email readonly')
  await browser.click('Gửi xác thực')
  await wait(() => browser.text('Vui lòng nhập số CCCD hoặc Passport.'), 'required ID')
  await browser.fill('#kyc-number', 'SYNTHETIC123')
  await browser.upload('#kyc-front', imagePath)
  await browser.click('Gửi xác thực')
  await wait(() => browser.text('Vui lòng chọn ảnh giấy tờ.'), 'missing back blocked')
  assert.equal(uploads, 0)
  await browser.upload('#kyc-back', imagePath)
  await browser.fill('#profile-fullName', 'Bản nháp chưa lưu')
  await browser.click('Gửi xác thực', 2)
  await wait(() => browser.text('Đang chờ xét duyệt'), 'backend PENDING after HTTP multipart')
  assert.equal(uploads, 1)
  assert.equal(await browser.evaluate('document.querySelector("#profile-fullName").value'), 'Bản nháp chưa lưu')
  assert.equal(await browser.has('#kyc-front'), false)
  checks.push('Two-sided real HTTP multipart to synthetic server; required back, one POST after double click, draft retained')
  await browser.click('Xem giấy tờ đã gửi')
  await wait(() => browser.has('img[alt="Giấy tờ xác thực đã gửi"]'), 'document viewer')
  await wait(() => browser.text('Liên kết xem ảnh đã hết hạn.'), 'URL expiry')
  assert.equal(await browser.has('img[alt="Giấy tờ xác thực đã gửi"]'), false)
  profile = { ...profile, kycStatus: 'APPROVED', kycTier: 1 }
  await browser.click('Làm mới trạng thái')
  await wait(() => browser.text('Cấp xác thực: 1'), 'approved tier')
  assert.equal(await browser.has('#kyc-front'), false)
  await browser.screenshot('profile-desktop')
  writeFileSync(resolve(artifacts, 'profile-desktop.png'), readFileSync(resolve(runtime, 'profile-desktop.png')))
  profile = { ...profile, kycStatus: 'REJECTED', kycTier: 0 }
  await browser.click('Làm mới trạng thái')
  await wait(() => browser.text('Ảnh mặt sau bị mờ (dữ liệu tổng hợp).'), 'rejection reason')
  assert.equal(await browser.has('#kyc-front'), true)
  checks.push('PENDING/APPROVED/REJECTED from status API, reason and tier, document viewer TTL')
  await browser.cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  assert.equal(await browser.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true)
  await browser.screenshot('profile-mobile')
  writeFileSync(resolve(artifacts, 'profile-mobile.png'), readFileSync(resolve(runtime, 'profile-mobile.png')))
  await browser.evaluate('document.querySelector("#profile-fullName").focus()')
  await browser.cdp('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 })
  await browser.cdp('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 })
  assert.equal(await browser.evaluate('document.activeElement.id'), 'profile-phone')
  checks.push('1280px screenshot, 390px no overflow screenshot and keyboard form navigation')
  failProfile = true
  await browser.click('Làm mới trạng thái')
  await wait(() => browser.text('Không thể tải dữ liệu'), 'error boundary')
  assert.equal(await browser.has('#profile-email'), false)
  failProfile = false
  await browser.click('Thử lại')
  await wait(() => browser.has('#profile-email'), 'error retry')
  signedIn = false
  await browser.go('/app/profile')
  await wait(() => browser.evaluate('location.pathname === "/sign-in"'), 'guard redirect')
  await wait(() => browser.has('#username'), 'signin lazy page ready')
  await browser.fill('#username', 'synthetic')
  await browser.fill('#password', 'wrong-password')
  await browser.evaluate('document.querySelector("form").requestSubmit()')
  await wait(() => browser.text('Tên đăng nhập hoặc mật khẩu không đúng.'), 'invalid login stays on signin')
  assert.equal(await browser.evaluate('location.pathname'), '/sign-in')
  await browser.fill('#password', 'synthetic-password')
  await browser.evaluate('document.querySelector("form").requestSubmit()')
  await wait(() => browser.has('#profile-email'), 'correct login returns to profile')
  checks.push('Error/retry, unauthorized guard, failed login and successful API login')
  user = { ...user, id: '10000000-0000-4000-8000-000000000002', email: 'second@example.test' }
  profile = { ...profile, authUserId: user.id, email: user.email, fullName: 'Tài khoản thứ hai', hasKycDocument: false }
  await browser.go('/app/profile')
  await wait(() => browser.evaluate('document.querySelector("#profile-email")?.value === "second@example.test"'), 'account B')
  assert.equal(await browser.text('Bản nháp chưa lưu'), false)
  assert.equal(await browser.has('img[alt="Giấy tờ xác thực đã gửi"]'), false)
  assert.equal(await browser.evaluate('JSON.stringify({...localStorage, ...sessionStorage}).includes("fixture-token")'), false)
  assert.deepEqual(browser.errors, [])
  assert.equal(requests.some((r) => r.path.includes('/vnpay/ipn')), false)
  checks.push('Account B reload has no account A draft/image; no token in storage, no IPN, no JS exceptions')
  writeFileSync(resolve(artifacts, 'result.json'), JSON.stringify({ status: 'MOCK_HTTP_BROWSER_PASS', testedAt: new Date().toISOString(), checks, uploads, requests }, null, 2))
  console.log('PASS: current Auth/Profile/KYC production browser smoke (' + checks.length + ' groups). Synthetic HTTP fixtures only; not Gateway/MinIO live.')
} catch (error) {
  if (browser) await browser.screenshot('profile-failure').catch(() => {})
  writeFileSync(resolve(artifacts, 'result.json'), JSON.stringify({ status: 'FAIL', error: error.message, checks }, null, 2))
  throw error
} finally {
  if (browser) await browser.close()
  server.closeAllConnections()
  if (server.listening) await new Promise((done) => server.close(done))
}
