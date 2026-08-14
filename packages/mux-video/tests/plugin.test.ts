import assert from 'node:assert/strict'
import test from 'node:test'
import type { Config } from 'payload'
import { muxVideoPlugin } from '../src/plugin'
import type { MuxVideoPluginOptions } from '../src/types'

const options = (): MuxVideoPluginOptions => ({
  enabled: true,
  initSettings: {
    tokenId: 'token-id',
    tokenSecret: 'token-secret',
    webhookSecret: 'webhook-secret',
  },
  uploadSettings: { cors_origin: 'https://example.com' },
})

const config = (value: object): Config => value as unknown as Config
const apply = (pluginOptions: MuxVideoPluginOptions, value: Config): Config =>
  muxVideoPlugin(pluginOptions)(value) as Config

test('disabled plugin is an exact no-op and does not require credentials', () => {
  const incoming = config({ collections: [], secret: 'payload-secret' })
  assert.equal(apply({ enabled: false } as MuxVideoPluginOptions, incoming), incoming)
})

test('plugin validates required credentials at startup', () => {
  const incoming = config({ collections: [], secret: 'payload-secret' })
  assert.throws(
    () =>
      apply(
        { ...options(), initSettings: { tokenId: '', tokenSecret: '', webhookSecret: '' } },
        incoming,
      ),
    /tokenId and tokenSecret/,
  )
})

test('extending a collection preserves its original order', () => {
  const incoming = config({
    collections: [
      { fields: [], slug: 'before' },
      { fields: [], slug: 'videos' },
      { fields: [], slug: 'after' },
    ],
    secret: 'payload-secret',
  })
  const result = apply({ ...options(), extendCollection: 'videos' }, incoming)
  assert.deepEqual(
    result.collections?.map(({ slug }) => slug),
    ['before', 'videos', 'after'],
  )
})

test('collectionAccess adds Payload-native CRUD rules without changing legacy endpoint access', () => {
  const create = () => true
  const read = () => false
  const legacyAccess = async () => true
  const result = apply(
    {
      ...options(),
      access: legacyAccess,
      collectionAccess: { create, read },
    },
    config({ collections: [], secret: 'payload-secret' }),
  )
  const collection = result.collections?.find(({ slug }) => slug === 'mux-video')

  assert.equal(collection?.access?.create, create)
  assert.equal(collection?.access?.read, read)
})

test('legacy access remains the generated collection read rule when no override is provided', async () => {
  const legacyAccess = async () => false
  const result = apply(
    { ...options(), access: legacyAccess },
    config({ collections: [], secret: 'payload-secret' }),
  )
  const collection = result.collections?.find(({ slug }) => slug === 'mux-video')

  assert.equal(await collection?.access?.read?.({ req: { user: { id: 'user' } } } as never), false)
})
