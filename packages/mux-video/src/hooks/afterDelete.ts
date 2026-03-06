import { CollectionAfterDeleteHook } from 'payload'
import Mux from '@mux/mux-node'

const getAfterDeleteMuxVideoHook = (mux: Mux): CollectionAfterDeleteHook => {
  return async ({ id, doc }: any) => {
    const { assetId } = doc
    try {
      // Check if the asset still exists in Mux. If it was deleted there first, we don't need to do anything
      const video = await mux.video.assets.retrieve(assetId)

      if (video) {
        await mux.video.assets.delete(assetId)
      }
    } catch (err: any) {
      if (err.type !== 'not_found') {
        throw err
      }
    }
  }
}

export default getAfterDeleteMuxVideoHook
