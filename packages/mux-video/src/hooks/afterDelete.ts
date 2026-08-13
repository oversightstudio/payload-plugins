import type Mux from '@mux/mux-node'
import type { CollectionAfterDeleteHook } from 'payload'

const getAfterDeleteMuxVideoHook = (mux: Mux): CollectionAfterDeleteHook => {
  return async ({ doc, context }) => {
    if (context?.skipMuxVideoAfterDeleteSync) {
      return doc
    }

    const { assetId } = doc
    if (typeof assetId !== 'string' || !assetId) return doc
    try {
      // Check if the asset still exists in Mux. If it was deleted there first, we don't need to do anything
      const video = await mux.video.assets.retrieve(assetId)

      if (video) {
        await mux.video.assets.delete(assetId)
      }
    } catch (err: unknown) {
      const muxError = err as { status?: number; type?: string }
      if (muxError.type !== 'not_found' && muxError.status !== 404) {
        throw err
      }
    }
    return doc
  }
}

export default getAfterDeleteMuxVideoHook
