import { CollectionBeforeChangeHook } from 'payload'
import delay from '../lib/delay'
import { getAssetMetadata } from '../lib/getAssetMetadata'
import Mux from '@mux/mux-node'

const getBeforeChangeMuxVideoHook = (mux: Mux, collection: string): CollectionBeforeChangeHook => {
  return async ({ req, data: incomingData, operation, originalDoc }) => {
    let data = { ...incomingData }
    try {
      if (!originalDoc?.assetId || originalDoc.assetId !== data.assetId) {
        /* If this is an update, delete the old video first */
        if (operation === 'update' && originalDoc.assetId !== data.assetId) {
          await mux.video.assets.delete(originalDoc.assetId)
        }

        /* Now, get the asset and append its' information to the doc */
        let asset = await mux.video.assets.retrieve(data.assetId)
        /* Poll for up to 6 seconds, then the webhook will handle setting the metadata */
        let delayDuration = 1500
        const pollingLimit = 6
        const timeout = Date.now() + pollingLimit * 1000
        while (asset.status === 'preparing') {
          if (Date.now() > timeout) {
            break
          }
          await delay(delayDuration)
          asset = await mux.video.assets.retrieve(data.assetId)
        }

        if (asset.status === 'errored') {
          /* If the asset errored, delete it and throw an error */
          await mux.video.assets.delete(data.assetId)
          throw new Error(
            `Unable to prepare asset: ${asset.status}. It's been deleted, please try again.`,
          )
        }

        /* If the asset is ready, we can get the metadata now */
        if (asset.status === 'ready') {
          data = {
            ...data,
            ...getAssetMetadata(asset),
          }
        }

        /* Override some of the built-in file data */
        data.url = ''

        /* Ensure the title is unique, since we're setting the filename equal to the title and the filename must be unique */
        const existingVideo = await req.payload.find({
          collection,
          where: {
            title: {
              contains: data.title,
            },
          },
        })

        const uniqueTitle = `${data.title}${existingVideo.totalDocs > 0 ? ` (${existingVideo.totalDocs})` : ''}`
        data.title = uniqueTitle
        data.filename = uniqueTitle
      }
    } catch (err: unknown) {
      req.payload.logger.error(
        `[payload-mux] There was an error while uploading files corresponding to the collection with filename ${data.filename}:`,
      )
      req.payload.logger.error(err)
      throw err
    }
    return {
      ...data,
    }
  }
}

export default getBeforeChangeMuxVideoHook
