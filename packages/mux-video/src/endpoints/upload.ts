import type Mux from '@mux/mux-node'
import type { PayloadHandler } from 'payload'
import type { MuxVideoRuntimeOptions } from '../types'
import { defaultAccessFunction } from '../lib/defaultAccessFunction'

export const createMuxUploadHandler = (
  mux: Mux,
  pluginOptions: MuxVideoRuntimeOptions,
): PayloadHandler => {
  return async (request) => {
    const userHasAccess = (await pluginOptions.access?.(request)) ?? defaultAccessFunction(request)

    if (!userHasAccess) {
      return new Response('Forbidden', { status: 403 })
    }

    const uploadSettings = pluginOptions.uploadSettings

    try {
      const upload = await mux.video.uploads.create({
        cors_origin: uploadSettings.cors_origin,
        new_asset_settings: {
          playback_policy: ['public'],
          ...uploadSettings.new_asset_settings,
        },
      })
      return Response.json(upload, { headers: { 'Cache-Control': 'no-store' } })
    } catch (err) {
      request.payload.logger.error({ err, msg: '[payload-mux] Unable to create direct upload' })
      return new Response('Unable to create Mux upload', { status: 502 })
    }
  }
}

export const getMuxUploadHandler = (
  mux: Mux,
  pluginOptions: MuxVideoRuntimeOptions,
): PayloadHandler => {
  return async (request) => {
    const userHasAccess = (await pluginOptions.access?.(request)) ?? defaultAccessFunction(request)

    if (!userHasAccess) {
      return new Response('Forbidden', { status: 403 })
    }

    try {
      const id = request.query.id
      if (typeof id !== 'string' || !/^[a-zA-Z0-9_-]{1,200}$/.test(id)) {
        return new Response('Missing or invalid upload ID', { status: 400 })
      }

      const upload = await mux.video.uploads.retrieve(id)

      return Response.json(upload, { headers: { 'Cache-Control': 'no-store' } })
    } catch (err) {
      const status = (err as { status?: number }).status
      if (status === 404) return new Response('Upload not found', { status: 404 })
      request.payload.logger.error({ err, msg: '[payload-mux] Unable to retrieve direct upload' })
      return new Response('Unable to retrieve Mux upload', { status: 502 })
    }
  }
}
