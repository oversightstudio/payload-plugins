import assert from 'node:assert/strict'
import test from 'node:test'
import { MuxVideo } from '../src/collections/MuxVideo'

const getUrlHook = (fieldName: 'gifUrl' | 'posterUrl', mux: object) => {
  const collection = MuxVideo(mux as never, {
    enabled: true,
    initSettings: {
      tokenId: 'token',
      tokenSecret: 'secret',
      webhookSecret: 'webhook',
      jwtPrivateKey: 'private',
      jwtSigningKey: 'signing',
    },
    uploadSettings: { cors_origin: '*' },
  })
  const playbackOptions = collection.fields.find(
    (field) => 'name' in field && field.name === 'playbackOptions',
  ) as { fields: Array<Record<string, any>> }
  const field = playbackOptions.fields.find((candidate) => candidate.name === fieldName)

  return field?.hooks?.afterRead?.[0] as (args: unknown) => Promise<string>
}

test('signed image URLs keep transformations in JWT claims and only expose the token', async () => {
  const signCalls: Array<{ options: Record<string, unknown>; playbackId: string }> = []
  const mux = {
    jwt: {
      signPlaybackId: async (playbackId: string, options: Record<string, unknown>) => {
        signCalls.push({ playbackId, options })
        return 'signed-token'
      },
    },
  }

  const posterUrl = new URL(
    await getUrlHook(
      'posterUrl',
      mux,
    )({
      data: { posterTimestamp: 12 },
      siblingData: { playbackId: 'playback', playbackPolicy: 'signed' },
    }),
  )
  const gifUrl = new URL(
    await getUrlHook(
      'gifUrl',
      mux,
    )({
      data: { posterTimestamp: 12 },
      siblingData: { playbackId: 'playback', playbackPolicy: 'signed' },
    }),
  )

  assert.equal(posterUrl.search, '?token=signed-token')
  assert.equal(gifUrl.search, '?token=signed-token')
  assert.deepEqual(signCalls[0]?.options.params, { time: '12' })
  assert.deepEqual(signCalls[1]?.options.params, { start: '12' })
})

test('public animated previews use Mux start instead of thumbnail time', async () => {
  const gifUrl = new URL(
    await getUrlHook('gifUrl', { jwt: {} })({
      data: { posterTimestamp: 12 },
      siblingData: { playbackId: 'playback', playbackPolicy: 'public' },
    }),
  )

  assert.equal(gifUrl.searchParams.get('start'), '12')
  assert.equal(gifUrl.searchParams.has('time'), false)
})
