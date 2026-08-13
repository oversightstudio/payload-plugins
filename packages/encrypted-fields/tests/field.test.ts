import assert from 'node:assert/strict'
import test from 'node:test'
import { encryptedField } from '../src/fields/encryptedField'

const req = { payload: { secret: 'payload-secret' } }

test('field encrypts after consumer transforms and decrypts before consumer reads', async () => {
  const field = encryptedField({
    name: 'privateValue',
    type: 'text',
    hooks: {
      beforeChange: [({ value }) => `${String(value)}-transformed`],
      afterRead: [({ value }) => `${String(value)}-read`],
    },
  })
  const beforeHooks = field.hooks?.beforeChange ?? []
  let stored: unknown = 'input'
  for (const hook of beforeHooks) stored = await hook({ req, value: stored } as never)
  assert.equal(typeof stored, 'string')
  assert.match(stored as string, /^v2:/)

  const afterHooks = field.hooks?.afterRead ?? []
  let result: unknown = stored
  for (const hook of afterHooks) result = await hook({ req, value: result } as never)
  assert.equal(result, 'input-transformed-read')
})

test('field preserves consumer admin component overrides', () => {
  const field = encryptedField({
    name: 'privateValue',
    type: 'text',
    admin: { components: { Field: { path: '/custom#Field' } } },
  })
  assert.deepEqual(field.admin?.components?.Field, { path: '/custom#Field' })
})
