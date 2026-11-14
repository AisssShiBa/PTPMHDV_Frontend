// Real HTTP Gateway acceptance with synthetic accounts and an explicit isolated stack.
import assert from 'node:assert/strict'
import { createHmac, randomUUID } from 'node:crypto'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { parseEnv } from 'node:util'
const root = fileURLToPath(new URL('../', import.meta.url))
const backend = resolve(root, '../PTPMHDV_Backend')
assert.ok(process.env.LIVE_ACCEPTANCE_RUN_FILE, 'Provide isolated acceptance run.json')
const runFile = resolve(process.env.LIVE_ACCEPTANCE_RUN_FILE)
const run = JSON.parse(readFileSync(runFile, 'utf8'))
assert.match(run.project, /^finvault-acceptance-[0-9a-f]{12}$/)
const directory = resolve(backend, '.cache/acceptance-week2', run.project)
assert.equal(dirname(runFile), directory)
assert.ok(['localhost', '127.0.0.1'].includes(new URL(run.gateway).hostname))
const config = parseEnv(readFileSync(resolve(directory, '.env'), 'utf8'))
assert.equal(config.VNP_TMN_CODE, 'SYNTH_TMN_CODE', 'Only a synthetic terminal is allowed')
const runtime = await import(pathToFileURL(resolve(backend, 'tests/acceptance/week2/runtime.mjs')))
const ctx = { project: run.project, directory, config, base: run.gateway, requests: [], env: { ...process.env, ...config }, composeArgs: ['compose', '--project-directory', backend, '--env-file', resolve(directory, '.env'), '-p', run.project, '-f', resolve(backend, 'docker-compose.yml'), '-f', resolve(directory, 'compose.json')] }
const artifacts = resolve(root, process.env.BROWSER_EVIDENCE_DIR || 'docs/evidence/huu-fe-week4/fixes/funding-live')
mkdirSync(artifacts, { recursive: true })
const checks = []
const sql = (db, statement) => runtime.sql(ctx, db, statement)
const wallet = user => JSON.parse(sql('wallet_service', `SELECT json_build_object('balance',balance::text,'held',"heldBalance"::text) FROM "Wallet" WHERE "userId"='${user.id}' AND "ownerType"='USER'`))
const ledger = reference => JSON.parse(sql('wallet_service', `SELECT json_build_object('rows',count(*),'transactions',count(DISTINCT "transactionId")) FROM "LedgerEntry" WHERE "referenceId"='${reference}'`))
const topupRow = id => JSON.parse(sql('payment_service', `SELECT json_build_object('status',status,'code',code) FROM "TopupRequest" WHERE id='${id}'`))
const call = (path, options) => runtime.call(ctx, path, options)
const signed = (code, secret = config.VNP_HASH_SECRET) => {
  const values = { vnp_TmnCode: config.VNP_TMN_CODE, vnp_TxnRef: code, vnp_Amount: '20000000', vnp_ResponseCode: '00', vnp_TransactionStatus: '00', vnp_TransactionNo: 'SYNTHETIC', vnp_BankCode: 'NCB', vnp_PayDate: '20261113090000' }
  const canonical = Object.keys(values).sort().map(key => key + '=' + encodeURIComponent(values[key]).replace(/%20/g, '+')).join('&')
  return new URLSearchParams({ ...values, vnp_SecureHash: createHmac('sha512', secret).update(canonical).digest('hex') }).toString()
}
let exitCode = 0
try {
  const owner = await runtime.account(ctx, 'h07fund')
  const foreign = await runtime.account(ctx, 'h07foreign')
  await call('/funding/vnpay/create', { method: 'POST', body: { amount: '200000' }, expected: 401 })
  await call('/funding/cash-out', { method: 'POST', body: { amount: '10000' }, headers: { 'Idempotency-Key': randomUUID() }, expected: 401 })
  await call('/funding/vnpay/ipn', { method: 'POST', expected: 401 })
  const before = wallet(owner)
  const key = randomUUID()
  const create = (path = '/funding/vnpay/create', amount = '200000', token = owner.token) => call(path, { method: 'POST', token, body: { amount }, headers: { 'Idempotency-Key': key }, expected: 201 })
  const first = (await create()).data
  const results = await Promise.all(Array.from({ length: 5 }, () => create('/payments/topups')))
  assert.ok(results.every(result => result.data.topupId === first.topupId && result.data.paymentUrl === first.paymentUrl))
  assert.equal(sql('payment_service', `SELECT count(*) FROM "TopupRequest" WHERE "userId"='${owner.id}' AND "idempotencyKey"='${key}'`), '1')
  await call('/payments/topups', { method: 'POST', token: owner.token, body: { amount: '200001' }, headers: { 'Idempotency-Key': key }, expected: 422 })
  await call('/payments/topups/' + first.topupId, { token: foreign.token, expected: 403 })
  assert.deepEqual(wallet(owner), before)
  checks.push('HU-F05: authenticated string create; alias/legacy concurrent retries one UUID/URL/DB row; changed payload 422; foreign 403; no early credit')
  const row = topupRow(first.topupId)
  const forged = await call('/funding/vnpay/ipn?' + signed(row.code, 'wrong-synthetic-secret'), { expected: 200 })
  assert.equal(forged.RspCode, '97')
  await call('/funding/vnpay/return?' + signed(row.code), { expected: 200 })
  assert.equal(topupRow(first.topupId).status, 'PENDING')
  assert.deepEqual(wallet(owner), before)
  checks.push('HU-F07: forged HMAC rejected; signed browser return stays PENDING and never credits')
  const ipn = () => call('/funding/vnpay/ipn?' + signed(row.code), { expected: 200 })
  assert.equal((await ipn()).RspCode, '00')
  assert.equal((await ipn()).RspCode, '02')
  const replays = await Promise.all(Array.from({ length: 20 }, ipn))
  assert.ok(replays.every(result => result.RspCode === '02'))
  assert.equal(BigInt(wallet(owner).balance.replace('.00', '')), BigInt(before.balance.replace('.00', '')) + 200000n)
  assert.deepEqual(ledger(row.code), { rows: 2, transactions: 1 })
  assert.equal(topupRow(first.topupId).status, 'APPROVED')
  checks.push('HU-F06: 2 then 20 duplicate IPNs: one credit and one balanced ledger transaction')
  await call('/auth/pin/setup', { method: 'POST', token: owner.token, expected: 201, body: { pin: '741852', confirmPin: '741852' } })
  for (const [amount, terminal] of [['10000', 'SUCCEEDED'], ['10111', 'FAILED'], ['10222', 'PAYOUT_PENDING']]) {
    if (amount !== '10000') {
      console.log('Waiting for the per-user cashout rate-limit window before ' + terminal)
      await new Promise(done => setTimeout(done, 31000))
      await new Promise(done => setTimeout(done, 31000))
    }
    const previous = wallet(owner)
    const cashKey = randomUUID()
    const created = (await call('/funding/cash-out', { method: 'POST', token: owner.token, expected: 201, headers: { 'Idempotency-Key': cashKey }, body: { amount } })).data
    const id = created.id
    await call('/funding/cash-out/' + id, { token: foreign.token, expected: 403 })
    const replay = (await call('/funding/cash-out', { method: 'POST', token: owner.token, expected: 201, headers: { 'Idempotency-Key': cashKey }, body: { amount } })).data
    assert.equal(replay.id, id)
    const token = (await call('/auth/pin/verify', { method: 'POST', token: owner.token, body: { pin: '741852', paymentId: id, amount } })).data.transactionToken
    const confirm = () => call('/funding/cash-out/' + id + '/confirm', { method: 'POST', token: owner.token, headers: { 'X-Transaction-Token': token }, body: {}, expected: null })
    const confirmed = await confirm()
    assert.ok([200, 409, 503].includes(confirmed.httpStatus), 'Unexpected confirm status')
    await runtime.until(async () => {
      const status = (await call('/funding/cash-out/' + id, { token: owner.token })).data.status
      if (status === terminal) return true
      await new Promise(done => setTimeout(done, 1000))
      return false
    }, 'cashout server terminal/pending')
    const after = wallet(owner)
    const ref = 'cashout_' + id
    const hold = sql('wallet_service', `SELECT status FROM "WalletHold" WHERE "referenceId"='${ref}'`)
    const balance = value => BigInt(value.replace('.00', ''))
    if (terminal === 'SUCCEEDED') {
      assert.equal(balance(after.balance), balance(previous.balance) - BigInt(amount))
      assert.equal(hold, 'CAPTURED'); assert.deepEqual(ledger(ref), { rows: 2, transactions: 1 })
    } else if (terminal === 'FAILED') {
      assert.deepEqual(after, previous); assert.equal(hold, 'RELEASED'); assert.equal(ledger(ref).rows, 0)
    } else {
      assert.equal(after.balance, previous.balance)
      assert.equal(balance(after.held), balance(previous.held) + BigInt(amount))
      assert.equal(hold, 'PENDING'); assert.equal(ledger(ref).rows, 0)
    }
    const replayConfirm = await confirm()
    assert.equal(replayConfirm.httpStatus, 409)
    assert.equal(replayConfirm.error.code, 'TXN_TOKEN_REUSED')
    assert.deepEqual(wallet(owner), after)
    checks.push('HU-F08/F09/F10/F11: ' + terminal + ' through Gateway/PIN; owner isolation, idempotent create, real hold/ledger/balance and token replay 409')
  }
} catch (error) {
  exitCode = 1
  checks.push('FAIL: ' + error.message.split('\n')[0])
} finally {
  writeFileSync(resolve(artifacts, 'result.json'), JSON.stringify({ status: exitCode ? 'FAIL' : 'LIVE_GATEWAY_FUNDING_PASS', project: run.project, testedAt: new Date().toISOString(), checks, requests: ctx.requests, realVnpaySandbox: 'NOT_RUN', payoutProvider: 'SIMULATED' }, null, 2))
}
console.log(checks.join('\n'))
process.exitCode = exitCode
