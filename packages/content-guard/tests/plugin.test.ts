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
    tokenExpiration: number
  }
  assert.equal(runtime.signingSecret, 'payload-secret')
  assert.equal(runtime.noIndex, true)
  assert.equal(runtime.tokenExpiration, 604_800)
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
  assert.throws(() => apply({ tokenExpiration: 0 }, baseConfig()), /tokenExpiration/)
})

test('token expiration is configurable in seconds', () => {
  const config = apply({ tokenExpiration: 3_600 }, baseConfig())
  const runtime = config.custom?.[CONTENT_GUARD_RUNTIME_KEY] as { tokenExpiration: number }
  assert.equal(runtime.tokenExpiration, 3_600)
})

test('unlock cookie uses the configured token expiration', async () => {
  const config = apply({ tokenExpiration: 3_600 }, baseConfig())
  const endpoints = config.globals?.at(-1)?.endpoints
  assert.ok(Array.isArray(endpoints))
  const unlock = endpoints.find((endpoint) => endpoint.path === '/unlock')?.handler
  assert.ok(unlock)

  const response = await unlock({
    headers: new Headers({
      'content-type': 'application/json',
      origin: 'https://preview.example.com',
    }),
    payload: {
      findGlobal: async () => ({ active: true, password: 'client-review' }),
    },
    text: async () => JSON.stringify({ password: 'client-review' }),
    url: 'https://preview.example.com/api/globals/content-guard/unlock',
  } as never)

  assert.equal(response.status, 200)
  assert.match(response.headers.get('set-cookie') ?? '', /Max-Age=3600/)
})
