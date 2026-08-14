import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import test from 'node:test'
import { legacyAuthenticatedValuePrefix } from '../src/consts'
import { createEncryptedField, encryptedField } from '../src/fields/encryptedField'
import { createLegacyAuthenticatedKeyFromSecret } from '../src/utils/encrypt'
import { EncryptedFieldDecryptionError } from '../src/utils/values'

const req = {
  payload: {
    config: { secret: 'payload-secret' },
    secret: 'hashed-payload-secret',
  },
}

const runHooks = async (hooks: unknown[] | undefined, value: unknown, args: object = {}) => {
  let result = value
  for (const hook of hooks ?? []) {
    result = await (hook as (args: object) => unknown)({ req, value: result, ...args })
  }
  return result
}

const legacyEncrypt = (value: unknown, secret: string): string => {
  const iv = Buffer.alloc(16, 7)
  const key = crypto.createHash('sha256').update(secret).digest('hex').slice(0, 32)
  const cipher = crypto.createCipheriv('aes-256-ctr', key, iv)
  const text = JSON.stringify(value)
  return `${iv.toString('hex')}${Buffer.concat([cipher.update(text), cipher.final()]).toString('hex')}`
}

const v2Encrypt = (value: unknown, secret: string): string => {
  const iv = Buffer.alloc(12, 8)
  const cipher = crypto.createCipheriv(
    'aes-256-gcm',
    createLegacyAuthenticatedKeyFromSecret(secret),
    iv,
  )
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()])
  return [
    legacyAuthenticatedValuePrefix,
    iv.toString('hex'),
    cipher.getAuthTag().toString('hex'),
    encrypted.toString('hex'),
  ].join(':')
}

test('field encrypts after consumer transforms and decrypts before consumer reads', async () => {
  const field = encryptedField({
    name: 'privateValue',
    type: 'text',
    hooks: {
      beforeChange: [({ value }) => `${String(value)}-transformed`],
      afterRead: [({ value }) => `${String(value)}-read`],
    },
  })
  const stored = await runHooks(field.hooks?.beforeChange, 'input')
  assert.equal(typeof stored, 'string')
  assert.match(stored as string, /^v3:/)

  const result = await runHooks(field.hooks?.afterRead, stored, { schemaPath: ['privateValue'] })
  assert.equal(result, 'input-transformed-read')
})

test('legacy environment secret remains an automatic read fallback', async () => {
  const previousEnvironmentSecret = process.env.PAYLOAD_SECRET
  process.env.PAYLOAD_SECRET = 'legacy-environment-secret'
  try {
    const field = encryptedField({ name: 'privateValue', type: 'text' })
    const stored = legacyEncrypt('existing', process.env.PAYLOAD_SECRET)
    const result = await runHooks(field.hooks?.afterRead, stored, {
      collection: { slug: 'secrets' },
      schemaPath: ['privateValue'],
    })
    assert.equal(result, 'existing')
  } finally {
    if (previousEnvironmentSecret === undefined) delete process.env.PAYLOAD_SECRET
    else process.env.PAYLOAD_SECRET = previousEnvironmentSecret
  }
})

test('intermediate v2 values using Payload runtime secret remain readable', async () => {
  const field = encryptedField({ name: 'privateValue', type: 'text' })
  const stored = v2Encrypt('existing-v2', req.payload.secret)
  const result = await runHooks(field.hooks?.afterRead, stored, {
    collection: { slug: 'secrets' },
    schemaPath: ['privateValue'],
  })
  assert.equal(result, 'existing-v2')
})

test('bound factory supports key rotation and writes only with the current secret', async () => {
  const oldField = createEncryptedField({ secret: 'old-secret' })
  const newField = createEncryptedField({
    previousSecrets: ['old-secret'],
    secret: 'new-secret',
  })
  const old = oldField({ name: 'token', type: 'text' })
  const current = newField({ name: 'token', type: 'text' })
  const oldCiphertext = await runHooks(old.hooks?.beforeChange, 'token-value')
  assert.equal(
    await runHooks(current.hooks?.afterRead, oldCiphertext, { schemaPath: ['token'] }),
    'token-value',
  )

  const newCiphertext = await runHooks(current.hooks?.beforeChange, 'new-value')
  await assert.rejects(
    () => runHooks(old.hooks?.afterRead, newCiphertext, { schemaPath: ['token'] }),
    EncryptedFieldDecryptionError,
  )
})

test('decryption failures throw context without exposing ciphertext', async () => {
  const field = encryptedField({ name: 'token', type: 'text' })
  await assert.rejects(
    () =>
      runHooks(field.hooks?.afterRead, 'corrupt', {
        collection: { slug: 'accounts' },
        schemaPath: ['token'],
      }),
    (error: unknown) => {
      assert.ok(error instanceof EncryptedFieldDecryptionError)
      assert.match(error.message, /accounts\.token/)
      assert.doesNotMatch(error.message, /corrupt/)
      return true
    },
  )
})

test('undefined fallback remains an explicit compatibility option', async () => {
  const field = encryptedField({ name: 'token', type: 'text' }, { onDecryptionError: 'undefined' })
  assert.equal(
    await runHooks(field.hooks?.afterRead, 'corrupt', { schemaPath: ['token'] }),
    undefined,
  )
})

test('field preserves consumer admin components and TypeScript schema transforms', () => {
  const customSchema = () => ({ type: 'string' as const })
  const field = encryptedField({
    name: 'privateValue',
    type: 'number',
    hasMany: true,
    admin: { components: { Field: { path: '/custom#Field' } } },
    typescriptSchema: [customSchema],
  })
  assert.deepEqual(field.admin?.components?.Field, { path: '/custom#Field' })
  assert.equal(field.typescriptSchema?.length, 2)

  const encryptedSchema = field.typescriptSchema?.[0]?.({
    jsonSchema: { type: ['array', 'null'], items: { type: 'string' } },
  })
  assert.deepEqual(encryptedSchema, {
    items: { type: 'number' },
    type: ['array', 'null'],
  })
})
