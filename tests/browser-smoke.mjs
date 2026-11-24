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
const artifacts = resolve(root, process.env.BROWSER_EVIDENCE_DIR || 'node_modules/.tmp/browser-smoke')
const runtime = resolve(root, 'node_modules/.tmp/profile-browser')
mkdirSync(artifacts, { recursive: true }); mkdirSync(runtime, { recursive: true })
assert.ok(existsSync(resolve(dist, 'index.html')), 'Build the current frontend first')
let user = { id: '10000000-0000-4000-8000-000000000001', username: 'synthetic', email: 'synthetic@example.test', role: 'USER' }
let profile = { id: '20000000-0000-4000-8000-000000000001', authUserId: user.id, email: user.email, fullName: 'Người dùng tổng hợp', phone: null, address: null, kycStatus: 'NONE', kycTier: 0, idNumber: null, hasKycDocument: false, version: 0, updatedAt: new Date().toISOString(), createdAt: new Date().toISOString() }
let signedIn = true
let failProfile = false
let merchant = null
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
let uncertainTransfer = true
let confirmations = 0
let paymentReads = 0
let pinVerifications = 0
const ledgerCursors = []
const fixtureErrors = []
let refreshes = 0
const requests = []
const checks = []
const regressions = []
const record = (condition, message) => { if (!condition) regressions.push(message) }
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
      requests.push(req.method + ' ' + path)
      const chunks = []; for await (const chunk of req) chunks.push(chunk)
      const raw = Buffer.concat(chunks)
      if (path === '/api/auth/refresh') {
        refreshes += 1
        return signedIn ? success({ user, accessToken: 'synthetic-fixture-token' }) : failure(401, 'UNAUTHORIZED')
      }
      if (path === '/api/auth/signin') {
        const body = JSON.parse(raw.toString())
        if (body.password !== 'password') return failure(401, 'INVALID_CREDENTIALS')
        signedIn = true
        return success({ user, accessToken: 'synthetic-fixture-token' })
      }
      if (path === '/api/auth/signout') { signedIn = false; return success(null) }
      if (!signedIn || req.headers.authorization !== 'Bearer synthetic-fixture-token') return failure(401, 'UNAUTHORIZED')
      if (path === '/api/users/lookup') {
        const query = new URL(req.url, 'http://localhost').searchParams.get('q')
        lookupQueries.push(query)
        if (query === 'slow@example.com') { await delay(350); return success({ authUserId: recipientId, maskedName: 'Phản hồi cũ' }) }
        if (query === 'limit@example.com') { res.setHeader('Retry-After', '2'); return failure(429, 'RATE_LIMIT_EXCEEDED') }
        if (query === 'unavailable@example.com') return failure(503, 'SERVICE_UNAVAILABLE')
        if (query === 'server@example.com') return failure(500, 'INTERNAL_SERVER_ERROR')
        if (!['Binh+wallet@Example.com', '+84 912 345 678'].includes(query)) return failure(404, 'RECIPIENT_NOT_FOUND')
        return success({ authUserId: recipientId, maskedName: 'Nguyễn V. B.' })
      }
      if (path === '/api/wallets/me/ledger') {
        const cursor = new URL(req.url, origin).searchParams.get('cursor')
        ledgerCursors.push(cursor)
        assert.ok(cursor === null || cursor === 'page-two', 'Unexpected ledger cursor')
        const start = cursor ? 10 : 0
        return success({ items: Array.from({ length: cursor ? 2 : 10 }, (_, offset) => ({
          id: 'ledger' + String(start + offset + 1).padStart(2, '0'),
          walletId: 'fixture-wallet', direction: 'DEBIT', amount: '10000', balanceAfter: '100000',
          transferType: 'TRANSFER', referenceId: 'payment' + String(start + offset + 1).padStart(2, '0'),
          createdAt: new Date().toISOString()
        })), nextCursor: cursor ? null : 'page-two' })
      }
      if (path === '/api/payments/p2p/quote') {
        const body = JSON.parse(raw.toString())
        assert.equal(body.destinationUserId, recipientId)
        assert.equal(body.amount, '100000')
        return success({ amount: body.amount, fee: 0, expiresAt: new Date(Date.now() + 60000).toISOString() })
      }
      if (path === '/api/payments/p2p/checkout') {
        const body = JSON.parse(raw.toString())
        assert.equal(body.destinationUserId, recipientId)
        assert.equal(body.amount, '100000')
        assert.match(req.headers['idempotency-key'] ?? '', /^[0-9a-f-]{36}$/i)
        transfers.push({ body, key: req.headers['idempotency-key'] })
        await delay(100)
        if (uncertainTransfer) return failure(503, 'UNAVAILABLE')
        return success({ paymentId: 'fixture-payment', status: 'PENDING', holdExpiresAt: new Date(Date.now() + 300000).toISOString() })
      }
      if (path === '/api/auth/pin/verify') {
        pinVerifications++
        assert.deepEqual(JSON.parse(raw.toString()), { pin: '111111', paymentId: 'fixture-payment', amount: '100000' })
        return success({ transactionToken: 'fixture-single-use', expiresIn: 60 })
      }
      if (path === '/api/payments/fixture-payment/confirm') {
        confirmations++
        assert.equal(req.headers['x-transaction-token'], 'fixture-single-use')
        // The server committed, but its response was lost: UI must reconcile with GET.
        return failure(504, 'GATEWAY_TIMEOUT')
      }
      if (path === '/api/payments/fixture-payment') {
        paymentReads++
        return success({ id: 'fixture-payment', userId: user.id, status: 'SUCCESS', amount: '100000', fee: '0',
          note: 'Synthetic reconciled transfer', createdAt: new Date().toISOString() })
      }
      if (path.startsWith('/api/notifications')) return success({ notifications: [], unreadCount: 0, pagination: { totalPages: 1 } })
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
          documentReads += 1
          if (failDocuments) return failure(404, 'KYC_DOCUMENTS_INCOMPLETE')
          return success({ frontUrl: origin + '/synthetic-document.png?front', backUrl: origin + '/synthetic-document.png?back', expiresAt: new Date(Date.now() + 2000).toISOString() })
        }
        adminWrites += 1
        const body = JSON.parse(raw.toString())
        if (failAdminWrite) return failure(503, 'KYC_OUTCOME_UNKNOWN')
        if (path.endsWith('/tier')) {
          profile = { ...profile, kycTier: body.tier }
        } else {
          profile = { ...profile, kycStatus: body.status, kycTier: body.status === 'APPROVED' ? 1 : 0 }
        }
        return success(profile)
      }
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
        assert.equal(body.get('idNumber'), 'B1234567')
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
      if (path === '/api/merchants/me') return merchantFailure ? failure(500, 'INTERNAL_SERVER_ERROR') : success(merchant)
      if (path === '/api/merchants/register') {
        registrations += 1
        if (merchant) return failure(409, 'DUPLICATE_RESOURCE')
        const body = JSON.parse(raw.toString())
        merchant = {
          ...body,
          id: '30000000-0000-4000-8000-000000000001',
          ownerId: user.id,
          taxId: body.taxId ?? null,
          bankAccount: body.bankAccount ?? null,
          status: 'PENDING',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        return success(merchant)
      }
      if (path === '/api/wallets/me' || /^\/api\/wallets\/[^/]+\/balance$/.test(path)) return success({ availableBalance: '100000', balance: '100000', heldBalance: '0', currency: 'VND', status: 'ACTIVE' })
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
  } catch (error) { fixtureErrors.push(error.message); failure(500, 'FIXTURE_ASSERTION_FAILED') }
})
let browser
try {
  await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen))
  const address = server.address()
  assert.ok(address && typeof address !== 'string')
  origin = 'http://127.0.0.1:' + address.port
  browser = await openBrowser(runtime, 'profile', origin)
  const { cdp, evaluate, has, text, fill, click, go, screenshot } = browser
  const runtimeErrors = browser.errors
  const filePath = imagePath
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1280, height: 1000, deviceScaleFactor: 1, mobile: false })

  signedIn = false
  await go('/')
  await until(() => text('Đăng nhập để xem'), 'public HomeLanding')
  assert.equal(await text('Chủ tài khoản: An Nguyễn'), false)
  assert.equal(await text('1.250.000 ₫'), false)
  checks.push('Public HomeLanding renders without fabricated account identity or balance')
  signedIn = true
  await go('/app/profile')
  await until(() => evaluate('!!document.querySelector("#profile-email")'), 'profile load')
  assert.equal(await evaluate('document.querySelector("#profile-email").readOnly'), true)
  await fill('#profile-phone', '+84 912 345 678')
  await click('Lưu thông tin')
  await until(() => profile.phone === '+84 912 345 678', 'profile save')
  await go('/app/profile')
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
  await browser.upload('#kyc-back', imagePath)
  await browser.fill('#profile-fullName', 'Bản nháp chưa lưu')
  await browser.click('Gửi xác thực', 2)
  await until(() => browser.text('Đang chờ xét duyệt'), 'backend PENDING after HTTP multipart')
  assert.equal(uploads, 1)
  assert.equal(await evaluate('document.querySelector("#profile-fullName").value'), 'Bản nháp chưa lưu')
  assert.equal(await evaluate('!!document.querySelector("#kyc-front")'), false)
  await click('Xem giấy tờ đã gửi')
  await until(() => has('img[alt="Giấy tờ xác thực đã gửi"]'), 'saved document')
  await until(() => text('Liên kết xem ảnh đã hết hạn.'), 'signed URL expiry')
  profile = { ...profile, kycStatus: 'APPROVED', kycTier: 1, version: profile.version + 1 }
  await click('Tải lại trạng thái')
  await until(() => text('Đã được xác thực'), 'KYC approval')
  assert.ok(await text('Cấp xác thực: 1'))
  await screenshot('profile-desktop')
  profile = { ...profile, kycStatus: 'REJECTED', kycTier: 0, version: profile.version + 1 }
  await go('/app/profile')
  await until(() => evaluate('!!document.querySelector("#kyc-front")'), 'rejected resubmission form')
  await cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true)
  await screenshot('profile-mobile')

  merchantFailure = true
  await go('/merchant/register')
  await until(() => text('Thử lại'), 'merchant load failure')
  assert.equal(await evaluate('!!document.querySelector("#merchant-businessName")'), false)
  merchantFailure = false
  await click('Thử lại')
  await until(() => evaluate('!!document.querySelector("#merchant-businessName")'), 'merchant empty state')
  await click('Gửi đăng ký đối tác')
  await until(() => text('Vui lòng nhập tên thương hiệu.'), 'merchant validation')
  assert.equal(registrations, 0)
  await fill('#merchant-businessName', 'Cửa hàng Hữu')
  await click('Gửi đăng ký đối tác', 2)
  await until(() => text('Đang chờ duyệt'), 'merchant registered')
  assert.equal(registrations, 1)
  await go('/merchant/register')
  await until(() => text('Cửa hàng Hữu'), 'merchant persists after reload')
  assert.equal(await evaluate('!!document.querySelector("#merchant-businessName")'), false)
  merchant.status = 'APPROVED'
  await click('Tải lại trạng thái')
  await until(() => text('Đã được phê duyệt'), 'merchant approval')
  await screenshot('merchant-mobile')

  signedIn = false
  await go('/app/profile')
  await until(() => evaluate('location.pathname === "/sign-in"'), 'protected redirect')
  await until(() => evaluate('!!document.querySelector("#username")'), 'signin form')
  await fill('#username', 'demo')
  await fill('#password', 'incorrect')
  await evaluate('document.querySelector("form").requestSubmit()')
  await until(() => text('Tên đăng nhập hoặc mật khẩu không đúng.'), 'failed login message')
  assert.equal(await evaluate('location.pathname'), '/sign-in')
  await fill('#password', 'password')
  await evaluate('document.querySelector("form").requestSubmit()')
  await until(() => evaluate('!!document.querySelector("#profile-email")'), 'login returns to profile')

  // Current P2P page: lookup -> quote -> idempotent checkout -> PIN -> confirm -> GET reconciliation.
  await go('/app/transfer')
  await until(() => has('#recipient'), 'transfer page')
  const canContinue = () => evaluate('[...document.querySelectorAll("button")].find(b => b.textContent.trim() === "Tiếp tục kiểm tra")?.disabled === false')
  assert.equal(await canContinue(), false)
  await fill('#recipient', 'partial')
  await click('Kiểm tra')
  await until(() => text('Vui lòng nhập email đầy đủ'), 'invalid query')
  assert.equal(lookupQueries.length, 0)
  await fill('#recipient', 'Binh+wallet@Example.com')
  assert.equal(lookupQueries.length, 0, 'typing never consumes lookups')
  await click('Kiểm tra', 2)
  await until(() => text('Nguyễn V. B.'), 'email lookup')
  assert.deepEqual(lookupQueries, ['Binh+wallet@Example.com'])
  assert.equal(await text(recipientId), false, 'auth ID is not displayed')
  await fill('#recipient', 'slow@example.com')
  await click('Kiểm tra')
  await until(() => lookupQueries.includes('slow@example.com'), 'slow lookup started')
  await fill('#recipient', '+84 912 345 678')
  await click('Kiểm tra')
  await until(() => text('Nguyễn V. B.'), 'exact phone lookup')
  await delay(450)
  assert.equal(await text('Phản hồi cũ'), false, 'late response cannot replace selection')
  await screenshot('recipient-lookup-mobile')
  assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true)
  const missingMessage = 'Không tìm thấy người nhận phù hợp. Vui lòng kiểm tra lại email hoặc số điện thoại.'
  for (const query of ['missing@example.com', user.email]) {
    await fill('#recipient', query)
    await click('Kiểm tra')
    await until(() => text(missingMessage), 'generic not-found response')
    assert.equal(await canContinue(), false)
  }
  await fill('#recipient', 'unavailable@example.com')
  await click('Kiểm tra')
  await until(() => has('[class*="bg-rose-500"]'), '503 feedback rendered')
  record(!await text('Request failed with status code 503'), 'Lookup SERVICE_UNAVAILABLE/503 exposes raw Axios English instead of a Vietnamese message')
  await fill('#recipient', 'server@example.com')
  await click('Kiểm tra')
  await until(() => text('Máy chủ đang gặp sự cố. Vui lòng thử lại sau.'), 'lookup server error')
  assert.equal(await canContinue(), false)
  await fill('#recipient', 'limit@example.com')
  await click('Kiểm tra')
  await until(() => text('Bạn đang thao tác quá nhanh.'), 'lookup rate limit')
  const beforeCooldown = lookupQueries.length
  // Client navigation remounts the page without clearing the per-user in-memory cooldown.
  await evaluate('history.pushState({}, "", "/app"); dispatchEvent(new PopStateEvent("popstate"))')
  await until(() => has('a[href="/app/transfer"]'), 'dashboard navigation')
  await evaluate(`document.querySelector('a[href="/app/transfer"]').click()`)
  await until(() => has('#recipient'), 'reopened transfer page')
  await fill('#recipient', 'Binh+wallet@Example.com')
  await click('Kiểm tra')
  assert.equal(lookupQueries.length, beforeCooldown, 'navigation cannot reset cooldown')
  await until(() => evaluate('[...document.querySelectorAll("button")].find(b => b.textContent.trim() === "Kiểm tra").disabled === false'), 'Retry-After elapsed')
  await click('Kiểm tra')
  await until(() => text('Nguyễn V. B.'), 'lookup after cooldown')
  await fill('input[aria-label="Số tiền chuyển (VND)"]', '100000')
  await click('Tiếp tục kiểm tra', 2)
  await until(() => text('Xác nhận báo giá chuyển tiền'), 'quote review')
  assert.equal(transfers.length, 0, 'quote does not create a hold')
  await click('Xác nhận chuyển tiền', 2)
  await until(() => text('Chưa xác định được kết quả tạo giao dịch.'), 'uncertain checkout')
  assert.equal(transfers.length, 1, 'double click creates one request')
  assert.equal(await evaluate('[...document.querySelectorAll("button")].find(b => b.textContent.trim() === "Quay lại sửa").disabled'), true)
  uncertainTransfer = false
  await click('Xác nhận chuyển tiền', 2)
  await until(() => has('[role="dialog"]'), 'PIN challenge')
  assert.equal(transfers.length, 2)
  assert.deepEqual(transfers[0], transfers[1], 'retry reuses identical body and idempotency key')
  for (let digit = 0; digit < 6; digit++) await click('1')
  await until(() => text('Chuyển tiền thành công!'), 'confirm timeout reconciles to receipt')
  assert.equal(pinVerifications, 1)
  assert.equal(confirmations, 1, 'single-use token is never replayed')
  assert.equal(paymentReads, 1)
  assert.equal(await has('[role="dialog"]'), false)
  checks.push('P2P: exact lookup, stale cancellation, cooldown/navigation, quote, checkout retry/same key, PIN binding, confirm timeout/GET reconciliation')

  await go('/merchant/register')
  await until(() => text('Cửa hàng Hữu'), 'loads existing merchant')
  ledgerCursors.length = 0 // Exclude the earlier Dashboard ledger request.
  await go('/app/transactions')
  await until(() => text('payment01'), 'ledger first page')
  assert.equal(await evaluate('document.querySelectorAll("tbody tr").length'), 10)
  await click('Tải thêm giao dịch')
  await until(() => text('payment12'), 'cursor next page')
  assert.equal(await evaluate('document.querySelectorAll("tbody tr").length'), 12)
  assert.equal(await text('Tải thêm giao dịch'), false)
  assert.deepEqual(ledgerCursors, [null, 'page-two'])
  await fill('input[placeholder="Tìm nội dung, mã bút toán..."]', 'payment03')
  await until(() => evaluate('document.querySelectorAll("tbody tr").length === 1'), 'ledger local search')
  assert.ok(await text('payment03'))
  checks.push('Ledger: cursor forwarded, pages appended, end reached, local search')
  const adminRequestsBefore = requests.filter((request) => request.includes('/api/admin/')).length
  await go('/admin/kyc')
  await until(() => evaluate('location.pathname === "/403"'), 'ordinary user cannot mount admin pages')
  assert.equal(requests.filter((request) => request.includes('/api/admin/')).length, adminRequestsBefore)
  signedIn = false
  await go('/admin/kyc')
  await until(() => evaluate('location.pathname === "/sign-in"'), 'guest admin route requires login')
  user.role = 'ADMIN'
  signedIn = true
  profile = { ...profile, kycStatus: 'PENDING', kycTier: 0 }
  await go('/admin/kyc')
  const selectAction = async (label) => {
    // Status filters and review actions may share the same caption. Select the detail action.
    await evaluate(`[...document.querySelectorAll('button')].filter(button => button.textContent.trim() === ${JSON.stringify(label)}).at(-1).click()`)
    await until(() => has('#kyc-action-reason'), 'admin action form: ' + label)
  }
  await until(() => text('Phê duyệt Định danh Khách hàng'), 'admin session restored before role check')
  await until(() => requests.includes('GET /api/admin/kyc'), 'admin API module')
  await click('Tất cả')
  await until(() => text('Mã hồ sơ:'), 'selected KYC profile')
  assert.equal(await text('B1234567'), false, 'ID number masked by default')
  await selectAction('Từ chối')
  await click('Xác nhận')
  await until(() => text('Vui lòng nhập lý do từ chối'), 'rejection requires reason')
  assert.equal(adminWrites, 0)
  await click('Hủy')
  await click('Xem hai mặt CCCD')
  await until(() => has('img[alt="CCCD mặt trước"]'), 'admin front image')
  assert.ok(await has('img[alt="CCCD mặt sau"]'))
  assert.equal(documentReads, 1)
  assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true)
  await screenshot('admin-kyc-mobile')
  await delay(2300)
  record(!await has('img[alt="CCCD mặt trước"]') && !await has('img[alt="CCCD mặt sau"]'), 'Admin KYC signed images remain in the DOM after their expiresAt deadline')
  await selectAction('Duyệt')
  // Approval notes are optional in the current contract; rejection reasons are required.
  const beforeApprove = adminWrites
  await click('Xác nhận', 2)
  await until(async () => profile.kycStatus === 'APPROVED' && await evaluate('!document.querySelector("#kyc-action-reason")'), 'approval refresh')
  record(adminWrites === beforeApprove + 1, 'Admin approval double click sends duplicate mutations')
  await until(() => text('Cấp 1'), 'approval tier')
  assert.equal(profile.kycTier, 1)
  assert.equal(await evaluate('[...document.querySelectorAll("button")].find(b => b.textContent.trim() === "Duyệt").disabled'), true)
  await selectAction('Nâng Cấp 2')
  await click('Xác nhận')
  await until(() => text('Vui lòng nhập lý do đổi cấp'), 'tier reason required')
  await fill('#kyc-action-reason', 'Đã mô phỏng liên kết ngân hàng')
  const beforeTier = adminWrites
  await click('Xác nhận', 2)
  await until(() => profile.kycTier === 2, 'tier upgrade')
  await until(() => evaluate('!document.querySelector("#kyc-action-reason")'), 'tier form reset')
  record(adminWrites === beforeTier + 1, 'Admin tier double click sends duplicate mutations')
  await cdp('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false })
  await screenshot('admin-kyc-desktop')
  await selectAction('Đặt Cấp 1')
  await fill('#kyc-action-reason', 'Điều chỉnh về cấp 1')
  failAdminWrite = true
  await click('Xác nhận')
  await until(() => evaluate('!!document.querySelector("[role=alert]")'), 'uncertain mutation feedback')
  assert.equal(profile.kycTier, 2, 'failed mutation cannot change fixture state')
  record(await evaluate('document.querySelector("#kyc-action-reason")?.disabled === true'), 'Admin unknown mutation result leaves the form editable and permits a new submit')
  record(!await text('Request failed with status code 503'), 'Admin KYC_OUTCOME_UNKNOWN/503 exposes raw Axios English')
  failAdminWrite = false
  await go('/admin/kyc')
  await until(() => text('Phê duyệt Định danh Khách hàng'), 'reload admin')
  await click('Tất cả')
  await until(() => text('Mã hồ sơ:'), 'approved profile reloaded')
  await selectAction('Đặt Cấp 1')
  await fill('#kyc-action-reason', 'Đã đối chiếu hồ sơ; đưa về cấp 1')
  await click('Xác nhận')
  await until(() => profile.kycTier === 1, 'tier downgrade')
  await until(() => evaluate('!document.querySelector("#kyc-action-reason")'), 'downgrade settled')
  // Model a new pending submission before testing rejection (approved records cannot be rejected).
  profile = { ...profile, kycStatus: 'PENDING' }
  await go('/admin/kyc')
  await until(() => text('Mã hồ sơ:'), 'new pending submission')
  await selectAction('Từ chối')
  await fill('#kyc-action-reason', 'Giấy tờ cần xác minh lại')
  await click('Xác nhận')
  await until(() => profile.kycStatus === 'REJECTED', 'rejection')
  assert.equal(profile.kycTier, 0)
  await click('Tất cả')
  await until(() => text('Mã hồ sơ:'), 'rejected profile')
  await fill('input[placeholder="Tìm theo email, họ tên..."]', 'no-match')
  await click('Tìm')
  await until(() => text('Không có hồ sơ nào khớp bộ lọc hiện tại.'), 'filtered empty state')
  await fill('input[placeholder="Tìm theo email, họ tên..."]', '')
  await click('Tìm')
  await until(() => text('Mã hồ sơ:'), 'search reset')
  failAdminList = true
  await go('/admin/kyc')
  await until(() => text('Không thể tải dữ liệu'), 'admin list failure')
  assert.equal(await text('Mã hồ sơ:'), false, 'failed initial query cannot expose editable profiles')
  failAdminList = false
  await click('Thử lại')
  await until(() => text('Không có hồ sơ nào khớp bộ lọc hiện tại.'), 'list retry with pending filter')
  await click('Tất cả')
  await until(() => text('Mã hồ sơ:'), 'list retry succeeded')
  failDocuments = true
  await click('Xem hai mặt CCCD')
  await until(() => text('Không tìm thấy dữ liệu yêu cầu.'), 'missing documents feedback')
  failDocuments = false
  await click('Thử lại')
  await until(() => has('img[alt="CCCD mặt sau"]'), 'documents retry')
  checks.push('Admin current master/detail UI: rejection/tier validation, optional approval note, review/tier writes, image error/retry, search, list failure/retry; safety regressions recorded separately')
  assert.deepEqual(runtimeErrors, [])
  assert.ok(!requests.some((request) => request.includes('/user/me')))
  assert.deepEqual(fixtureErrors, [], 'No fixture assertions were swallowed by the HTTP server')
  checks.push('Profile/KYC two-sided upload and expiry; merchant registration; login/role guards; Admin KYC review/tier/error; mobile overflow; no runtime exceptions')
  assert.deepEqual(regressions, [], 'Application safety regressions detected')
  writeFileSync(resolve(artifacts, 'result.json'), JSON.stringify({ result: 'PASS', mode: 'synthetic-http-fixtures', testedAt: new Date().toISOString(), checks, requests }, null, 2))
  console.log('PASS: current frontend browser smoke against synthetic HTTP fixtures. Evidence: ' + artifacts)
} catch (error) {
  if (browser) await browser.screenshot('browser-smoke-failure').catch(() => {})
  writeFileSync(resolve(artifacts, 'result.json'), JSON.stringify({ result: 'FAIL', mode: 'synthetic-http-fixtures', error: error.message, checks, regressions, fixtureErrors, requests, runtimeErrors: browser?.errors }, null, 2))
  throw error
} finally {
  if (browser) await browser.close()
  server.closeAllConnections()
  if (server.listening) await new Promise((done) => server.close(done))
}
