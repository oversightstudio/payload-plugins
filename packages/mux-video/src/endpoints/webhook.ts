import { PayloadHandler } from 'payload'
import { getAssetMetadata } from '../lib/getAssetMetadata'
import Mux from '@mux/mux-node'

const findVideoByAssetId = async (payload: any, assetId: string) => {
  const videos = await payload.find({
    collection: 'mux-video',
    where: {
      assetId: {
        equals: assetId,
      },
    },
    limit: 1,
    pagination: false,
  })

  return videos.totalDocs > 0 ? videos.docs[0] : null
}

const handleAssetErrored = (assetId: string, errors: any) => {
  console.error(`Error with assetId: ${assetId}, logging error and returning 204...`)
  console.error(JSON.stringify(errors, null, 2))
}

const createSuccessResponse = () => new Response('Success!', { status: 200 })
const createErrorResponse = () => new Response('Error', { status: 204 })

export const muxWebhooksHandler =
  (mux: Mux): PayloadHandler =>
  async (req) => {
    if (!req.json) {
      return Response.error()
    }

    const body = await req.json()

    if (!body) {
      return Response.error()
    }

    mux.webhooks.verifySignature(JSON.stringify(body), req.headers)

    const event = body
    const assetId = event.object?.id

    const video = await findVideoByAssetId(req.payload, assetId)

    // TODO: Find a better way to handle this
    if (!video) {
      return createSuccessResponse()
    }

    switch (event.type) {
      case 'video.asset.ready':
      case 'video.asset.updated': {
        try {
          await req.payload.update({
            collection: 'mux-video',
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
            collection: 'mux-video',
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
