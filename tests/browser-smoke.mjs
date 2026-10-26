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
let profile = { id: '20000000-0000-4000-8000-000000000001', authUserId: user.id, email: user.email, fullName: 'Nguyễn Hữu', phone: null, address: null, kycStatus: 'NONE', kycTier: 0, idNumber: null, hasKycDocument: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), version: 0 }
let merchant = null
let signedIn = true
let merchantFailure = false
let uploads = 0
let registrations = 0
let adminWrites = 0
let documentReads = 0
let failAdminWrite = false
let failAdminList = false
let failDocuments = false
const recipientId = '40000000-0000-4000-8000-000000000001'
const lookupQueries = []
const transfers = []
let uncertainTransfer = false
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
      if (path === '/api/users/lookup') {
        assert.equal(req.method, 'GET')
        const query = new URL(req.url, 'http://localhost').searchParams.get('q')
        lookupQueries.push(query)
        if (query === 'slow@example.com') {
          await delay(350)
          return success({ authUserId: recipientId, maskedName: 'Phản hồi cũ' })
        }
        if (query === 'limit@example.com') { res.setHeader('Retry-After', '2'); return failure(429, 'RATE_LIMIT_EXCEEDED') }
        if (query === 'server@example.com') return failure(503, 'UNAVAILABLE')
        if (!['Binh+wallet@Example.com', '+84 912 345 678'].includes(query)) return failure(404, 'RECIPIENT_NOT_FOUND')
        return success({ authUserId: recipientId, maskedName: 'Nguyễn V. B.' })
      }
      if (path.startsWith('/api/wallets/')) {
        assert.ok(path.startsWith('/api/wallets/' + user.id + '/'), 'never read the recipient wallet')
        if (path.endsWith('/balance')) return success({ balance: '500000', availableBalance: '500000', heldBalance: '0', currency: 'VND', status: 'ACTIVE' })
        if (path.endsWith('/transfer')) {
          assert.equal(req.method, 'POST')
          const body = JSON.parse(raw.toString())
          assert.deepEqual(Object.keys(body).sort(), ['amount', 'referenceId', 'toUserId'])
          assert.equal(body.toUserId, recipientId)
          assert.match(body.referenceId, /^P2P-[0-9a-f-]{36}$/)
          transfers.push(body)
          await delay(100)
          if (uncertainTransfer) return failure(503, 'UNAVAILABLE')
          return success({ transactionId: 'fixture-txn', replayed: transfers.length > 1 })
        }
      }
      if (path.startsWith('/api/notifications')) return success({ notifications: [], unreadCount: 0, pagination: { totalPages: 1 } })
      if (path === '/api/payments' && req.method === 'GET') {
        const query = new URL(req.url, 'http://localhost').searchParams
        assert.equal(query.has('page') || query.has('limit'), false)
        return success(Array.from({ length: 12 }, (_, index) => ({
          id: 'payment' + String(index + 1).padStart(2, '0'), userId: user.id,
          amount: 10000, type: 'BUS_TICKET', status: 'SUCCESS', createdAt: new Date().toISOString()
        })))
      }
      if (path === '/api/admin/kyc') {
        if (user.role !== 'ADMIN') return failure(403, 'FORBIDDEN')
        if (failAdminList) return failure(503, 'UNAVAILABLE')
        const query = new URL(req.url, 'http://localhost').searchParams
        const matches = (!query.get('status') || query.get('status') === profile.kycStatus) &&
          (!query.get('search') || (profile.email + profile.fullName).includes(query.get('search')))
        return success({ content: matches ? [profile] : [], totalElements: matches ? 1 : 0, totalPages: 1 })
      }
      if (path.startsWith('/api/admin/kyc/' + profile.id + '/')) {
        if (user.role !== 'ADMIN') return failure(403, 'FORBIDDEN')
        if (path.endsWith('/documents')) {
          documentReads++
          if (failDocuments) return failure(404, 'KYC_DOCUMENTS_INCOMPLETE')
          return success({ frontUrl: origin + '/document.png?front', backUrl: origin + '/document.png?back', expiresAt: new Date(Date.now() + 2000).toISOString() })
        }
        adminWrites++
        const body = JSON.parse(raw.toString())
        if (failAdminWrite) return failure(503, 'KYC_OUTCOME_UNKNOWN')
        if (path.endsWith('/tier')) {
          assert.equal(req.method, 'PATCH')
          assert.deepEqual(Object.keys(body).sort(), ['reason', 'tier'])
          assert.ok(body.reason.trim() && body.reason.length <= 500)
          if (profile.kycStatus !== 'APPROVED') return failure(409, 'KYC_NOT_APPROVED')
          assert.ok([1, 2].includes(body.tier))
          profile = { ...profile, kycTier: body.tier }
        } else {
          assert.equal(req.method, 'POST')
          assert.deepEqual(Object.keys(body).sort(), ['detail', 'status'])
          assert.ok(body.detail.trim())
          profile = { ...profile, kycStatus: body.status, kycTier: body.status === 'APPROVED' ? 1 : 0 }
        }
        return success(profile)
      }
      if (path === '/api/users/by-auth/' + user.id) {
        if (req.method === 'PUT') {
          const body = JSON.parse(raw.toString())
          assert.ok(Object.keys(body).every((key) => ['fullName', 'phone', 'address'].includes(key)))
          profile = { ...profile, ...body, version: profile.version + 1, updatedAt: new Date().toISOString() }
        }
        return success(profile)
      }
      if (path.endsWith('/kyc/document')) return success({ url: origin + '/document.png', expiresIn: 2 })
      if (path === '/api/users/kyc/documents' && req.method === 'POST') {
        const request = new Request(origin + path, { method: 'POST', headers: { 'Content-Type': req.headers['content-type'] }, body: raw })
        const form = await request.formData()
        assert.deepEqual([...form.keys()].sort(), ['back', 'front', 'idNumber'])
        assert.equal(form.get('front').type, 'image/png')
        assert.equal(form.get('back').type, 'image/png')
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
  const input = await cdp('DOM.querySelector', { nodeId: doc.root.nodeId, selector: '#kyc-front' })
  await cdp('DOM.setFileInputFiles', { nodeId: input.nodeId, files: [filePath] })
  await until(() => has('img[alt="Xem trước mặt trước"]'), 'front preview')
  await click('Gửi xác thực')
  await until(() => text('Vui lòng chọn ảnh giấy tờ.'), 'missing back validation')
  assert.equal(uploads, 0)
  const backInput = await cdp('DOM.querySelector', { nodeId: doc.root.nodeId, selector: '#kyc-back' })
  await cdp('DOM.setFileInputFiles', { nodeId: backInput.nodeId, files: [filePath] })
  await until(() => has('img[alt="Xem trước mặt sau"]'), 'back preview')
  await fill('#profile-fullName', 'Tên đang soạn chưa lưu')
  await click('Gửi xác thực', 2)
  await until(() => text('Đang chờ duyệt'), 'KYC submitted')
  assert.equal(uploads, 1)
  assert.equal(await evaluate('document.querySelector("#profile-fullName").value'), 'Tên đang soạn chưa lưu')
  assert.equal(await evaluate('!!document.querySelector("#kyc-front")'), false)
  await click('Xem giấy tờ đã gửi')
  await until(() => has('img[alt="Giấy tờ xác thực đã gửi"]'), 'saved document')
  await until(() => text('Liên kết xem ảnh đã hết hạn.'), 'signed URL expiry')
  profile = { ...profile, kycStatus: 'APPROVED', kycTier: 1, version: profile.version + 1 }
  await click('Tải lại trạng thái')
  await until(() => text('Đã xác thực'), 'KYC approval')
  assert.ok(await text('Cấp 1'))
  await screenshot('profile-desktop')
  profile = { ...profile, kycStatus: 'REJECTED', kycTier: 0, version: profile.version + 1 }
  await go('/profile')
  await until(() => evaluate('!!document.querySelector("#kyc-front")'), 'rejected resubmission form')
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

  // H11: exact lookup, no recipient wallet reads, stale request cancellation,
  // server cooldown and recipient confirmation before using the existing transfer API.
  await go('/wallet')
  await until(() => text('Chuyển khoản'), 'wallet page')
  await click('Chuyển khoản')
  await until(() => has('dialog[open] #transfer-recipient'), 'transfer dialog')
  assert.equal(await evaluate('document.querySelector("#transfer-confirm").disabled'), true)
  const canTransfer = () => evaluate('[...document.querySelectorAll("dialog button")].find(b => b.textContent.trim() === "Xác nhận chuyển")?.disabled === false')
  assert.equal(await canTransfer(), false)
  await fill('#transfer-recipient', 'partial')
  await click('Tra cứu')
  await until(() => text('Vui lòng nhập email đầy đủ'), 'invalid query')
  assert.equal(lookupQueries.length, 0)
  await fill('#transfer-recipient', 'Binh+wallet@Example.com')
  assert.equal(lookupQueries.length, 0, 'typing never consumes lookups')
  await click('Tra cứu', 2)
  await until(() => text('Nguyễn V. B.'), 'email lookup')
  assert.deepEqual(lookupQueries, ['Binh+wallet@Example.com'])
  assert.equal(await text(recipientId), false, 'auth ID is not displayed')
  assert.equal(await canTransfer(), false)
  await evaluate('document.querySelector("#transfer-confirm").click()')
  assert.equal(await canTransfer(), true)
  await fill('#transfer-amount', '100000')
  assert.equal(await canTransfer(), false, 'changed amount requires confirmation again')
  await fill('#transfer-recipient', 'slow@example.com')
  assert.equal(await text('Nguyễn V. B.'), false, 'editing discards the previous recipient')
  await click('Tra cứu')
  await until(() => lookupQueries.includes('slow@example.com'), 'slow lookup started')
  await fill('#transfer-recipient', '+84 912 345 678')
  await click('Tra cứu')
  await until(() => text('Nguyễn V. B.'), 'exact phone lookup')
  await delay(450)
  assert.equal(await text('Phản hồi cũ'), false, 'late response cannot replace selection')
  await screenshot('recipient-lookup-mobile')
  assert.equal(await evaluate('document.querySelector("dialog").scrollWidth <= document.querySelector("dialog").clientWidth'), true)

  const missingMessage = 'Không tìm thấy người nhận phù hợp. Vui lòng kiểm tra lại email hoặc số điện thoại.'
  for (const query of ['missing@example.com', user.email]) {
    await fill('#transfer-recipient', query)
    await click('Tra cứu')
    await until(() => text(missingMessage), 'generic not-found response')
    assert.equal(await canTransfer(), false)
  }
  await fill('#transfer-recipient', 'server@example.com')
  await click('Tra cứu')
  await until(() => text('Không thể hoàn tất thao tác.'), 'lookup server error')
  assert.equal(await canTransfer(), false)
  await fill('#transfer-recipient', 'limit@example.com')
  await click('Tra cứu')
  await until(() => text('Bạn đã tra cứu quá nhiều lần.'), 'lookup rate limit')
  const beforeCooldown = lookupQueries.length
  await evaluate('document.querySelector(\'button[aria-label="Đóng chuyển tiền"]\').click()')
  await click('Chuyển khoản')
  await until(() => has('#transfer-recipient'), 'reopened dialog')
  await fill('#transfer-recipient', 'Binh+wallet@Example.com')
  assert.equal(await evaluate('[...document.querySelectorAll("dialog button")].find(b => b.textContent.trim() === "Tra cứu").disabled'), true)
  await click('Tra cứu')
  assert.equal(lookupQueries.length, beforeCooldown, 'close/reopen cannot reset cooldown')
  await until(() => evaluate('[...document.querySelectorAll("dialog button")].find(b => b.textContent.trim() === "Tra cứu").disabled === false'), 'Retry-After elapsed')
  await click('Tra cứu')
  await until(() => text('Nguyễn V. B.'), 'lookup after cooldown')
  await evaluate('document.querySelector("#transfer-confirm").click()')
  uncertainTransfer = true
  await click('Xác nhận chuyển', 2)
  await until(() => text('Chưa xác định được kết quả chuyển tiền.'), 'uncertain transfer')
  assert.equal(transfers.length, 1)
  assert.equal(await evaluate('document.querySelector("#transfer-recipient").disabled'), true)
  assert.equal(await evaluate('document.querySelector("#transfer-amount").disabled'), true)
  uncertainTransfer = false
  await click('Thử lại giao dịch này', 2)
  await until(() => evaluate('!document.querySelector("dialog[open]")'), 'transfer success')
  assert.equal(transfers.length, 2)
  assert.deepEqual(transfers[0], transfers[1], 'retry reuses same recipient/amount/reference')
  await click('Chuyển khoản')
  await until(() => has('#transfer-recipient'), 'new transfer dialog')
  assert.equal(await evaluate('document.querySelector("#transfer-recipient").value'), '')
  assert.equal(await canTransfer(), false)
  await evaluate('document.querySelector(\'button[aria-label="Đóng chuyển tiền"]\').click()')

  // Regressions for routes and shared auth after merging the Admin/Notification modules.
  assert.ok(await has('button[aria-label="Thông báo"]'))
  await go('/merchant/register')
  await until(() => evaluate('location.pathname === "/merchant-register"'), 'incoming merchant route alias')
  await until(() => text('Cửa hàng Hữu'), 'alias loads existing merchant')
  await go('/transactions')
  await until(() => text('payment01'), 'incoming transactions page loads array response')
  assert.equal(await evaluate('document.querySelectorAll("tbody tr").length'), 10)
  await evaluate('document.querySelector(\'button[aria-label="Trang sau"]\').click()')
  await until(() => text('payment11'), 'transaction next page')
  assert.equal(await evaluate('document.querySelectorAll("tbody tr").length'), 2)
  assert.equal(await evaluate('document.querySelector(\'button[aria-label="Trang sau"]\').disabled'), true)
  await fill('input[placeholder="Tìm kiếm giao dịch..."]', 'payment03')
  await until(() => text('payment03'), 'transaction filter clamps the page')
  assert.equal(await evaluate('document.querySelectorAll("tbody tr").length'), 1)
  const adminRequestsBefore = requests.filter((request) => request.includes('/api/admin/')).length
  await go('/admin/kyc')
  await until(() => evaluate('location.pathname === "/"'), 'ordinary user cannot mount admin pages')
  assert.equal(requests.filter((request) => request.includes('/api/admin/')).length, adminRequestsBefore)
  signedIn = false
  await go('/admin/kyc')
  await until(() => evaluate('location.pathname === "/signin"'), 'guest admin route requires login')
  user.role = 'ADMIN'
  signedIn = true
  profile = { ...profile, kycStatus: 'PENDING', kycTier: 0 }
  await go('/admin/kyc')
  await until(() => text('Phê duyệt Định danh KYC'), 'admin route restores session before checking role')
  await until(() => requests.includes('GET /api/admin/kyc'), 'admin page calls incoming API module')

  await until(() => has('tbody tr button'), 'KYC list loaded')
  assert.equal(await text('B1234567'), false, 'full ID number is masked')
  assert.equal(await text('Nâng cấp 2'), false, 'pending KYC cannot change tier')
  await click('Duyệt')
  await click('Xác nhận cập nhật')
  await until(() => text('Vui lòng nhập lý do từ 1 đến 500 ký tự.'), 'admin reason required')
  assert.equal(adminWrites, 0)
  await click('Xem hai mặt CCCD', 2)
  await until(() => has('img[alt="CCCD mặt trước"]'), 'admin front image')
  assert.ok(await has('img[alt="CCCD mặt sau"]'))
  assert.equal(documentReads, 1, 'duplicate image clicks issue one audited request')
  assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true)
  await screenshot('admin-kyc-mobile')
  await until(() => text('Liên kết xem ảnh đã hết hạn. Vui lòng tải lại ảnh.'), 'admin URL expiry')
  assert.equal(await has('img[alt="CCCD mặt trước"]'), false)
  assert.equal(await has('img[alt="CCCD mặt sau"]'), false)
  failDocuments = true
  await click('Xem hai mặt CCCD')
  await until(() => text('Hồ sơ chưa có đủ hai mặt giấy tờ.'), 'missing documents feedback')
  failDocuments = false
  await click('Xem hai mặt CCCD')
  await until(() => has('img[alt="CCCD mặt sau"]'), 'document retry')
  await fill('#kyc-reason', 'Hồ sơ hợp lệ')
  await click('Xác nhận cập nhật', 2)
  await until(() => text('Nâng cấp 2'), 'approval refreshes list')
  assert.equal(adminWrites, 1)
  assert.equal(profile.kycTier, 1)
  assert.ok(await text('Cấp 1'))
  assert.equal(await evaluate('[...document.querySelectorAll("tbody button")].find(b => b.textContent.trim() === "Duyệt").disabled'), true)

  await click('Nâng cấp 2')
  assert.ok(await text('mô phỏng liên kết ngân hàng'))
  await fill('#kyc-reason', 'Đã mô phỏng liên kết ngân hàng')
  await click('Xác nhận cập nhật', 2)
  await until(() => text('Đưa về cấp 1'), 'tier 2 refreshes list')
  assert.equal(profile.kycTier, 2)
  assert.equal(adminWrites, 2)
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
  await click('Đưa về cấp 1')
  await fill('#kyc-reason', 'Điều chỉnh về cấp 1')
  await screenshot('admin-kyc-desktop')
  failAdminWrite = true
  await click('Xác nhận cập nhật')
  await until(() => text('Chưa xác định được kết quả.'), 'uncertain mutation error')
  assert.equal(adminWrites, 3)
  assert.equal(profile.kycTier, 2)
  assert.equal(await has('button[type="submit"]:not(:disabled)'), false, 'uncertain update blocks further submissions')
  failAdminWrite = false
  await click('Tải lại danh sách')
  await until(() => text('Đưa về cấp 1'), 'reload after uncertain mutation')
  await click('Đưa về cấp 1')
  await fill('#kyc-reason', 'Đã đối chiếu hồ sơ; đưa về cấp 1')
  await click('Xác nhận cập nhật')
  await until(() => text('Nâng cấp 2'), 'tier downgrade succeeds')
  assert.equal(profile.kycTier, 1)
  await click('Từ chối')
  assert.ok(await text('đưa cấp KYC về 0'))
  await fill('#kyc-reason', 'Giấy tờ cần xác minh lại')
  await click('Xác nhận cập nhật')
  await until(() => evaluate('!document.querySelector("#kyc-reason")'), 'rejection refreshes list')
  assert.equal(profile.kycTier, 0)
  assert.equal(profile.kycStatus, 'REJECTED')
  assert.equal(await text('Nâng cấp 2'), false)
  assert.equal(await evaluate('[...document.querySelectorAll("tbody button")].find(b => b.textContent.trim() === "Duyệt").disabled'), true)
  assert.equal(await evaluate('[...document.querySelectorAll("tbody button")].find(b => b.textContent.trim() === "Từ chối").disabled'), true)

  await fill('#kyc-search', 'no-match')
  await click('Tìm kiếm')
  await until(() => text('Không có hồ sơ phù hợp.'), 'filtered empty state')
  await fill('#kyc-search', '')
  await click('Tìm kiếm')
  await until(() => has('tbody tr button'), 'search reset')
  failAdminList = true
  await click('Làm mới')
  await until(() => text('Thử tải lại'), 'admin list failure')
  assert.equal(await has('tbody'), false, 'stale rows cannot be acted on after reload fails')
  failAdminList = false
  await click('Thử tải lại')
  await until(() => has('tbody tr button'), 'admin list retry')

  assert.deepEqual(runtimeErrors, [])
  assert.ok(!requests.some((request) => request.includes('/user/me')))
  console.log('PASS: profile; H8 two-sided KYC; H11 email/phone lookup, generic 404, 429 cooldown/reopen, stale response cancellation, explicit confirmation and idempotent transfer retry; merchant; login/roles; Admin KYC; mobile overflow; no runtime exceptions.')
  console.log('API fixtures only. Screenshots: ' + artifacts)
} finally {
  if (cdp) await Promise.race([cdp('Browser.close').catch(() => {}), delay(1000)])
  socket?.close()
  browser.kill()
  server.closeAllConnections()
  await new Promise((done) => server.close(done))
}
