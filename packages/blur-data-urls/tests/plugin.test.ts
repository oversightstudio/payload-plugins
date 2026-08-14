import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

import type { CollectionBeforeChangeHook, CollectionConfig, Config, TextField } from 'payload'
import sharp from 'sharp'

import { extendCollectionsConfig } from '../src/extendCollectionConfig'
import { createBeforeChangeHook, isBlurDataUrlsHook } from '../src/hooks/beforeChange'
import { resolvePluginOptions } from '../src/options'
import { blurDataUrlsPlugin } from '../src/plugin'
import { generatePlaceholderDataUrl } from '../src/utilities/generateDataUrl'

const media = (): CollectionConfig => ({ fields: [], slug: 'media', upload: true })

const imageBuffer = async (width = 16, height = 8): Promise<Buffer> =>
  sharp({
    create: { background: { alpha: 1, b: 30, g: 20, r: 10 }, channels: 4, height, width },
  })
    .jpeg()
    .toBuffer()

const hookArgs = (
  file: { data?: Buffer; mimetype: string; name: string; size?: number; tempFilePath?: string },
  data: Record<string, unknown> = {},
  warn: (message: string) => void = () => undefined,
) =>
  ({
    data: { filename: file.name, mimeType: file.mimetype, ...data },
    operation: 'create',
    req: {
      file: {
        data: file.data ?? Buffer.alloc(0),
        size: file.size ?? file.data?.length ?? 0,
        ...file,
      },
      payload: { logger: { warn } },
    },
  }) as never

test('disabled plugin is an exact no-op', () => {
  const config = { collections: [media()], secret: 'secret' } as Config
  assert.equal(
    blurDataUrlsPlugin({ collections: [{ slug: 'media' }], enabled: false })(config),
    config,
  )
})

test('schema extension is idempotent and preserves existing hooks', () => {
  const originalHook: CollectionBeforeChangeHook = () => undefined
  const collection = media()
  collection.hooks = { beforeChange: [originalHook] }
  const options = resolvePluginOptions({ collections: [{ slug: 'media' }] })

  const [extended] = extendCollectionsConfig([collection], options)
  const [twice] = extendCollectionsConfig([extended], options)

  assert.equal(
    twice.fields.filter((field) => 'name' in field && field.name === 'blurDataUrl').length,
    1,
  )
  assert.equal(twice.hooks?.beforeChange?.[0], originalHook)
  assert.equal(twice.hooks?.beforeChange?.filter((hook) => isBlurDataUrlsHook(hook)).length, 1)
})

test('generated field is hidden in admin and a compatible custom field is preserved', () => {
  const options = resolvePluginOptions({
    collections: [{ slug: 'media' }],
    fieldName: 'placeholderDataURL',
    placeholder: { type: 'pixel' },
  })
  const [generated] = extendCollectionsConfig([media()], options)
  const field = generated.fields.find(
    (candidate) => 'name' in candidate && candidate.name === 'placeholderDataURL',
  )
  assert.equal((field as TextField | undefined)?.admin?.hidden, true)

  const custom = media()
  custom.fields.push({ name: 'placeholderDataURL', type: 'text', admin: { hidden: false } })
  const [preserved] = extendCollectionsConfig([custom], options)
  assert.equal(preserved.fields[0], custom.fields[0])
})

test('invalid collections, field collisions, and image options fail at startup', () => {
  assert.throws(
    () =>
      blurDataUrlsPlugin({ collections: [{ slug: 'missing' }] })({
        collections: [media()],
        secret: 'secret',
      } as unknown as Config),
    /Collections not found/,
  )
  assert.throws(
    () =>
      blurDataUrlsPlugin({ collections: [{ slug: 'documents' }] })({
        collections: [{ fields: [], slug: 'documents' }],
        secret: 'secret',
      } as unknown as Config),
    /upload-enabled/,
  )

  const incompatible = media()
  incompatible.fields.push({ name: 'blurDataUrl', type: 'number' })
  assert.throws(
    () => extendCollectionsConfig([incompatible], resolvePluginOptions({ collections: [media()] })),
    /single-value text field/,
  )
  assert.throws(
    () =>
      resolvePluginOptions({ collections: [media()], placeholder: { type: 'pixel', quality: 0 } }),
    /quality/,
  )
  assert.throws(
    () =>
      resolvePluginOptions({
        blurOptions: { width: 16 },
        collections: [media()],
        placeholder: { type: 'blur' },
      }),
    /either placeholder or blurOptions/,
  )
})

test('legacy blurOptions still generate an auto-oriented PNG from the original upload', async () => {
  const rotated = await sharp({
    create: { background: '#336699', channels: 3, height: 8, width: 16 },
  })
    .jpeg()
    .withMetadata({ orientation: 6 })
    .toBuffer()
  const options = resolvePluginOptions({
    blurOptions: { blur: 1, height: 'auto', width: 8 },
    collections: [{ slug: 'media' }],
  })
  const result = await createBeforeChangeHook(options)(
    hookArgs({ data: rotated, mimetype: 'image/jpeg', name: 'portrait.jpg' }),
  )

  assert.match(String(result.blurDataUrl), /^data:image\/png;base64,iVBOR/)
  const metadata = await sharp(
    Buffer.from(String(result.blurDataUrl).split(',')[1], 'base64'),
  ).metadata()
  assert.equal(metadata.width, 8)
  assert.equal(metadata.height, 16)
})

test('pixel mode generates an auto-oriented WebP and skips SVG uploads', async () => {
  const original = await imageBuffer()
  const options = resolvePluginOptions({
    collections: [{ slug: 'media' }],
    fieldName: 'placeholderDataURL',
    placeholder: { quality: 70, type: 'pixel', width: 8 },
  })
  const hook = createBeforeChangeHook(options)
  const result = await hook(
    hookArgs({ data: original, mimetype: 'image/jpeg', name: 'original.jpg' }),
  )
  assert.match(String(result.placeholderDataURL), /^data:image\/webp;base64,UklGR/)

  const skipped = await hook(
    hookArgs(
      { data: Buffer.from('<svg/>'), mimetype: 'image/svg+xml', name: 'logo.svg' },
      {
        placeholderDataURL: 'stale',
      },
    ),
  )
  assert.equal(skipped.placeholderDataURL, null)
})

test('temporary-file uploads are read from disk when the request buffer is empty', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'blur-data-urls-'))
  const filename = path.join(directory, 'upload.jpg')
  try {
    await writeFile(filename, await imageBuffer())
    const options = resolvePluginOptions({ collections: [{ slug: 'media' }] })
    const result = await createBeforeChangeHook(options)(
      hookArgs({ mimetype: 'image/jpeg', name: 'upload.jpg', tempFilePath: filename }),
    )
    assert.match(String(result.blurDataUrl), /^data:image\/png;base64,/)
  } finally {
    await rm(directory, { force: true, recursive: true })
  }
})

test('replacement uploads clear stale placeholders for non-images and logged failures', async () => {
  const throwOptions = resolvePluginOptions({ collections: [{ slug: 'media' }] })
  const nonImage = await createBeforeChangeHook(throwOptions)(
    hookArgs(
      { data: Buffer.from('pdf'), mimetype: 'application/pdf', name: 'document.pdf' },
      {
        blurDataUrl: 'stale',
      },
    ),
  )
  assert.equal(nonImage.blurDataUrl, null)

  const warnings: string[] = []
  const logOptions = resolvePluginOptions({
    collections: [{ slug: 'media' }],
    onError: 'log',
  })
  const failed = await createBeforeChangeHook(logOptions)(
    hookArgs(
      { data: Buffer.from('not an image'), mimetype: 'image/jpeg', name: 'broken.jpg' },
      { blurDataUrl: 'stale' },
      (message) => warnings.push(message),
    ),
  )
  assert.equal(failed.blurDataUrl, null)
  assert.equal(warnings.length, 1)
  assert.match(warnings[0], /broken\.jpg/)

  await assert.rejects(
    createBeforeChangeHook(throwOptions)(
      hookArgs({ data: Buffer.from('not an image'), mimetype: 'image/jpeg', name: 'broken.jpg' }),
    ),
  )
})

test('public generator bounds extreme aspect ratios', async () => {
  const tall = await imageBuffer(10, 1000)
  const value = await generatePlaceholderDataUrl(tall, {
    blur: 1,
    maxDimension: 64,
    type: 'blur',
    width: 32,
  })
  const metadata = await sharp(Buffer.from(value.split(',')[1], 'base64')).metadata()
  assert.ok((metadata.width ?? Infinity) <= 32)
  assert.ok((metadata.height ?? Infinity) <= 64)
})
