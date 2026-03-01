import { PayloadHandler } from 'payload'
import { getAssetMetadata } from '../lib/getAssetMetadata'
import Mux from '@mux/mux-node'
import { MuxVideoPluginOptions } from '../types'

const handleAssetErrored = (req: any, assetId: string, errors: any) => {
  req.payload.logger.error(`[payload-mux] Error with assetId: ${assetId}`)
  req.payload.logger.error(JSON.stringify(errors, null, 2))
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

    if (!video) {
      if (
        pluginOptions.autoCreateOnWebhook &&
        (event.type === 'video.asset.created' ||
          event.type === 'video.asset.ready' ||
          event.type === 'video.asset.updated')
      ) {
        try {
          await req.payload.create({
            collection,
            data: {
              title: event.data.meta?.title || assetId,
              assetId,
              ...getAssetMetadata(event.data),
            },
          })
        } catch (err) {
          return createErrorResponse()
        }
      }

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
          handleAssetErrored(req, assetId, event.data.errors)
        }
        break
      }

      default:
        break
    }

    return createSuccessResponse()
  }
