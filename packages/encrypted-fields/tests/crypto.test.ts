import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import test from 'node:test'
import { legacyAuthenticatedValuePrefix } from '../src/consts'
import { decrypt } from '../src/utils/decrypt'
import { createLegacyAuthenticatedKeyFromSecret, encrypt } from '../src/utils/encrypt'
import { decryptValue, encryptPlaintextValue, migrateEncryptedValue } from '../src/utils/values'

const secret = 'payload-secret-for-testing'

const legacyEncrypt = (text: string, encryptionSecret = secret): string => {
  const iv = Buffer.alloc(16, 7)
  const key = crypto.createHash('sha256').update(encryptionSecret).digest('hex').slice(0, 32)
  const cipher = crypto.createCipheriv('aes-256-ctr', key, iv)
  return `${iv.toString('hex')}${Buffer.concat([cipher.update(text), cipher.final()]).toString('hex')}`
}

const v2Encrypt = (text: string, encryptionSecret = secret): string => {
  const iv = Buffer.alloc(12, 8)
  const cipher = crypto.createCipheriv(
    'aes-256-gcm',
    createLegacyAuthenticatedKeyFromSecret(encryptionSecret),
    iv,
  )
  const encrypted = Buffer.concat([cipher.update(text), cipher.final()])
  return [
    legacyAuthenticatedValuePrefix,
    iv.toString('hex'),
    cipher.getAuthTag().toString('hex'),
    encrypted.toString('hex'),
  ].join(':')
}

test('new ciphertext uses authenticated, randomized v3 envelopes', () => {
  const first = encrypt(JSON.stringify({ value: 'secret' }), secret)
  const second = encrypt(JSON.stringify({ value: 'secret' }), secret)
  assert.match(first, /^v3:[A-Za-z0-9_-]{16}:[A-Za-z0-9_-]{16}:[A-Za-z0-9_-]{22}:/)
  assert.notEqual(first, second)
  assert.equal(decrypt(first, secret), JSON.stringify({ value: 'secret' }))
})

test('tampering, the wrong secret, and the wrong authenticated context are rejected', () => {
  const encrypted = encrypt('sensitive', secret, 'billing-card')
  const tampered = `${encrypted.slice(0, -1)}${encrypted.endsWith('A') ? 'B' : 'A'}`
  assert.throws(() => decrypt(tampered, secret, 'billing-card'))
  assert.throws(() => decrypt(encrypted, 'wrong-secret', 'billing-card'))
  assert.throws(() => decrypt(encrypted, secret, 'different-field'))
})

test('published legacy AES-CTR and branch v2 AES-GCM values remain readable', () => {
  const plaintext = JSON.stringify(['existing', 'data'])
  assert.equal(decrypt(legacyEncrypt(plaintext), secret), plaintext)
  assert.equal(decrypt(v2Encrypt(plaintext), secret), plaintext)
})

test('key rotation reads previous secrets and migration rewrites with the current key', () => {
  const oldSecret = 'old-payload-secret'
  const legacy = legacyEncrypt(JSON.stringify({ private: true }), oldSecret)
  const decrypted = decryptValue(legacy, [secret, oldSecret])
  assert.deepEqual(decrypted, { value: { private: true }, version: 'legacy' })

  const migrated = migrateEncryptedValue(legacy, {
    previousSecrets: [oldSecret],
    secret,
  })
  assert.match(migrated!, /^v3:/)
  assert.deepEqual(decryptValue(migrated, [secret])?.value, { private: true })
  assert.throws(() => decryptValue(migrated, [oldSecret]))
})

test('plaintext migration helper preserves the original value type', () => {
  const migrated = encryptPlaintextValue({ nested: [1, false] }, { secret })
  assert.deepEqual(decryptValue(migrated, [secret])?.value, { nested: [1, false] })
})

test('migration can rotate authenticated context without exposing plaintext', () => {
  const original = encryptPlaintextValue('bound', { context: 'old-field', secret })
  const migrated = migrateEncryptedValue(original, {
    context: 'new-field',
    previousContext: 'old-field',
    secret,
  })
  assert.equal(decryptValue(migrated, [secret], 'new-field')?.value, 'bound')
  assert.throws(() => decryptValue(migrated, [secret], 'old-field'))
})

test('empty secrets and malformed ciphertext fail explicitly', () => {
  assert.throws(() => encrypt('value', ''), /Payload secret/)
  assert.throws(() => decrypt('value', ''), /Payload secret/)
  assert.throws(() => decryptValue('not-ciphertext', [secret]), /could not be decrypted/)
})
