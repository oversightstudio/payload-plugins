import assert from 'node:assert/strict'
import test from 'node:test'
import { getMuxUploadHandler } from '../src/endpoints/upload'
import { syncMuxVideoHandler } from '../src/endpoints/sync'
import getAfterChangeMuxVideoHook from '../src/hooks/afterChange'
import getBeforeChangeMuxVideoHook from '../src/hooks/beforeChange'

const logger = {
  error: () => undefined,
}

test('GET upload awaits asynchronous access denial', async () => {
  let retrieved = false
  const mux = {
    video: {
      uploads: {
        retrieve: async () => {
          retrieved = true
          return { id: 'upload' }
        },
      },
    },
  }
  const handler = getMuxUploadHandler(mux as never, {
    access: async () => false,
    uploadSettings: { cors_origin: '*' },
  })

  const response = await handler({ query: { id: 'upload' } } as never)

  assert.equal(response.status, 403)
  assert.equal(retrieved, false)
})

test('failed replacement validation does not delete the existing asset', async () => {
  const deleted: string[] = []
  const mux = {
    video: {
      assets: {
        delete: async (id: string) => deleted.push(id),
        retrieve: async () => {
          throw new Error('invalid replacement')
        },
      },
    },
  }
  const hook = getBeforeChangeMuxVideoHook(mux as never, 'mux-video')

  await assert.rejects(
    hook({
      context: {},
      data: { assetId: 'new', title: 'Replacement' },
      operation: 'update',
      originalDoc: { assetId: 'old' },
      req: { payload: { logger } },
    } as never),
    /invalid replacement/,
  )
  assert.deepEqual(deleted, [])
})

test('old asset cleanup happens only after a successful document update', async () => {
  const deleted: string[] = []
  const mux = {
    video: {
      assets: {
        delete: async (id: string) => deleted.push(id),
      },
    },
  }
  const hook = getAfterChangeMuxVideoHook(mux as never)
  const doc = { assetId: 'new' }

  const result = await hook({
    doc,
    operation: 'update',
    previousDoc: { assetId: 'old' },
    req: { payload: { logger } },
  } as never)

  assert.equal(result, doc)
  assert.deepEqual(deleted, ['old'])
})

test('sync applies Payload document access using the current request', async () => {
  const request = {
    payload: {
      findByID: async (options: unknown) => {
        assert.deepEqual(options, {
          collection: 'mux-video',
          depth: 0,
          id: 'video',
          overrideAccess: false,
          req: request,
        })
        return { id: 'video', playbackOptions: [{ playbackId: 'playback' }] }
      },
      logger,
    },
    query: { id: 'video' },
    user: { id: 'user' },
  }
  const handler = syncMuxVideoHandler({} as never, {
    access: async () => true,
    uploadSettings: { cors_origin: '*' },
  })

  const response = await handler(request as never)

  assert.equal(response.status, 200)
  assert.equal((await response.json()).ready, true)
})

test('sync preserves forbidden and not-found responses from Payload access checks', async () => {
  for (const status of [403, 404]) {
    const handler = syncMuxVideoHandler({} as never, {
      access: async () => true,
      uploadSettings: { cors_origin: '*' },
    })
    const response = await handler({
      payload: {
        findByID: async () => {
          throw { status }
        },
        logger,
      },
      query: { id: 'video' },
    } as never)

    assert.equal(response.status, status)
  }
})

test('sync refetches an internally updated document with caller access before returning it', async () => {
  const findCalls: unknown[] = []
  const request = {
    payload: {
      findByID: async (options: unknown) => {
        findCalls.push(options)
        return findCalls.length === 1
          ? { assetId: 'asset', id: 'video' }
          : { id: 'video', playbackOptions: [{ playbackId: 'visible' }] }
      },
      logger,
      update: async (options: unknown) => {
        assert.equal((options as { overrideAccess: boolean }).overrideAccess, true)
        assert.equal((options as { req: unknown }).req, request)
      },
    },
    query: { id: 'video' },
  }
  const handler = syncMuxVideoHandler(
    {
      video: {
        assets: {
          retrieve: async () => ({
            id: 'asset',
            playback_ids: [{ id: 'visible', policy: 'public' }],
            status: 'ready',
          }),
        },
      },
    } as never,
    {
      access: async () => true,
      uploadSettings: { cors_origin: '*' },
    },
  )

  const response = await handler(request as never)
  const body = await response.json()

  assert.equal(response.status, 200)
  assert.equal(findCalls.length, 2)
  assert.equal((findCalls[1] as { overrideAccess: boolean }).overrideAccess, false)
  assert.equal((findCalls[1] as { req: unknown }).req, request)
  assert.equal(body.video.playbackOptions[0].playbackId, 'visible')
})
