import Mux from '@mux/mux-node'
import { PayloadHandler } from 'payload'
import { MuxVideoPluginOptions } from '../types'
import { defaultAccessFunction } from '../lib/defaultAccessFunction'

export const createMuxUploadHandler = (
  mux: Mux,
  pluginOptions: MuxVideoPluginOptions,
): PayloadHandler => {
  return async (request) => {
    const userHasAccess = (await pluginOptions.access?.(request)) ?? defaultAccessFunction(request)

    if (!userHasAccess) {
      return Response.error()
    }

    const uploadSettings = pluginOptions.uploadSettings

    const upload = await mux.video.uploads.create({
      cors_origin: uploadSettings.cors_origin,
      new_asset_settings: {
        playback_policy: ['public'],
        ...uploadSettings.new_asset_settings,
      },
    })

    return Response.json(upload)
  }
}

export const getMuxUploadHandler = (
  mux: Mux,
  pluginOptions: MuxVideoPluginOptions,
): PayloadHandler => {
  return async (request) => {
    const userHasAccess = pluginOptions.access?.(request) ?? defaultAccessFunction(request)

    if (!userHasAccess) {
      return Response.error()
    }

    try {
      const id = request.query.id as string

      const upload = await mux.video.uploads.retrieve(id)

      return Response.json(upload)
    } catch (err) {
      return Response.json(err)
    }
  }
}
