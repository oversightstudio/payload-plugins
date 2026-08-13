import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import test from 'node:test'
import { decrypt } from '../src/utils/decrypt'
import { encrypt } from '../src/utils/encrypt'

const secret = 'payload-secret-for-testing'

const legacyEncrypt = (text: string): string => {
  const iv = Buffer.alloc(16, 7)
  const key = crypto.createHash('sha256').update(secret).digest('hex').slice(0, 32)
  const cipher = crypto.createCipheriv('aes-256-ctr', key, iv)
  return `${iv.toString('hex')}${Buffer.concat([cipher.update(text), cipher.final()]).toString('hex')}`
}

test('new ciphertext uses authenticated, randomized v2 envelopes', () => {
  const first = encrypt(JSON.stringify({ value: 'secret' }), secret)
  const second = encrypt(JSON.stringify({ value: 'secret' }), secret)
  assert.match(first, /^v2:[a-f\d]{24}:[a-f\d]{32}:[a-f\d]+$/)
  assert.notEqual(first, second)
  assert.equal(decrypt(first, secret), JSON.stringify({ value: 'secret' }))
})

test('tampering and the wrong secret are rejected', () => {
  const encrypted = encrypt('sensitive', secret)
  const tampered = `${encrypted.slice(0, -1)}${encrypted.endsWith('0') ? '1' : '0'}`
  assert.throws(() => decrypt(tampered, secret))
  assert.throws(() => decrypt(encrypted, 'wrong-secret'))
})

test('legacy AES-CTR values remain readable', () => {
  const encrypted = legacyEncrypt(JSON.stringify(['existing', 'data']))
  assert.equal(decrypt(encrypted, secret), JSON.stringify(['existing', 'data']))
})

test('empty secrets fail explicitly', () => {
  assert.throws(() => encrypt('value', ''), /Payload secret/)
  assert.throws(() => decrypt('value', ''), /Payload secret/)
})
