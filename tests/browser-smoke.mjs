// Browser smoke test against deterministic API fixtures, not a live backend.
// Requires Node 24, a Chromium browser, and a completed production build.
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { spawn } from 'node:child_process'
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { resolve, extname, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { setTimeout as delay } from 'node:timers/promises'

const root = fileURLToPath(new URL('../', import.meta.url))
const dist = resolve(root, 'dist')
const artifacts = resolve(root, 'node_modules/.tmp/browser-smoke')
const profileDir = resolve(artifacts, 'profile-' + process.pid)
mkdirSync(profileDir, { recursive: true })
const executable = process.env.BROWSER_PATH || [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
].find(existsSync)
assert.ok(executable, 'Set BROWSER_PATH to a Chromium executable')
assert.ok(existsSync(resolve(dist, 'index.html')), 'Run npm run build first')

const user = { id: '10000000-0000-4000-8000-000000000001', username: 'demo', firstName: 'Hữu', lastName: 'Nguyễn', email: 'demo@example.com', role: 'USER' }
let profile = { id: '20000000-0000-4000-8000-000000000001', authUserId: user.id, email: user.email, fullName: 'Nguyễn Hữu', phone: null, address: null, kycStatus: 'NONE', idNumber: null, hasKycDocument: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), version: 0 }
let merchant = null
let signedIn = true
let merchantFailure = false
let uploads = 0
let registrations = 0
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aWQAAAABJRU5ErkJggg==', 'base64')
const filePath = resolve(artifacts, 'document.png')
writeFileSync(filePath, png)
const requests = []
const server = createServer(async (req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname
  const send = (status, data) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)) }
  const success = (data) => send(200, { success: true, data })
  const failure = (status, code) => send(status, { success: false, error: { code, message: code } })
  try {
    if (path.startsWith('/api/')) {
      requests.push(req.method + ' ' + path)
      const chunks = []
      for await (const chunk of req) chunks.push(chunk)
      const raw = Buffer.concat(chunks)
      if (path === '/api/auth/refresh') return signedIn ? success({ user, accessToken: 'fixture-token' }) : failure(401, 'UNAUTHORIZED')
      if (path === '/api/auth/signin') {
        const body = JSON.parse(raw.toString())
        if (body.username !== 'demo' || body.password !== 'password') return failure(401, 'INVALID_CREDENTIALS')
        signedIn = true
        return success({ user, accessToken: 'fixture-token' })
      }
      if (path === '/api/auth/signout') { signedIn = false; return success(null) }
      if (!signedIn || req.headers.authorization !== 'Bearer fixture-token') return failure(401, 'UNAUTHORIZED')
      if (path === '/api/users/by-auth/' + user.id) {
        if (req.method === 'PUT') {
          const body = JSON.parse(raw.toString())
          assert.ok(Object.keys(body).every((key) => ['fullName', 'phone', 'address'].includes(key)))
          profile = { ...profile, ...body, version: profile.version + 1, updatedAt: new Date().toISOString() }
        }
        return success(profile)
      }
      if (path.endsWith('/kyc/document')) return success({ url: origin + '/document.png', expiresIn: 2 })
      if (path.endsWith('/kyc') && req.method === 'POST') {
        const request = new Request(origin + path, { method: 'POST', headers: { 'Content-Type': req.headers['content-type'] }, body: raw })
        const form = await request.formData()
        assert.deepEqual([...form.keys()].sort(), ['document', 'idNumber'])
        assert.equal(form.get('document').type, 'image/png')
        uploads++
        profile = { ...profile, idNumber: form.get('idNumber'), kycStatus: 'PENDING', hasKycDocument: true, version: profile.version + 1, updatedAt: new Date().toISOString() }
        return success(profile)
      }
      if (path === '/api/merchants/me') return merchantFailure ? failure(500, 'INTERNAL_SERVER_ERROR') : success(merchant)
      if (path === '/api/merchants/register') {
        registrations++
        if (merchant) return failure(409, 'DUPLICATE_RESOURCE')
        const body = JSON.parse(raw.toString())
        assert.deepEqual(Object.keys(body), ['businessName'])
        merchant = { ...body, id: '30000000-0000-4000-8000-000000000001', ownerId: user.id, taxId: null, bankAccount: null, status: 'PENDING', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
        return success(merchant)
      }
      return failure(404, 'NOT_FOUND')
    }
    if (path === '/document.png') { res.writeHead(200, { 'Content-Type': 'image/png' }); return res.end(png) }
    const candidate = resolve(dist, '.' + decodeURIComponent(path))
    if (!candidate.startsWith(dist + sep) && candidate !== dist) { res.writeHead(403); return res.end() }
    const file = extname(path) && existsSync(candidate) ? candidate : resolve(dist, 'index.html')
    const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.png': 'image/png' }
    res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream' })
    res.end(readFileSync(file))
  } catch (error) { console.error(error); failure(500, 'FIXTURE_ERROR') }
})
await new Promise((done) => server.listen(0, '127.0.0.1', done))
const origin = 'http://127.0.0.1:' + server.address().port
const browser = spawn(executable, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--remote-debugging-port=0', '--user-data-dir=' + profileDir, 'about:blank'], { windowsHide: true, stdio: 'ignore' })
let socket
let cdp
const runtimeErrors = []
async function until(check, label) {
  for (let i = 0; i < 150; i++) { if (await check()) return; await delay(80) }
  throw new Error('Timed out: ' + label)
}
try {
  const portFile = resolve(profileDir, 'DevToolsActivePort')
  await until(() => existsSync(portFile), 'browser debugging port')
  const port = readFileSync(portFile, 'utf8').split('\n')[0].trim()
  const target = await fetch('http://127.0.0.1:' + port + '/json/new?about:blank', { method: 'PUT' }).then((r) => r.json())
  socket = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((done, reject) => { socket.addEventListener('open', done, { once: true }); socket.addEventListener('error', reject, { once: true }) })
  let id = 0
  const pending = new Map()
  socket.addEventListener('message', ({ data }) => {
    const event = JSON.parse(data)
    if (event.method === 'Runtime.exceptionThrown') runtimeErrors.push(event.params.exceptionDetails.text)
    if (event.id && pending.has(event.id)) {
      const { resolve, reject } = pending.get(event.id)
      pending.delete(event.id)
      if (event.error) reject(new Error(event.error.message)); else resolve(event.result)
    }
  })
  cdp = (method, params = {}) => new Promise((resolve, reject) => {
    const current = ++id
    pending.set(current, { resolve, reject })
    socket.send(JSON.stringify({ id: current, method, params }))
  })
  const evaluate = async (expression) => {
    const result = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails))
    return result.result.value
  }
  const has = (selector) => evaluate('!!document.querySelector(' + JSON.stringify(selector) + ')')
  const text = (value) => evaluate('document.body.innerText.includes(' + JSON.stringify(value) + ')')
  const go = async (path) => { await cdp('Page.navigate', { url: origin + path }) }
  const fill = async (selector, value) => evaluate('(() => { const input = document.querySelector(' + JSON.stringify(selector) + '); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(input, ' + JSON.stringify(value) + '); input.dispatchEvent(new Event("input", { bubbles: true })); input.dispatchEvent(new Event("change", { bubbles: true })); })()')
  const click = (label, times = 1) => evaluate('(() => { const button = [...document.querySelectorAll("button")].find(el => el.textContent.trim() === ' + JSON.stringify(label) + '); if (!button) throw new Error("Missing button"); for (let i = 0; i < ' + times + '; i++) button.click(); })()')
  const screenshot = async (name) => {
    const result = await cdp('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })
    writeFileSync(resolve(artifacts, name + '.png'), Buffer.from(result.data, 'base64'))
  }
  await cdp('Runtime.enable')
  await cdp('Page.enable')
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1280, height: 1000, deviceScaleFactor: 1, mobile: false })

  await go('/profile')
  await until(() => evaluate('!!document.querySelector("#profile-email")'), 'profile load')
  assert.equal(await evaluate('document.querySelector("#profile-email").readOnly'), true)
  await fill('#profile-phone', '+84 912 345 678')
  await click('Lưu thông tin')
  await until(() => profile.phone === '+84 912 345 678', 'profile save')
  await go('/profile')
  await until(() => evaluate('document.querySelector("#profile-phone")?.value === "+84 912 345 678"'), 'profile reload')

  await click('Gửi xác thực')
  await until(() => text('Vui lòng nhập số CCCD hoặc Passport.'), 'KYC validation')
  assert.equal(uploads, 0)
  await fill('#kyc-number', 'B1234567')
  const doc = await cdp('DOM.getDocument')
  const input = await cdp('DOM.querySelector', { nodeId: doc.root.nodeId, selector: '#kyc-file' })
  await cdp('DOM.setFileInputFiles', { nodeId: input.nodeId, files: [filePath] })
  await until(() => has('img[alt="Xem trước giấy tờ đã chọn"]'), 'file preview')
  await fill('#profile-fullName', 'Tên đang soạn chưa lưu')
  await click('Gửi xác thực', 2)
  await until(() => text('Đang chờ duyệt'), 'KYC submitted')
  assert.equal(uploads, 1)
  assert.equal(await evaluate('document.querySelector("#profile-fullName").value'), 'Tên đang soạn chưa lưu')
  assert.equal(await evaluate('!!document.querySelector("#kyc-file")'), false)
  await click('Xem giấy tờ đã gửi')
  await until(() => has('img[alt="Giấy tờ xác thực đã gửi"]'), 'saved document')
  await until(() => text('Liên kết xem ảnh đã hết hạn.'), 'signed URL expiry')
  profile = { ...profile, kycStatus: 'APPROVED', version: profile.version + 1 }
  await click('Tải lại trạng thái')
  await until(() => text('Đã xác thực'), 'KYC approval')
  await screenshot('profile-desktop')
  profile = { ...profile, kycStatus: 'REJECTED', version: profile.version + 1 }
  await go('/profile')
  await until(() => evaluate('!!document.querySelector("#kyc-file")'), 'rejected resubmission form')
  await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true)
  await screenshot('profile-mobile')

  merchantFailure = true
  await go('/merchant-register')
  await until(() => text('Thử tải lại'), 'merchant load failure')
  assert.equal(await evaluate('!!document.querySelector("#merchant-businessName")'), false)
  merchantFailure = false
  await click('Thử tải lại')
  await until(() => evaluate('!!document.querySelector("#merchant-businessName")'), 'merchant empty state')
  await click('Gửi đăng ký đối tác')
  await until(() => text('Vui lòng nhập tên thương hiệu.'), 'merchant validation')
  assert.equal(registrations, 0)
  await fill('#merchant-businessName', 'Cửa hàng Hữu')
  await click('Gửi đăng ký đối tác', 2)
  await until(() => text('Đang chờ duyệt'), 'merchant registered')
  assert.equal(registrations, 1)
  await go('/merchant-register')
  await until(() => text('Cửa hàng Hữu'), 'merchant persists after reload')
  assert.equal(await evaluate('!!document.querySelector("#merchant-businessName")'), false)
  merchant.status = 'APPROVED'
  await click('Tải lại trạng thái')
  await until(() => text('Đã được phê duyệt'), 'merchant approval')
  await screenshot('merchant-mobile')

  signedIn = false
  await go('/profile')
  await until(() => evaluate('location.pathname === "/signin"'), 'protected redirect')
  await until(() => evaluate('!!document.querySelector("#username")'), 'signin form')
  await fill('#username', 'demo')
  await fill('#password', 'incorrect')
  await evaluate('document.querySelector("form").requestSubmit()')
  await until(() => text('Tên đăng nhập hoặc mật khẩu không đúng.'), 'failed login message')
  assert.equal(await evaluate('location.pathname'), '/signin')
  await fill('#password', 'password')
  await evaluate('document.querySelector("form").requestSubmit()')
  await until(() => evaluate('!!document.querySelector("#profile-email")'), 'login returns to profile')

  assert.deepEqual(runtimeErrors, [])
  assert.ok(!requests.some((request) => request.includes('/user/me')))
  console.log('PASS: profile edit/reload; KYC validation/upload/status/document expiry; merchant errors/register/reload/status; protected redirect/login; mobile overflow; no runtime exceptions.')
  console.log('API fixtures only. Screenshots: ' + artifacts)
} finally {
  if (cdp) await Promise.race([cdp('Browser.close').catch(() => {}), delay(1000)])
  socket?.close()
  browser.kill()
  server.closeAllConnections()
  await new Promise((done) => server.close(done))
}
