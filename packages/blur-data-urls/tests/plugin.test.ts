import assert from 'node:assert/strict'
import test from 'node:test'
import type { CollectionConfig, Config } from 'payload'
import sharp from 'sharp'
import { extendCollectionsConfig } from '../src/extendCollectionConfig'
import { createBeforeChangeHook } from '../src/hooks/beforeChange'
import { blurDataUrlsPlugin } from '../src/plugin'

const media = (): CollectionConfig => ({ fields: [], slug: 'media', upload: true })

test('disabled plugin is an exact no-op', () => {
  const config = { collections: [media()], secret: 'secret' } as Config
  assert.equal(
    blurDataUrlsPlugin({ collections: [{ slug: 'media' }], enabled: false })(config),
    config,
  )
})

test('schema extension is idempotent and preserves hooks', () => {
  const originalHook = () => undefined
  const collection = media()
  collection.hooks = { beforeChange: [originalHook] }
  const [extended] = extendCollectionsConfig([collection], {
    collections: [{ slug: 'media' }],
    enabled: true,
  })
  const [twice] = extendCollectionsConfig([extended], {
    collections: [{ slug: 'media' }],
    enabled: true,
  })
  assert.equal(
    twice.fields.filter((field) => 'name' in field && field.name === 'blurDataUrl').length,
    1,
  )
  assert.equal(twice.hooks?.beforeChange?.[0], originalHook)
})

test('unknown collections and invalid image options fail at startup', () => {
  assert.throws(
    () =>
      blurDataUrlsPlugin({ collections: [{ slug: 'missing' }] })({
        collections: [media()],
        secret: 'secret',
      } as Config),
    /Collections not found/,
  )
  assert.throws(
    () =>
      blurDataUrlsPlugin({ collections: [{ slug: 'media' }], blurOptions: { width: 0 } })({
        collections: [media()],
        secret: 'secret',
      } as Config),
    /positive integer/,
  )
})

test('hook generates one correctly labelled PNG placeholder from the original upload', async () => {
  const original = await sharp({
    create: { background: { alpha: 1, b: 30, g: 20, r: 10 }, channels: 4, height: 8, width: 16 },
  })
    .jpeg()
    .toBuffer()
  const generatedSize = await sharp({
    create: { background: { alpha: 1, b: 200, g: 200, r: 200 }, channels: 4, height: 2, width: 2 },
  })
    .png()
    .toBuffer()
  const data: Record<string, unknown> = {
    filename: 'original.jpg',
    mimeType: 'image/jpeg',
    sizes: { thumbnail: { filename: 'thumbnail.png' } },
  }
  const hook = createBeforeChangeHook({ blur: 1, height: 'auto', width: 8 })
  const result = await hook({
    data,
    req: {
      file: { data: original, name: 'original.jpg', size: original.length },
      payloadUploadSizes: { thumbnail: generatedSize },
    },
  } as never)
  assert.match(String(result.blurDataUrl), /^data:image\/png;base64,iVBOR/)
  const metadata = await sharp(
    Buffer.from(String(result.blurDataUrl).split(',')[1], 'base64'),
  ).metadata()
  assert.equal(metadata.width, 8)
  assert.equal(metadata.height, 4)
})
