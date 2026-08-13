import assert from 'node:assert/strict'
import test from 'node:test'
import type { Config } from 'payload'
import { CONTENT_GUARD_RUNTIME_KEY } from '../src/constants'
import { contentGuardPlugin } from '../src/plugin'

const baseConfig = (): Config =>
  ({
    admin: { user: 'users' },
    collections: [],
    secret: 'payload-secret',
  }) as unknown as Config

const apply = (options: Parameters<typeof contentGuardPlugin>[0], config: Config): Config =>
  contentGuardPlugin(options)(config) as Config

test('disabled plugin is an exact no-op', () => {
  const config = baseConfig()
  assert.equal(apply({ enabled: false }, config), config)
})

test('plugin registers one global and uses the Payload secret', () => {
  const config = apply({ defaultPassword: 'client-review' }, baseConfig())
  assert.equal(config.globals?.at(-1)?.slug, 'content-guard')
  const runtime = config.custom?.[CONTENT_GUARD_RUNTIME_KEY] as {
    noIndex: boolean
    signingSecret: string
  }
  assert.equal(runtime.signingSecret, 'payload-secret')
  assert.equal(runtime.noIndex, true)
  const fields = config.globals?.at(-1)?.fields ?? []
  assert.equal(
    fields.some((field) => 'name' in field && field.name === 'active'),
    true,
  )
  assert.equal(
    fields.some((field) => 'name' in field && field.name === 'password'),
    true,
  )
})

test('missing admin collection and invalid rate settings fail at startup', () => {
  assert.throws(
    () => apply(undefined, { collections: [], secret: 'secret' } as unknown as Config),
    /config\.admin\.user/,
  )
  assert.throws(() => apply({ rateLimit: { maxAttempts: 0 } }, baseConfig()), /maxAttempts/)
})
