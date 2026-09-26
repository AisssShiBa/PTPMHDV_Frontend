import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createProfileSchema, buildProfileUpdate, kycSchema, MAX_KYC_FILE_SIZE } from '../src/features/user/schemas/user.schema'
import { merchantSchema, merchantPayload } from '../src/features/merchant/schemas/merchant.schema'
import { unwrap } from '../src/lib/apiResponse'

test('profile accepts nullable initial values and only updates changed allowed fields', () => {
  const profile = { fullName: null, phone: null, address: 'Old address' }
  const parsed = createProfileSchema(profile).parse({
    fullName: ' Nguyen Van A ', phone: '+84 912 345 678', address: 'Old address', email: 'injected@example.com', kycStatus: 'APPROVED'
  })
  assert.deepEqual(buildProfileUpdate(profile, parsed), { fullName: 'Nguyen Van A', phone: '+84 912 345 678' })
})

test('clearing an existing profile field is rejected instead of silently claiming it was saved', () => {
  const parsed = createProfileSchema({ fullName: 'Saved', phone: null, address: null })
    .safeParse({ fullName: '   ', phone: '', address: '' })
  assert.equal(parsed.success, false)
  if (!parsed.success) assert.deepEqual(parsed.error.issues[0].path, ['fullName'])
})

test('profile backend length limits and no-change payload', () => {
  const profile = { fullName: 'A', phone: null, address: null }
  const schema = createProfileSchema(profile)
  assert.equal(schema.safeParse({ fullName: 'A', phone: '1'.repeat(31), address: '' }).success, false)
  assert.equal(schema.safeParse({ fullName: 'A', phone: '', address: 'x'.repeat(501) }).success, false)
  assert.deepEqual(buildProfileUpdate(profile, { fullName: 'A', phone: '', address: '' }), {})
})

test('KYC supports alphanumeric passport and validates actual file selection, type and size', () => {
  const good = new File(['image'], 'passport.png', { type: 'image/png' })
  assert.equal(kycSchema.safeParse({ idNumber: ' B1234567 ', document: good }).success, true)
  assert.equal(kycSchema.safeParse({ idNumber: '123456789012', document: good }).success, true)
  assert.equal(kycSchema.safeParse({ idNumber: ' ', document: good }).success, false)
  assert.equal(kycSchema.safeParse({ idNumber: 'x'.repeat(51), document: good }).success, false)
  assert.equal(kycSchema.safeParse({ idNumber: 'B123', document: undefined }).success, false)
  assert.equal(kycSchema.safeParse({ idNumber: 'B123', document: new File(['x'], 'file.pdf', { type: 'application/pdf' }) }).success, false)
  assert.equal(kycSchema.safeParse({ idNumber: 'B123', document: new File([], 'empty.png', { type: 'image/png' }) }).success, false)
  assert.equal(kycSchema.safeParse({ idNumber: 'B123', document: new File([new Uint8Array(MAX_KYC_FILE_SIZE + 1)], 'large.png', { type: 'image/png' }) }).success, false)
})

test('merchant requires only businessName and omits blank optional fields / ownerId', () => {
  const values = merchantSchema.parse({ businessName: ' Shop ', taxId: ' ', bankAccount: '', ownerId: 'other' })
  assert.deepEqual(merchantPayload(values), { businessName: 'Shop' })
  assert.equal(merchantSchema.safeParse({ businessName: ' ', taxId: '', bankAccount: '' }).success, false)
  assert.equal(merchantSchema.safeParse({ businessName: 'Shop', taxId: 'x'.repeat(51), bankAccount: '' }).success, false)
})

test('envelope distinguishes explicit empty data from malformed or failed responses', () => {
  assert.equal(unwrap({ success: true, data: null }), null)
  assert.throws(() => unwrap({ success: true }))
  assert.throws(() => unwrap({ success: false, error: { code: 'ERROR', message: 'Error' } }))
})
