import type Mux from '@mux/mux-node'
import type { PayloadHandler, PayloadRequest } from 'payload'
import { getAssetMetadata } from '../lib/getAssetMetadata'
import type { MuxVideoRuntimeOptions } from '../types'

type MuxWebhookEvent = {
  data?: Record<string, unknown> & { errors?: unknown; id?: string; meta?: { title?: string } }
  object?: { id?: string }
  type?: string
}

const handleAssetErrored = (req: PayloadRequest, assetId: string, errors: unknown) => {
  req.payload.logger.error(`[payload-mux] Error with assetId: ${assetId}`)
  req.payload.logger.error(JSON.stringify(errors, null, 2))
}

const createSuccessResponse = () => new Response('Success!', { status: 200 })
const createErrorResponse = () => new Response('Error', { status: 500 })
const mutationContext = {
  skipMuxVideoAfterDeleteSync: true,
  skipMuxVideoBeforeChangeSync: true,
}

export const muxWebhooksHandler =
  (mux: Mux, pluginOptions: MuxVideoRuntimeOptions): PayloadHandler =>
  async (req) => {
    if (!req.text) {
      return new Response('Invalid request', { status: 400 })
    }

    const contentLength = Number(req.headers.get('content-length') ?? 0)
    if (contentLength > 1_048_576) return new Response('Payload too large', { status: 413 })

    let event: MuxWebhookEvent

    try {
      const rawBody = await req.text()
      if (rawBody.length > 1_048_576) return new Response('Payload too large', { status: 413 })
      mux.webhooks.verifySignature(rawBody, req.headers)
      event = JSON.parse(rawBody) as MuxWebhookEvent
    } catch (err) {
      req.payload.logger.error('[payload-mux] Invalid Mux webhook request:')
      req.payload.logger.error(err)
      return new Response('Invalid Mux webhook request', { status: 400 })
    }

    if (!event || typeof event !== 'object' || typeof event.type !== 'string') {
      return new Response('Invalid Mux webhook payload', { status: 400 })
    }

    const collection = (pluginOptions.extendCollection as string) ?? 'mux-video'

    const assetId = event.object?.id ?? event.data?.id

    if (typeof assetId !== 'string' || !assetId) {
      return createSuccessResponse()
    }
    if (!event.data || typeof event.data !== 'object') {
      return new Response('Invalid Mux webhook payload', { status: 400 })
    }

    const findVideo = async () => {
      const videos = (await req.payload.find({
        collection,
        where: {
          assetId: {
            equals: assetId,
          },
        },
        limit: 1,
        pagination: false,
        overrideAccess: true,
        req,
      } as never)) as unknown as {
        docs: Array<Record<string, unknown> & { id: number | string }>
        totalDocs: number
      }

      return videos.totalDocs > 0 ? videos.docs[0] : null
    }

    const updateVideoMetadata = async (id: string | number) => {
      return req.payload.update({
        collection,
        id,
        data: getAssetMetadata(event.data as never),
        overrideAccess: true,
        context: mutationContext,
        req,
      } as never)
    }

    const video = await findVideo()

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
              title: event.data?.meta?.title || assetId,
              assetId,
              ...getAssetMetadata(event.data as never),
            },
            overrideAccess: true,
            context: mutationContext,
            req,
          } as never)
        } catch (err) {
          // Mux may deliver the same event more than once. If another request
          // created the record first, treat this delivery as successful.
          const existingVideo = await findVideo()

          if (existingVideo) {
            if (event.type === 'video.asset.ready' || event.type === 'video.asset.updated') {
              await updateVideoMetadata(existingVideo.id)
            }

            return createSuccessResponse()
          }

          req.payload.logger.error(
            `[payload-mux] There was an error while creating video for asset ${assetId}:`,
          )
          req.payload.logger.error(err)
          return createErrorResponse()
        }
      }

      return createSuccessResponse()
    }

    switch (event.type) {
      case 'video.asset.ready':
      case 'video.asset.updated': {
        try {
          await updateVideoMetadata(video.id)
        } catch (err) {
          req.payload.logger.error(
            `[payload-mux] There was an error while updating video for asset ${assetId}:`,
          )
          req.payload.logger.error(err)
          return createErrorResponse()
        }
        break
      }

      case 'video.asset.deleted': {
        try {
          await req.payload.delete({
            collection,
            id: video.id,
            overrideAccess: true,
            context: mutationContext,
            req,
          } as never)
        } catch (err) {
          req.payload.logger.error(
            `[payload-mux] There was an error while deleting video for asset ${assetId}:`,
          )
          req.payload.logger.error(err)
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
