import type Mux from '@mux/mux-node'
import type { CollectionBeforeChangeHook, Where } from 'payload'
import delay from '../lib/delay'
import { getAssetMetadata } from '../lib/getAssetMetadata'

const getBeforeChangeMuxVideoHook = (mux: Mux, collection: string): CollectionBeforeChangeHook => {
  return async ({ req, data: incomingData, originalDoc, context }) => {
    let data = { ...incomingData }
    const skipMuxSync = (context as { skipMuxVideoBeforeChangeSync?: boolean } | undefined)
      ?.skipMuxVideoBeforeChangeSync

    try {
      const assetId = data.assetId
      const hasIncomingAsset = typeof assetId === 'string' && assetId.length > 0
      const hasAssetChanged = hasIncomingAsset && originalDoc?.assetId !== assetId

      if (!originalDoc?.assetId || hasAssetChanged) {
        if (!hasIncomingAsset) {
          return data
        }

        if (!skipMuxSync) {
          /* Validate the replacement before the old asset is removed after a successful update. */
          let asset = await mux.video.assets.retrieve(assetId)
          /* Poll for up to 6 seconds, then the webhook will handle setting the metadata */
          const delayDuration = 1500
          const pollingLimit = 6
          const timeout = Date.now() + pollingLimit * 1000
          while (asset.status === 'preparing') {
            if (Date.now() > timeout) {
              break
            }
            await delay(delayDuration)
            asset = await mux.video.assets.retrieve(assetId)
          }

          if (asset.status === 'errored') {
            /* If the asset errored, delete it and throw an error */
            await mux.video.assets.delete(assetId)
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
        }

        /* Override some of the built-in file data */
        data.url = ''

        /* Ensure the title is unique, since we're setting the filename equal to the title and the filename must be unique */
        const baseTitle =
          typeof data.title === 'string' && data.title.trim() ? data.title.trim() : assetId
        let uniqueTitle = baseTitle
        let suffix = 1
        while (suffix < 10_000) {
          const clauses: Where[] = [{ title: { equals: uniqueTitle } }]
          if (originalDoc?.id) clauses.push({ id: { not_equals: originalDoc.id } })
          const existingVideo = await req.payload.find({
            collection,
            depth: 0,
            limit: 1,
            overrideAccess: true,
            req,
            where: { and: clauses },
          } as never)
          if (existingVideo.totalDocs === 0) break
          uniqueTitle = `${baseTitle} (${suffix})`
          suffix += 1
        }
        if (suffix >= 10_000) throw new Error('[payload-mux] Unable to allocate a unique title.')
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
