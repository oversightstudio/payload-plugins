import { PayloadHandler } from 'payload'
import { getAssetMetadata } from '../lib/getAssetMetadata'
import Mux from '@mux/mux-node'
import { MuxVideoPluginOptions } from '../types'

const handleAssetErrored = (assetId: string, errors: any) => {
  console.error(`Error with assetId: ${assetId}, logging error and returning 204...`)
  console.error(JSON.stringify(errors, null, 2))
}

const createSuccessResponse = () => new Response('Success!', { status: 200 })
const createErrorResponse = () => new Response('Error', { status: 204 })

export const muxWebhooksHandler =
  (mux: Mux, pluginOptions: MuxVideoPluginOptions): PayloadHandler =>
  async (req) => {
    if (!req.json) {
      return Response.error()
    }

    const body = await req.json()

    if (!body) {
      return Response.error()
    }

    mux.webhooks.verifySignature(JSON.stringify(body), req.headers)

    const collection = (pluginOptions.extendCollection as string) ?? 'mux-video'

    const event = body
    const assetId = event.object?.id

    const videos = await req.payload.find({
      collection,
      where: {
        assetId: {
          equals: assetId,
        },
      },
      limit: 1,
      pagination: false,
    })

    const video = videos.totalDocs > 0 ? videos.docs[0] : null

    // TODO: Maybe find a better way to handle this?
    if (!video) {
      return createSuccessResponse()
    }

    switch (event.type) {
      case 'video.asset.ready':
      case 'video.asset.updated': {
        try {
          await req.payload.update({
            collection,
            id: video.id,
            data: {
              ...getAssetMetadata(event.data),
            },
          })
        } catch (err) {
          return createErrorResponse()
        }
        break
      }

      case 'video.asset.deleted': {
        try {
          await req.payload.delete({
            collection,
            id: video.id,
          })
        } catch (err) {
          return createErrorResponse()
        }
        break
      }

      case 'video.asset.errored': {
        if (event.data?.errors) {
          handleAssetErrored(assetId, event.data.errors)
        }
        break
      }

      default:
        break
    }

    return createSuccessResponse()
  }
