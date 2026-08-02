import type Mux from '@mux/mux-node'
import type { CollectionAfterChangeHook } from 'payload'

const getAfterChangeMuxVideoHook = (mux: Mux): CollectionAfterChangeHook => {
  return async ({ doc, operation, previousDoc, req }) => {
    const previousAssetId = previousDoc?.assetId
    const currentAssetId = doc?.assetId

    if (
      operation !== 'update' ||
      typeof previousAssetId !== 'string' ||
      typeof currentAssetId !== 'string' ||
      previousAssetId === currentAssetId
    ) {
      return doc
    }

    try {
      await mux.video.assets.delete(previousAssetId)
    } catch (err) {
      // The document update has already committed. Keep the valid replacement and log the
      // recoverable orphan instead of failing after the old remote asset may have been deleted.
      req.payload.logger.error({
        err,
        msg: `[payload-mux] Unable to delete replaced Mux asset ${previousAssetId}`,
      })
    }

    return doc
  }
}

export default getAfterChangeMuxVideoHook
