// Synthetic demo seed and existing Wallet/P2P acceptance on an explicit isolated stack.
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { deflateSync } from 'node:zlib'
import { mkdirSync, readFileSync, writeFileSync, chmodSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parseEnv } from 'node:util'
const root = fileURLToPath(new URL('../', import.meta.url))
const backend = resolve(root, '../PTPMHDV_Backend')
const mode = process.argv[2]
assert.ok(['demo', 'p2p', 'wallet'].includes(mode), 'Use demo, p2p or wallet')
assert.ok(process.env.LIVE_ACCEPTANCE_RUN_FILE, 'Provide isolated run.json')
const runFile = resolve(process.env.LIVE_ACCEPTANCE_RUN_FILE)
const run = JSON.parse(readFileSync(runFile, 'utf8'))
assert.match(run.project, /^finvault-acceptance-[0-9a-f]{12}$/)
const directory = resolve(backend, '.cache/acceptance-week2', run.project)
assert.equal(dirname(runFile), directory)
const gateway = new URL(run.gateway)
assert.equal(gateway.protocol, 'http:')
assert.ok(['localhost', '127.0.0.1'].includes(gateway.hostname))
const config = parseEnv(readFileSync(resolve(directory, '.env'), 'utf8'))
assert.equal(config.VNP_TMN_CODE, 'SYNTH_TMN_CODE')
const rt = await import(pathToFileURL(resolve(backend, 'tests/acceptance/week2/runtime.mjs')))
const ctx = { project: run.project, directory, config, base: gateway.origin, requests: [], env: { ...process.env, ...config }, composeArgs: ['compose', '--project-directory', backend, '--env-file', resolve(directory, '.env'), '-p', run.project, '-f', resolve(backend, 'docker-compose.yml'), '-f', resolve(directory, 'compose.json')] }
const evidenceLabel = process.env.CLOSEOUT_EVIDENCE_LABEL || mode
assert.match(evidenceLabel, /^[a-z0-9-]+$/)
const out = resolve(root, 'docs/evidence/huu-fe-closeout', evidenceLabel)
mkdirSync(out, { recursive: true })
const checks = []
const safeError = error => error.message.startsWith('Command failed:')
  ? 'Container scenario command failed; inspect protected runtime diagnostics'
  : error.message.split('\n')[0].slice(0, 250)
const sql = (db, statement) => rt.sql(ctx, db, statement)
const call = (path, options) => rt.call(ctx, path, options)
const wallets = user => JSON.parse(sql('wallet_service', `SELECT json_build_object('balance',balance::text,'held',"heldBalance"::text,'tier',"kycTier") FROM "Wallet" WHERE "userId"='${user.id}' AND "ownerType"='USER'`))
function syntheticDocuments() {
  const crc32 = bytes => {
    let crc = 0xffffffff
    for (const byte of bytes) { crc ^= byte; for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0) }
    return (crc ^ 0xffffffff) >>> 0
  }
  const chunk = (name, data) => {
    const tag = Buffer.from(name), size = Buffer.alloc(4), crc = Buffer.alloc(4)
    size.writeUInt32BE(data.length); crc.writeUInt32BE(crc32(Buffer.concat([tag, data])))
    return Buffer.concat([size, tag, data, crc])
  }
  const header = Buffer.alloc(13); header.writeUInt32BE(16, 0); header.writeUInt32BE(16, 4); header[8] = 8; header[9] = 2
  const pixels = Buffer.concat(Array.from({ length: 16 }, () => Buffer.concat([Buffer.from([0]), Buffer.alloc(48, 180)])))
  const image = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(pixels)), chunk('IEND', Buffer.alloc(0))])
  const form = new FormData(); form.set('idNumber', 'SYNTHETIC-DEMO')
  for (const side of ['front', 'back']) form.set(side, new Blob([image], { type: 'image/png' }), side + '.png')
  return form
}
async function credit(admin, user, amount) {
  await call('/wallets/' + user.id + '/credit', { method: 'POST', token: admin.token, body: { amount, referenceId: randomUUID(), transferType: 'TOPUP' } })
}
let failed = false
try {
  const readiness = await fetch(new URL('/health', gateway))
  assert.equal(readiness.status, 200, 'Isolated Gateway health')
  const requestBudget = process.argv[3]?.split(',').length === 1 ? 40 : 110
  if (Number(readiness.headers.get('x-ratelimit-remaining') || 0) < requestBudget) {
    console.log('Waiting for a fresh Gateway rate-limit window before bulk synthetic accounts')
    await rt.pause(31000); await rt.pause(31000)
  }
  if (mode === 'demo') {
    const accounts = {}
    const privateFile = resolve(directory, 'huu-closeout-demo-accounts.json')
    const save = () => {
      const principals = Object.fromEntries(Object.entries(accounts).map(([name, a]) => [name, { id: a.id, username: a.username, email: a.email, password: a.password, ...(a.hasPin ? { pin: '741852' } : {}) }]))
      writeFileSync(privateFile, JSON.stringify({ project: run.project, createdAt: new Date().toISOString(), accounts: principals }, null, 2), { mode: 0o600 })
      chmodSync(privateFile, 0o600)
    }
    for (const label of ['admin', 'tier0', 'tier1', 'tier2', 'merchantPending', 'merchantApproved']) {
      accounts[label] = await rt.account(ctx, 'closeout' + label, undefined, label === 'admin' ? 'ADMIN' : 'USER')
      save()
    }
    for (const [label, tier] of [['tier0', 0], ['tier1', 1], ['tier2', 2]]) {
      const user = accounts[label]
      if (tier) {
        await call('/users/kyc/documents', { method: 'POST', token: user.token, body: syntheticDocuments(), expected: 202 })
        await call('/admin/kyc/' + user.profileId + '/review', { method: 'POST', token: accounts.admin.token, body: { status: 'APPROVED', detail: 'Synthetic demo approval' } })
        if (tier === 2) await call('/admin/kyc/' + user.profileId + '/tier', { method: 'PATCH', token: accounts.admin.token, body: { tier, reason: 'Synthetic acceptance tier fixture' } })
      }
      await rt.until(() => wallets(user).tier === tier, 'Wallet tier event propagation')
      await credit(accounts.admin, user, '300000')
      assert.equal((await call('/users/me', { token: user.token })).data.kycTier, tier)
      checks.push({ label, tier, wallet: wallets(user) })
    }
    const merchants = {}
    for (const label of ['merchantPending', 'merchantApproved']) {
      const owner = accounts[label]
      const merchant = (await call('/merchants/register', { method: 'POST', token: owner.token, expected: 201, body: { businessName: 'FinVault synthetic ' + label } })).data
      if (label === 'merchantApproved') {
        await call('/merchants/' + merchant.id + '/status', { method: 'PATCH', token: accounts.admin.token, body: { status: 'APPROVED' } })
        const outlet = (await call('/merchants/' + merchant.id + '/outlets', { method: 'POST', token: owner.token, expected: 201, body: { name: 'Synthetic demo outlet', code: 'CLOSEOUT-' + randomUUID().slice(0, 8) } })).data
        const qr = (await call('/merchants/' + merchant.id + '/outlets/' + outlet.id + '/qr', { token: owner.token })).data
        assert.ok(qr.token && qr.signature)
        merchants[label] = { id: merchant.id, outletId: outlet.id, status: 'APPROVED' }
      } else merchants[label] = { id: merchant.id, status: 'PENDING' }
      assert.equal((await call('/merchants/me', { token: owner.token })).data.status, merchants[label].status)
    }
    checks.push({ label: 'merchant-states', merchants })
    const vnp = await import(pathToFileURL(resolve(backend, 'tests/acceptance/week3/vnpay-scenarios.mjs')))
    const topup = (await call('/payments/topups', { method: 'POST', token: accounts.tier0.token, expected: 201, headers: { 'Idempotency-Key': randomUUID() }, body: { amount: '100000' } })).data
    const code = new URL(topup.paymentUrl).searchParams.get('vnp_TxnRef')
    const params = { vnp_TmnCode: config.VNP_TMN_CODE, vnp_TxnRef: code, vnp_Amount: '10000000', vnp_ResponseCode: '00', vnp_TransactionStatus: '00', vnp_TransactionNo: 'CLOSEOUT-SYNTHETIC', vnp_BankCode: 'NCB', vnp_PayDate: '20261113090000' }
    assert.equal((await call('/funding/vnpay/ipn?' + new URLSearchParams({ ...params, vnp_SecureHash: vnp.signVnpay(params, config.VNP_HASH_SECRET) }))).RspCode, '00')
    checks.push({ label: 'topup-synthetic', topupId: topup.topupId, status: 'APPROVED', realSandbox: 'NOT_RUN' })
    const cashouts = {}
    for (const [label, amount, status] of [['tier0', '10000', 'SUCCEEDED'], ['tier1', '10111', 'FAILED'], ['tier2', '10222', 'PAYOUT_PENDING']]) {
      const user = accounts[label]
      await call('/auth/pin/setup', { method: 'POST', token: user.token, expected: 201, body: { pin: '741852', confirmPin: '741852' } })
      user.hasPin = true; save()
      const created = (await call('/funding/cash-out', { method: 'POST', token: user.token, expected: 201, headers: { 'Idempotency-Key': randomUUID() }, body: { amount } })).data
      const token = (await call('/auth/pin/verify', { method: 'POST', token: user.token, body: { pin: '741852', paymentId: created.id, amount } })).data.transactionToken
      const confirmed = await call('/funding/cash-out/' + created.id + '/confirm', { method: 'POST', token: user.token, headers: { 'X-Transaction-Token': token }, body: {}, expected: null })
      assert.ok([200, 409, 503].includes(confirmed.httpStatus))
      await rt.until(async () => {
        const row = (await call('/funding/cash-out/' + created.id, { token: user.token })).data
        if (row.status === status) return true
        await rt.pause(1000); return false
      }, 'Demo cashout status')
      cashouts[label] = { id: created.id, status, amount }
    }
    checks.push({ label: 'cashout-states', cashouts })
    writeFileSync(resolve(out, 'demo-manifest.json'), JSON.stringify({ project: run.project, privateCredentialsFile: privateFile, principals: Object.fromEntries(Object.entries(accounts).map(([label, user]) => [label, { id: user.id, email: user.email }])), merchants, cashouts, topupId: topup.topupId, noRealIdentityDocuments: true, payout: 'SIMULATED', realVnpaySandbox: 'NOT_RUN' }, null, 2))
    console.log('Demo fixture created; credentials saved only in ignored private acceptance directory.')
  } else if (mode === 'wallet') {
    const scenarios = await import(pathToFileURL(resolve(backend, 'tests/acceptance/week2/wallet-scenarios.mjs')))
    const admin = await rt.account(ctx, 'closeoutwalletadmin', undefined, 'ADMIN')
    const available = ['walletA9', 'walletS6', 's7', 'inlineExpiry', 's10']
    const selected = process.argv[3] ? process.argv[3].split(',') : available
    assert.ok(selected.every(name => available.includes(name)))
    for (const name of selected) {
      const row = { scenario: name, startedAt: new Date().toISOString() }
      try {
        if (name === 's10') await scenarios[name](ctx)
        else {
          const actors = { admin, binh: await rt.account(ctx, 'wallet' + name + 'receiver') }
          if (name === 'walletA9') { actors.chi = await rt.account(ctx, 'walletA9owner'); await credit(admin, actors.chi, '100000') }
          await scenarios[name](ctx, actors)
        }
        row.status = 'PASS'
      } catch (error) { row.status = 'FAIL'; row.error = safeError(error); failed = true }
      row.finishedAt = new Date().toISOString(); checks.push(row)
      writeFileSync(resolve(out, 'progress.json'), JSON.stringify(checks, null, 2)); console.log(name + ': ' + row.status)
    }
  } else {
    const scenarios = await import(pathToFileURL(resolve(backend, 'tests/acceptance/week2/p2p-scenarios.mjs')))
    const admin = await rt.account(ctx, 'closeoutp2padmin', undefined, 'ADMIN')
    const available = ['a4', 's4', 's5', 'a9', 's6', 's15', 'concurrentConfirm', 'ambiguousCapture', 's8', 's16', 'realtime']
    const selected = process.argv[3] ? process.argv[3].split(',') : available
    assert.ok(selected.every(name => available.includes(name)))
    for (const name of selected) {
      const row = { scenario: name, startedAt: new Date().toISOString() }
      try {
        // Each case owns its sender/receiver and limits; no cross-case token or usage pollution.
        const actors = { admin, an: await rt.account(ctx, 'p2p' + name + 'a'), binh: await rt.account(ctx, 'p2p' + name + 'b') }
        await credit(admin, actors.an, '1100000'); await credit(admin, actors.binh, '1100000')
        await scenarios[name](ctx, actors)
        row.status = 'PASS'
      } catch (error) {
        row.status = 'FAIL'; row.error = safeError(error); failed = true
      }
      row.finishedAt = new Date().toISOString(); checks.push(row)
      writeFileSync(resolve(out, 'progress.json'), JSON.stringify(checks, null, 2))
      console.log(name + ': ' + row.status)
    }
    assert.equal(sql('wallet_service', 'SELECT COALESCE(SUM(balance),0)::numeric(20,2)::text FROM "Wallet"'), '0.00')
    assert.equal(sql('wallet_service', 'SELECT count(*) FROM (SELECT "transactionId" FROM "LedgerEntry" GROUP BY "transactionId" HAVING SUM(CASE WHEN direction=\'CREDIT\' THEN amount ELSE -amount END) != 0 OR count(*) < 2) invalid'), '0')
    checks.push({ scenario: 'global-ledger-conservation', status: 'PASS' })
  }
} catch (error) {
  failed = true
  checks.push({ scenario: 'setup/finalize', status: 'FAIL', error: safeError(error) })
} finally {
  writeFileSync(resolve(out, 'result.json'), JSON.stringify({ status: failed ? 'FAIL' : 'PASS', mode, project: run.project, testedAt: new Date().toISOString(), checks, requests: ctx.requests, scope: mode !== 'demo' ? 'Existing week2 Wallet/P2P scenario matrix; not a named K18 suite or active Transfer UI' : 'Synthetic interactive demo fixtures, no real VNPAY sandbox' }, null, 2))
}
process.exitCode = failed ? 1 : 0
