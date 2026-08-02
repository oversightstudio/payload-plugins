import type Mux from '@mux/mux-node'
import type { PayloadHandler } from 'payload'
import { defaultAccessFunction } from '../lib/defaultAccessFunction'
import { getAssetMetadata } from '../lib/getAssetMetadata'
import type { MuxVideoPluginOptions } from '../types'

const mutationContext = {
  skipMuxVideoBeforeChangeSync: true,
}

export const syncMuxVideoHandler = (
  mux: Mux,
  pluginOptions: MuxVideoPluginOptions,
): PayloadHandler => {
  return async (request) => {
    const userHasAccess = (await pluginOptions.access?.(request)) ?? defaultAccessFunction(request)

    if (!userHasAccess) {
      return new Response('Forbidden', { status: 403 })
    }

    const id = request.query.id as string | undefined

    if (!id) {
      return new Response('Missing video ID', { status: 400 })
    }

    const collection = (pluginOptions.extendCollection as string) ?? 'mux-video'

    try {
      const video = await request.payload.findByID({
        collection,
        id,
        depth: 0,
        overrideAccess: false,
        req: request,
      })

      const hasPlaybackOptions =
        Array.isArray(video?.playbackOptions) && video.playbackOptions.length > 0

      if (hasPlaybackOptions) {
        return Response.json({ ready: true, video })
      }

      if (!video?.assetId) {
        return new Response('Video is missing its Mux asset ID', { status: 409 })
      }

      const asset = await mux.video.assets.retrieve(video.assetId)

      if (asset.status !== 'ready') {
        return Response.json({ ready: false, status: asset.status })
      }

      await request.payload.update({
        collection,
        id,
        data: getAssetMetadata(asset),
        overrideAccess: true,
        context: mutationContext,
        req: request,
      })

      // The metadata write is internal, but the response must still honor collection and field access.
      const updatedVideo = await request.payload.findByID({
        collection,
        id,
        depth: 0,
        overrideAccess: false,
        req: request,
      })

      return Response.json({
        ready:
          Array.isArray(updatedVideo?.playbackOptions) && updatedVideo.playbackOptions.length > 0,
        status: asset.status,
        video: updatedVideo,
      })
    } catch (err) {
      const status = (err as { status?: number })?.status

      if (status === 403 || status === 404) {
        return new Response(status === 403 ? 'Forbidden' : 'Not Found', { status })
      }

      request.payload.logger.error({
        err,
        msg: `[payload-mux] Unable to sync video ${id} with Mux`,
      })

      return new Response('Unable to sync video with Mux', { status: 500 })
    }
  }
}
