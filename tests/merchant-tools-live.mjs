// Merchant production-browser acceptance: HTTP fixtures or an explicit isolated live Gateway.
import assert from 'node:assert/strict'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { QRCodeSVG } from 'qrcode.react'
import { createHash } from 'node:crypto'
import { randomUUID } from 'node:crypto'
import { createServer, request as proxyRequest } from 'node:http'
import { spawnSync, execFileSync } from 'node:child_process'
import { existsSync, readdirSync, mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs'
import { resolve, extname, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parseEnv } from 'node:util'
import { homedir } from 'node:os'
import { openBrowser, until } from './browser-support.mjs'
const root = fileURLToPath(new URL('../', import.meta.url))
const live = true
const artifacts = resolve(root, 'docs/evidence/huu-fe-phase6', live ? 'live' : 'browser')
const browserRuntime = resolve(root, 'node_modules/.tmp/merchant-tools-live')
mkdirSync(artifacts, { recursive: true }); mkdirSync(browserRuntime, { recursive: true })
const cache = resolve(homedir(), '.cache/ms-playwright')
const executable = process.env.BROWSER_PATH || (existsSync(cache) ? readdirSync(cache).filter(name => name.startsWith('chromium-')).flatMap(name => ['chrome-linux64/chrome', 'chrome-linux/chrome'].map(binary => resolve(cache, name, binary))).find(existsSync) : undefined)
assert.ok(executable, 'Install Chromium or provide BROWSER_PATH')
process.env.BROWSER_PATH = executable
const build = spawnSync('npm', ['run', 'build'], { cwd: root, env: { ...process.env, VITE_API_BASE_URL: '/api', VITE_USE_MOCK: 'false', VITE_VNPAY_PAYMENT_URL: '' }, stdio: 'inherit' })
assert.equal(build.status, 0, 'Production build')
const dist = resolve(root, 'dist')



const runFile = process.env.LIVE_ACCEPTANCE_RUN_FILE
assert.ok(runFile, 'Provide LIVE_ACCEPTANCE_RUN_FILE for an isolated local backend')
const run = JSON.parse(readFileSync(runFile, 'utf8'))
assert.match(run.project, /^finvault-acceptance-[0-9a-f]{12}$/)
const backend = resolve(root, '../PTPMHDV_Backend')
const directory = resolve(backend, '.cache/acceptance-week2', run.project)
assert.equal(resolve(runFile), resolve(directory, 'run.json'))
const gateway = new URL(run.gateway)
assert.ok(['127.0.0.1','localhost'].includes(gateway.hostname)); assert.equal(gateway.protocol, 'http:')
const config = parseEnv(readFileSync(resolve(directory, '.env'), 'utf8'))
const runtime = await import(pathToFileURL(resolve(backend, 'tests/acceptance/week2/runtime.mjs')).href)
const ctx = { project: run.project, directory, config, base: gateway.origin, requests: [], env: { ...process.env, ...config }, composeArgs: ['compose', '--project-directory', backend, '--env-file', resolve(directory, '.env'), '-p', run.project, '-f', resolve(backend, 'docker-compose.yml'), '-f', resolve(directory, 'compose.json')] }
const checks = [], requests = []
let qrPayload, browser, owner, other, admin, merchant, foreignOutlet
const brand = 'Điểm bán tổng hợp ' + randomUUID().slice(0,8)
const code = 'SYN-' + randomUUID().slice(0,8)
const api = (path, options) => runtime.call(ctx, path, options)
const server = createServer((req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname
  if (path.startsWith('/api/')) {
    const item = { method: req.method, path }; requests.push(item)
    const upstream = proxyRequest(new URL(req.url, gateway), { method: req.method, headers: { ...req.headers, host: gateway.host } }, response => {
      item.status = response.statusCode
      // QR is a public standee payload. Keep it only in RAM to compare the encoded SVG.
      if (path.endsWith('/qr') && response.statusCode === 200) {
        const chunks = []; response.on('data', chunk => chunks.push(chunk)); response.on('end', () => { qrPayload = JSON.parse(Buffer.concat(chunks).toString()).data })
      }
      res.writeHead(response.statusCode, response.headers); response.pipe(res)
    })
    upstream.on('error', () => { if (!res.headersSent) res.writeHead(502); res.end() }); req.pipe(upstream); return
  }
  const candidate = resolve(dist, '.' + decodeURIComponent(path))
  if (!candidate.startsWith(dist + sep) && candidate !== dist) { res.writeHead(403); return res.end() }
  const file = extname(path) && existsSync(candidate) ? candidate : resolve(dist, 'index.html')
  res.writeHead(200, { 'Content-Type': { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2' }[extname(file)] || 'application/octet-stream' }); res.end(readFileSync(file))
})
try {
  owner = await runtime.account(ctx, 'h06owner'); other = await runtime.account(ctx, 'h06other'); admin = await runtime.account(ctx, 'h06admin', undefined, 'ADMIN')
  merchant = (await api('/merchants/register', { method: 'POST', token: owner.token, body: { businessName: brand }, expected: 201 })).data
  const second = (await api('/merchants/register', { method: 'POST', token: other.token, body: { businessName: 'Đối tác B tổng hợp' }, expected: 201 })).data
  await api('/merchants/' + second.id + '/status', { method: 'PATCH', token: admin.token, body: { status: 'APPROVED' } })
  foreignOutlet = (await api('/merchants/' + second.id + '/outlets', { method: 'POST', token: other.token, body: { name: 'Điểm B', code: 'OTHER-' + code }, expected: 201 })).data
  await new Promise(done => server.listen(0, '127.0.0.1', done))
  browser = await openBrowser(browserRuntime, 'tools', 'http://localhost:' + server.address().port)
  await browser.go('/merchant')
  await until(() => browser.has('#username'), 'login'); await browser.fill('#username', owner.username); await browser.fill('#password', owner.password); await browser.click('Đăng nhập')
  await until(() => browser.text('Đang chờ duyệt'), 'PENDING')
  assert.equal(await browser.has('#outlet-name'), false)
  await api('/merchants/' + merchant.id + '/outlets', { method: 'POST', token: owner.token, body: { name: 'Blocked', code }, expected: 409 })
  await api('/merchants/' + merchant.id + '/api-keys', { method: 'POST', token: owner.token, body: {}, expected: 409 })
  await api('/merchants/' + merchant.id + '/outlets/' + foreignOutlet.id + '/qr', { token: owner.token, expected: 409 })
  await api('/merchants/' + merchant.id + '/status', { method: 'PATCH', token: admin.token, body: { status: 'REJECTED' } })
  await browser.click('Tải lại trạng thái'); await until(() => browser.text('Đăng ký bị từ chối'), 'REJECTED')
  await api('/merchants/' + merchant.id + '/outlets', { method: 'POST', token: owner.token, body: { name: 'Blocked', code }, expected: 409 })
  await api('/merchants/' + merchant.id + '/status', { method: 'PATCH', token: admin.token, body: { status: 'PENDING' } })
  await api('/merchants/' + merchant.id + '/status', { method: 'PATCH', token: admin.token, body: { status: 'APPROVED' } })
  // Ten initial outlets let the browser verify a second page after its own create.
  for (let i=0;i<10;i++) await api('/merchants/' + merchant.id + '/outlets', { method: 'POST', token: owner.token, body: { name: 'Điểm tổng hợp ' + i, code: code + '-' + i }, expected: 201 })
  const versionBefore = Number(runtime.sql(ctx, 'merchant_service', `SELECT version FROM merchants WHERE id='${merchant.id}'`))
  await browser.click('Tải lại trạng thái'); await until(() => browser.has('#outlet-name'), 'APPROVED tools')
  checks.push('M02 PENDING/REJECTED create is 409; APPROVED UI tools require server approval')
  await browser.fill('#outlet-name', 'Quầy tổng hợp'); await browser.fill('#outlet-code', code); await browser.click('Tạo điểm bán', 2)
  await until(() => browser.text('Máy chủ đã tiếp nhận điểm bán.'), 'UI outlet create')
  await until(() => browser.text('Xem QR ' + code), 'outlet list refresh')
  assert.equal(requests.filter(row => row.method === 'POST' && row.path === '/api/merchants/' + merchant.id + '/outlets').length, 1)
  const page = (await api('/merchants/' + merchant.id + '/outlets', { token: owner.token })).data
  const outlet = page.content.find(row => row.code === code); assert.ok(outlet)
  await api('/merchants/' + merchant.id + '/outlets', { method: 'POST', token: owner.token, body: { name: 'Duplicate', code }, expected: 409 })
  assert.equal(Number(runtime.sql(ctx, 'merchant_service', `SELECT version FROM merchants WHERE id='${merchant.id}'`)), versionBefore + 1)
  assert.equal(Number(runtime.sql(ctx, 'merchant_service', `SELECT count(*) FROM merchant_outbox_events WHERE aggregate_id='${merchant.id}' AND aggregate_version=${versionBefore + 1}`)), 1)
  await browser.click('Trang sau'); await until(() => browser.text('Trang 2/2'), 'pagination page 2'); await browser.click('Trang trước'); await until(() => browser.text('Trang 1/2'), 'page 1')
  checks.push('M01/M04/M08 one UI create, real pagination, duplicate 409, version +1 and one matching DB outbox event')
  await browser.click('Xem QR ' + code)
  await until(() => browser.has('[data-merchant-print] svg'), 'server QR SVG')
  assert.ok(qrPayload && qrPayload.merchantId === merchant.id && qrPayload.outletId === outlet.id)
  const expectedSvg = renderToStaticMarkup(createElement(QRCodeSVG, { value: qrPayload.token, size: 240, marginSize: 4, title: 'QR điểm bán do máy chủ cấp' }))
  const expectedPaths = [...expectedSvg.matchAll(/\sd="([^"]+)"/g)].map(match => match[1])
  assert.deepEqual(await browser.evaluate('[...document.querySelectorAll("[data-merchant-print] svg path")].map(path=>path.getAttribute("d"))'), expectedPaths)
  const verifier = 'const {verifyOutletQr}=require("./dist/services/qr.service");const t=' + JSON.stringify(qrPayload.token) + ';if(!verifyOutletQr(t,' + JSON.stringify({ merchantId: merchant.id, outletId: outlet.id }) + ')||verifyOutletQr(t+"x")||verifyOutletQr(t,' + JSON.stringify({ merchantId: second.id }) + '))process.exit(1);process.stdout.write("QR_SIGNATURE_SCOPE_PASS")'
  assert.ok(runtime.docker(ctx, 'exec', '-T', 'merchant-service', 'node', '-e', verifier).includes('QR_SIGNATURE_SCOPE_PASS'))
  const pdf = await browser.cdp('Page.printToPDF', { printBackground: true, preferCSSPageSize: true })
  const pdfFile = resolve(artifacts, 'merchant-qr.pdf'); writeFileSync(pdfFile, Buffer.from(pdf.data, 'base64'))
  const printed = execFileSync('pdftotext', [pdfFile, '-'], { encoding: 'utf8' })
  assert.ok(printed.includes(code)); assert.ok(!printed.includes('Khóa tích hợp API'))
  await browser.screenshot('outlet-qr'); await browser.click('Đóng')
  checks.push('M05 exact server token encoded in SVG; backend signature/tamper/scope verification; real browser PDF contains standee only')
  await api('/merchants/' + merchant.id + '/outlets', { token: other.token, expected: 403 })
  await api('/merchants/' + merchant.id + '/outlets', { method: 'POST', token: other.token, body: { name: 'Foreign', code: 'FOREIGN-' + code }, expected: 403 })
  await api('/merchants/' + merchant.id + '/outlets/' + outlet.id + '/qr', { token: other.token, expected: 403 })
  await api('/merchants/' + merchant.id + '/outlets/' + foreignOutlet.id + '/qr', { token: owner.token, expected: 404 })
  await browser.click('Tạo API key mới'); await browser.click('Xác nhận tạo khóa', 2)
  await until(() => browser.has('#merchant-key-once'), 'one-time key')
  let raw = await browser.evaluate('document.querySelector("#merchant-key-once").value')
  const keyId = raw.split('.')[0]; assert.match(keyId, /^[0-9a-f-]{36}$/)
  assert.equal(requests.filter(row => row.method === 'POST' && row.path === '/api/merchants/' + merchant.id + '/api-keys').length, 1)
  const hash = runtime.sql(ctx, 'merchant_service', `SELECT secret_hash FROM merchant_api_keys WHERE key_id='${keyId}'`)
  assert.ok(hash === createHash('sha256').update(raw.slice(raw.indexOf('.')+1)).digest('hex'), 'DB stores the server-generated secret hash')
  assert.equal(await browser.evaluate('JSON.stringify({...localStorage,...sessionStorage}).includes(document.querySelector("#merchant-key-once").value)'), false)
  await browser.click('Đóng'); assert.equal(await browser.has('#merchant-key-once'), false)
  await browser.click('Tạo API key mới'); assert.equal(await browser.has('#merchant-key-once'), false); await browser.click('Đóng')
  await api('/merchants/' + merchant.id + '/api-keys', { method: 'POST', token: other.token, body: {}, expected: 403 })
  await api('/merchants/' + merchant.id + '/api-keys/' + keyId, { method: 'DELETE', token: other.token, expected: 403 })
  await browser.click('Thu hồi khóa'); await browser.click('Xác nhận thu hồi')
  await until(() => browser.text('Máy chủ đã xác nhận thu hồi khóa.'), 'revocation')
  const replay = (await api('/merchants/' + merchant.id + '/api-keys/' + keyId, { method: 'DELETE', token: owner.token })).data
  assert.ok(replay.revokedAt && !('key' in replay))
  assert.equal(await browser.evaluate('document.body.innerText.includes(' + JSON.stringify(raw) + ')'), false)
  raw = undefined
  checks.push('M03/M06/M07 cross-owner 403/404; one-time server key, DB hash, no storage/view-again, explicit revoke and replay without secret')
  await browser.screenshot('merchant-tools')
  await browser.cdp('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await browser.go('/merchant'); await until(() => browser.has('#outlet-name'), 'mobile owner tools')
  await browser.screenshot('merchant-tools-mobile')
  assert.equal(await browser.has('#merchant-key-once'), false)
  assert.equal(await browser.evaluate('document.documentElement.scrollWidth > window.innerWidth'), false)
  checks.push('Mobile 390px without horizontal overflow; refresh cannot recover raw key')
  assert.ok(!requests.some(row => row.method === 'GET' && row.path.endsWith('/api-keys')))
  assert.deepEqual(browser.errors, [])
  for (const name of ['outlet-qr','merchant-tools','merchant-tools-mobile']) copyFileSync(resolve(browserRuntime, name + '.png'), resolve(artifacts, name + '.png'))
  writeFileSync(resolve(artifacts, 'result.json'), JSON.stringify({ status: 'LIVE_MERCHANT_TOOLS_PASS', testedAt: new Date().toISOString(), project: run.project, checks, requests, apiChecks: ctx.requests }, null, 2))
  console.log('PASS: Phase 6 live merchant tools (' + checks.length + ' groups), signed QR print PDF and DB metadata/outbox checks')
} catch (error) {
  writeFileSync(resolve(artifacts, 'result.json'), JSON.stringify({ status: 'FAIL', error: error.message, checks, requests }, null, 2)); throw error
} finally { await browser?.close(); server.closeAllConnections(); if (server.listening) await new Promise(done => server.close(done)) }
