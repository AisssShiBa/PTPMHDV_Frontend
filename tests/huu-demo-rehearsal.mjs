// Record authenticated synthetic demo screens only. Credentials/PIN/raw keys are never filmed.
import assert from 'node:assert/strict'
import { createServer, request as proxyRequest } from 'node:http'
import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs'
import { resolve, dirname, extname, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parseEnv } from 'node:util'
import { randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { openBrowser, until } from './browser-support.mjs'
const root = fileURLToPath(new URL('../', import.meta.url))
const backend = resolve(root, '../PTPMHDV_Backend')
assert.ok(process.env.LIVE_ACCEPTANCE_RUN_FILE, 'Provide isolated acceptance run.json')
const runFile = resolve(process.env.LIVE_ACCEPTANCE_RUN_FILE)
const run = JSON.parse(readFileSync(runFile, 'utf8'))
assert.match(run.project, /^finvault-acceptance-[0-9a-f]{12}$/)
assert.equal(dirname(runFile), resolve(backend, '.cache/acceptance-week2', run.project))
const gateway = new URL(run.gateway)
assert.equal(gateway.protocol, 'http:'); assert.ok(['localhost', '127.0.0.1'].includes(gateway.hostname))
const manifest = JSON.parse(readFileSync(resolve(root, 'docs/evidence/huu-fe-closeout/demo/demo-manifest.json'), 'utf8'))
const privateFile = resolve(dirname(runFile), 'huu-closeout-demo-accounts.json')
const principals = JSON.parse(readFileSync(privateFile, 'utf8')).accounts
const config = parseEnv(readFileSync(resolve(dirname(runFile), '.env'), 'utf8'))
assert.equal(config.VNP_TMN_CODE, 'SYNTH_TMN_CODE')
const dist = resolve(root, 'dist'), out = resolve(root, 'docs/evidence/huu-fe-closeout/rehearsal')
const temporary = resolve(root, 'node_modules/.tmp/huu-rehearsal')
mkdirSync(out, { recursive: true }); mkdirSync(temporary, { recursive: true })
assert.ok(existsSync(resolve(dist, 'index.html')), 'Build production frontend first')
const server = createServer((req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname
  if (path.startsWith('/api/') || path.startsWith('/socket.io')) {
    const upstream = proxyRequest(new URL(req.url, gateway), { method: req.method, headers: { ...req.headers, host: gateway.host } }, response => { res.writeHead(response.statusCode, response.headers); response.pipe(res) })
    upstream.on('error', () => { if (!res.headersSent) res.writeHead(502); res.end() }); req.pipe(upstream); return
  }
  const candidate = resolve(dist, '.' + decodeURIComponent(path))
  if (!candidate.startsWith(dist + sep) && candidate !== dist) { res.writeHead(403); res.end(); return }
  const file = extname(path) && existsSync(candidate) ? candidate : resolve(dist, 'index.html')
  res.writeHead(200, { 'Content-Type': { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2' }[extname(file)] || 'application/octet-stream' }); res.end(readFileSync(file))
})
const pause = ms => new Promise(done => setTimeout(done, ms))
const frames = [], checks = []
let browser, recording = false, segment = 0
async function screenshot(label) {
  await browser.screenshot(label)
  copyFileSync(resolve(temporary, label + '.png'), resolve(out, label + '.png'))
}
async function start() { segment++; recording = true; await browser.cdp('Page.startScreencast', { format: 'jpeg', quality: 75, maxWidth: 1280, maxHeight: 1000, everyNthFrame: 1 }) }
async function stop() { recording = false; await browser.cdp('Page.stopScreencast'); await pause(100) }
async function login(label) {
  if (browser) await browser.close()
  const origin = 'http://localhost:' + server.address().port
  browser = await openBrowser(temporary, 'rehearsal-' + label, origin)
  browser.on('Page.screencastFrame', params => {
    if (recording) {
      const name = 'frame-' + String(frames.length).padStart(5, '0') + '.jpg'
      writeFileSync(resolve(temporary, name), Buffer.from(params.data, 'base64'))
      frames.push({ file: name, time: params.metadata.timestamp, segment })
    }
    void browser.cdp('Page.screencastFrameAck', { sessionId: params.sessionId }).catch(() => {})
  })
  await browser.go('/app/profile')
  await until(() => browser.has('#username'), 'signin')
  await browser.fill('#username', principals[label].username)
  await browser.fill('#password', principals[label].password)
  await browser.click('Đăng nhập')
  await until(() => browser.has('#profile-email'), 'authenticated profile')
}
let success = false
try {
  await new Promise(done => server.listen(0, '127.0.0.1', done))
  await login('tier0'); await start()
  await browser.fill('#profile-fullName', 'Người dùng demo tổng hợp')
  await browser.click('Lưu thông tin'); await pause(1200)
  await browser.go('/app/profile')
  await until(() => browser.evaluate('document.querySelector("#profile-fullName")?.value === "Người dùng demo tổng hợp"'), 'saved profile after reload')
  await screenshot('profile-live'); await pause(1000)
  checks.push('Profile save and reload from real API, no credential filmed')
  // Real FE create against the Gateway; the empty deployment allowlist blocks
  // bank navigation, while the internal order remains recoverable by UUID.
  const signedIn = await fetch(new URL('/api/auth/signin', gateway), {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: principals.tier0.username, password: principals.tier0.password }),
  }).then(response => response.json())
  assert.ok(signedIn.data?.accessToken)
  const userApi = async path => {
    const response = await fetch(new URL('/api' + path, gateway), { headers: { Authorization: 'Bearer ' + signedIn.data.accessToken } })
    assert.equal(response.status, 200)
    return (await response.json()).data
  }
  const existingIds = new Set((await userApi('/payments/topups')).map(row => row.id))
  await browser.go('/app/topup'); await until(() => browser.has('#topup-amount'), 'live topup form')
  await browser.fill('#topup-amount', '100000')
  await browser.click('Tiếp tục tới VNPAY', 2)
  await until(() => browser.text('Chưa thể chuyển tới cổng thanh toán. Vui lòng kiểm tra lệnh đã tạo trong lịch sử.'), 'safe unconfigured live redirect')
  const created = (await userApi('/payments/topups')).filter(row => !existingIds.has(row.id))
  assert.equal(created.length, 1)
  assert.equal(browser.network.filter(row => row.method === 'POST' && row.path === '/api/payments/topups').length, 1)
  const order = created[0]
  assert.equal(order.status, 'PENDING')
  await screenshot('topup-created-live')
  await browser.go('/app/topup/result?topupId=' + order.id)
  await until(() => browser.text('Đang chờ thanh toán'), 'real pending topup')
  assert.equal(await browser.text('Nạp tiền thành công'), false)
  await screenshot('topup-pending-live'); await pause(1200)
  const vnp = await import(pathToFileURL(resolve(backend, 'tests/acceptance/week3/vnpay-scenarios.mjs')))
  const params = { vnp_TmnCode: config.VNP_TMN_CODE, vnp_TxnRef: order.code, vnp_Amount: '10000000', vnp_ResponseCode: '00', vnp_TransactionStatus: '00', vnp_TransactionNo: 'REHEARSAL-' + randomUUID(), vnp_BankCode: 'NCB', vnp_PayDate: '20261113090000' }
  const ipn = await fetch(new URL('/api/funding/vnpay/ipn?' + new URLSearchParams({ ...params, vnp_SecureHash: vnp.signVnpay(params, config.VNP_HASH_SECRET) }), gateway)).then(response => response.json())
  assert.equal(ipn.RspCode, '00')
  await until(() => browser.text('Nạp tiền thành công'), 'browser only succeeds after server IPN', 20000)
  await screenshot('topup-synthetic-live'); await pause(1200)
  checks.push('Real FE string create, double click one order, safe redirect guard, pending before synthetic server IPN and APPROVED receipt after polling; not VNPAY sandbox')
  for (const [label, text] of [['tier0', 'Rút tiền mô phỏng thành công'], ['tier1', 'Lệnh rút không thành công'], ['tier2', 'Ngân hàng đang đối soát, chưa rõ kết quả']]) {
    if (label !== 'tier0') { await stop(); await login(label); await start() }
    await browser.go('/app/withdraw?cashOutId=' + manifest.cashouts[label].id)
    await until(() => browser.text(text), 'server cashout state ' + label)
    await screenshot('cashout-' + label + '-live'); await pause(1200)
    checks.push('Read-only live cashout reload: ' + manifest.cashouts[label].status)
  }
  await stop(); await login('merchantPending'); await start(); await browser.go('/merchant')
  await until(() => browser.text('Đang chờ duyệt'), 'pending merchant gate')
  assert.equal(await browser.has('#outlet-name'), false)
  await screenshot('merchant-pending-live'); await pause(1200)
  await stop(); await login('merchantApproved'); await start(); await browser.go('/merchant')
  await until(() => browser.has('#outlet-name'), 'approved merchant tools')
  await until(() => browser.evaluate('[...document.querySelectorAll("button")].some(b => b.textContent.trim().startsWith("Xem QR ") && !b.disabled)'), 'outlet list ready for QR')
  await browser.evaluate('[...document.querySelectorAll("button")].find(b => b.textContent.trim().startsWith("Xem QR ")).click()')
  await until(() => browser.has('[data-merchant-print] svg'), 'signed QR from server')
  await screenshot('merchant-qr-live'); await pause(1200)
  checks.push('Pending/approved owners, server QR shown; no API key created or filmed')
  await stop()
  assert.ok(frames.length > 3, 'Live browser recording frames')
  const concat = []
  for (let i = 0; i < frames.length; i++) {
    const current = frames[i], next = frames[i + 1]
    const duration = next?.segment === current.segment ? Math.min(5, Math.max(0.05, next.time - current.time)) : 1
    concat.push("file '" + current.file + "'", 'duration ' + duration.toFixed(3))
  }
  concat.push("file '" + frames.at(-1).file + "'")
  writeFileSync(resolve(temporary, 'frames.txt'), concat.join('\n') + '\n')
  const video = resolve(out, 'live-demo-rehearsal.mp4')
  execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', resolve(temporary, 'frames.txt'), '-vf', "scale=1280:1000:force_original_aspect_ratio=decrease,pad=1280:1000:(ow-iw)/2:(oh-ih)/2,drawbox=x=0:y=0:w=iw:h=36:color=black@0.85:t=fill,drawtext=text='FinVault - LIVE Gateway - Synthetic demo - Payout SIMULATED':x=12:y=9:fontsize=20:fontcolor=white", '-r', '25', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', video], { stdio: ['ignore', 'pipe', 'pipe'] })
  const metadata = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration,size', '-of', 'json', video], { encoding: 'utf8' }))
  checks.push({ video: 'live-demo-rehearsal.mp4', frames: frames.length, ...metadata.format, credentialScreensExcluded: true })
  success = true
} catch (error) {
  checks.push({ status: 'FAIL', error: error.message.split('\n')[0].slice(0, 200) })
} finally {
  recording = false
  if (browser) await browser.close()
  server.closeAllConnections()
  if (server.listening) await new Promise(done => server.close(done))
  writeFileSync(resolve(out, 'result.json'), JSON.stringify({ status: success ? 'LIVE_REHEARSAL_PASS' : 'FAIL', testedAt: new Date().toISOString(), project: run.project, checks, browserNetwork: browser?.network, realVnpaySandbox: 'NOT_RUN', transferUI: 'NOT_RUN', note: 'CDP screencast segments after authentication; cuts exclude credentials/PIN/raw keys. Synthetic IPN and simulated payout, no sandbox bank visit.' }, null, 2))
}
console.log(success ? 'PASS: live synthetic demo rehearsal and labeled video' : 'FAIL: rehearsal; inspect sanitized result.json')
process.exitCode = success ? 0 : 1
