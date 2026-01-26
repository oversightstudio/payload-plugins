import { CollectionAfterDeleteHook } from 'payload'
import Mux from '@mux/mux-node'

const getAfterDeleteMuxVideoHook = (mux: Mux): CollectionAfterDeleteHook => {
  return async ({ id, doc }: any) => {
    const { assetId } = doc
    try {
      // Check if the asset still exists in Mux. If it was deleted there first, we don't need to do anything
      console.log(`[payload-mux] Checking if asset ${assetId} exists in Mux...`)
      const video = await mux.video.assets.retrieve(assetId)

      if (video) {
        console.log(`[payload-mux] Asset ${id} exists in Mux, deleting...`)
        const response = await mux.video.assets.delete(assetId)
      }
    } catch (err: any) {
      const type = err?.error?.error?.type ?? err?.error?.type ?? err?.type
      if (type === 'not_found' || type === 'invalid_parameters') {
        console.log(`[payload-mux] Asset ${id} not found in Mux, continuing...`)
      } else {
        console.error(`[payload-mux] Error deleting asset ${id} from Mux...`)
        console.error(err)
        throw err
      }
    }
  }
}

export default getAfterDeleteMuxVideoHook
