import assert from 'node:assert/strict'
import test from 'node:test'
import type { Asset } from '@mux/mux-node/resources/video/assets.mjs'
import { onInitExtension } from '../src/lib/onInitExtension'

const makeAsset = (id: string, extra: Partial<Asset> = {}): Asset =>
  ({ id, status: 'ready', ...extra }) as Asset

const makeList = (assets: Asset[], error?: Error) => () => ({
  async *[Symbol.asyncIterator]() {
    for (const asset of assets) {
      yield asset
    }
    if (error) {
      throw error
    }
  },
})

const makeLogger = () => ({
  errors: [] as unknown[],
  info: () => undefined,
  error(value: unknown) {
    this.errors.push(value)
  },
})

test('unset and none behaviors perform no remote or database work', async () => {
  for (const onInitBehavior of [undefined, 'none'] as const) {
    let listCalls = 0
    let findCalls = 0
    await onInitExtension(
      {
        onInitBehavior,
        uploadSettings: { cors_origin: '*' },
      },
      {
        find: async () => {
          findCalls += 1
        },
        logger: makeLogger(),
      } as never,
      {
        video: {
          assets: {
            list: () => {
              listCalls += 1
            },
          },
        },
      } as never,
    )

    assert.equal(listCalls, 0)
    assert.equal(findCalls, 0)
  }
})

test('createOnly consumes every listed asset and stores only plugin fields', async () => {
  const created: Record<string, unknown>[] = []
  const assets = [
    makeAsset('existing'),
    makeAsset('missing', { aspect_ratio: undefined, duration: undefined, status: 'preparing' }),
  ]

  await onInitExtension(
    {
      onInitBehavior: 'createOnly',
      uploadSettings: { cors_origin: '*' },
    },
    {
      create: async ({
        context,
        data,
      }: {
        context: Record<string, unknown>
        data: Record<string, unknown>
      }) => {
        assert.deepEqual(context, { skipMuxVideoBeforeChangeSync: true })
        created.push(data)
      },
      find: async () => ({ docs: [{ assetId: 'existing', id: 'doc-existing' }], totalDocs: 1 }),
      logger: makeLogger(),
    } as never,
    {
      video: {
        assets: {
          list: makeList(assets),
        },
      },
    } as never,
  )

  assert.deepEqual(created, [{ assetId: 'missing', title: 'Video missing' }])
})

test('deleteOnly removes stale Payload entries without deleting remote assets', async () => {
  const deleted: unknown[] = []
  const retrieved: string[] = []

  await onInitExtension(
    {
      onInitBehavior: 'deleteOnly',
      uploadSettings: { cors_origin: '*' },
    },
    {
      delete: async (options: unknown) => deleted.push(options),
      find: async () => ({
        docs: [
          { assetId: 'present', id: 'doc-present' },
          { assetId: 'missing', id: 'doc-missing' },
        ],
        totalDocs: 2,
      }),
      logger: makeLogger(),
    } as never,
    {
      video: {
        assets: {
          list: makeList([makeAsset('present')]),
          retrieve: async (id: string) => {
            retrieved.push(id)
            throw { status: 404 }
          },
        },
      },
    } as never,
  )

  assert.deepEqual(retrieved, ['missing'])
  assert.deepEqual(deleted, [
    {
      collection: 'mux-video',
      context: { skipMuxVideoAfterDeleteSync: true },
      id: 'doc-missing',
      overrideAccess: true,
    },
  ])
})

test('delete reconciliation keeps an entry when a fresh retrieve finds the asset', async () => {
  let deleteCalls = 0

  await onInitExtension(
    {
      onInitBehavior: 'createAndDelete',
      uploadSettings: { cors_origin: '*' },
    },
    {
      delete: async () => {
        deleteCalls += 1
      },
      find: async () => ({ docs: [{ assetId: 'stale-list', id: 'doc' }], totalDocs: 1 }),
      logger: makeLogger(),
    } as never,
    {
      video: {
        assets: {
          list: makeList([]),
          retrieve: async () => makeAsset('stale-list'),
        },
      },
    } as never,
  )

  assert.equal(deleteCalls, 0)
})

test('delete reconciliation keeps an entry when Mux cannot confirm absence', async () => {
  let deleteCalls = 0
  const logger = makeLogger()

  await onInitExtension(
    {
      onInitBehavior: 'deleteOnly',
      uploadSettings: { cors_origin: '*' },
    },
    {
      delete: async () => {
        deleteCalls += 1
      },
      find: async () => ({ docs: [{ assetId: 'unknown', id: 'doc' }], totalDocs: 1 }),
      logger,
    } as never,
    {
      video: {
        assets: {
          list: makeList([]),
          retrieve: async () => {
            throw { status: 503 }
          },
        },
      },
    } as never,
  )

  assert.equal(deleteCalls, 0)
  assert.equal(logger.errors.length, 1)
})

test('simultaneous reconciliation treats an already-created entry as success', async () => {
  let findCalls = 0
  const logger = makeLogger()

  await onInitExtension(
    {
      onInitBehavior: 'createOnly',
      uploadSettings: { cors_origin: '*' },
    },
    {
      create: async () => {
        throw new Error('unique constraint')
      },
      find: async () => {
        findCalls += 1
        return findCalls === 1
          ? { docs: [], totalDocs: 0 }
          : { docs: [{ assetId: 'asset', id: 'other-replica' }], totalDocs: 1 }
      },
      logger,
    } as never,
    {
      video: {
        assets: {
          list: makeList([makeAsset('asset')]),
        },
      },
    } as never,
  )

  assert.equal(findCalls, 2)
  assert.equal(logger.errors.length, 0)
})

test('simultaneous reconciliation treats an already-deleted entry as success', async () => {
  let findCalls = 0
  const logger = makeLogger()

  await onInitExtension(
    {
      onInitBehavior: 'deleteOnly',
      uploadSettings: { cors_origin: '*' },
    },
    {
      delete: async () => {
        throw new Error('document no longer exists')
      },
      find: async () => {
        findCalls += 1
        return findCalls === 1
          ? { docs: [{ assetId: 'missing', id: 'doc' }], totalDocs: 1 }
          : { docs: [], totalDocs: 0 }
      },
      logger,
    } as never,
    {
      video: {
        assets: {
          list: makeList([]),
          retrieve: async () => {
            throw { status: 404 }
          },
        },
      },
    } as never,
  )

  assert.equal(findCalls, 2)
  assert.equal(logger.errors.length, 0)
})

test('a failed Mux listing performs no Payload reads or mutations', async () => {
  let payloadCalls = 0
  const logger = makeLogger()
  const payloadMethod = async () => {
    payloadCalls += 1
  }

  await onInitExtension(
    {
      onInitBehavior: 'createAndDelete',
      uploadSettings: { cors_origin: '*' },
    },
    {
      create: payloadMethod,
      delete: payloadMethod,
      find: payloadMethod,
      logger,
    } as never,
    {
      video: {
        assets: {
          list: makeList([makeAsset('first-page')], new Error('later page failed')),
        },
      },
    } as never,
  )

  assert.equal(payloadCalls, 0)
  assert.equal(logger.errors.length, 1)
})
