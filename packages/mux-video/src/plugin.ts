import type { Config } from 'payload'
import { MuxVideo } from './collections/MuxVideo'
import { createMuxUploadHandler, getMuxUploadHandler } from './endpoints/upload'
import { muxWebhooksHandler } from './endpoints/webhook'
import { onInitExtension } from './lib/onInitExtension'
import type { MuxVideoPluginOptions } from './types'
import Mux from '@mux/mux-node'

export const muxVideoPlugin =
  (pluginOptions: MuxVideoPluginOptions) =>
  (incomingConfig: Config): Config => {
    const config = { ...incomingConfig }

    config.admin = {
      ...(config.admin || {}),
      components: {
        ...(config.admin?.components || {}),
      },
    }

    if (pluginOptions.enabled === false) {
      return config
    }

    if (!pluginOptions.adminThumbnail) {
      pluginOptions.adminThumbnail = 'gif'
    }

    const mux = new Mux(pluginOptions.initSettings)

    config.collections = [...(config.collections || []), MuxVideo(mux, pluginOptions)]

    config.endpoints = [
      ...(config.endpoints || []),
      {
        method: 'post',
        path: '/mux/upload',
        handler: createMuxUploadHandler(mux, pluginOptions),
      },
      {
        method: 'get',
        path: '/mux/upload',
        handler: getMuxUploadHandler(mux, pluginOptions),
      },
      {
        path: '/mux/webhook',
        method: 'post',
        handler: muxWebhooksHandler(mux),
      },
    ]

    config.globals = [...(config.globals || [])]

    config.hooks = {
      ...(config.hooks || {}),
    }

    config.onInit = async (payload) => {
      if (incomingConfig.onInit) {
        await incomingConfig.onInit(payload)
      }

      onInitExtension(pluginOptions, payload)
    }

    return config
  }
