import type { Config } from 'payload'
import { MuxVideo } from './collections/MuxVideo'
import { createMuxUploadHandler, getMuxUploadHandler } from './endpoints/upload'
import { muxWebhooksHandler } from './endpoints/webhook'
import { onInitExtension } from './lib/onInitExtension'
import type { MuxVideoPluginOptions } from './types'
import Mux from '@mux/mux-node'
import { deepMerge } from 'payload'

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

    if (pluginOptions.extendCollection) {
      const collection = config.collections?.find((c) => c.slug === pluginOptions.extendCollection)

      if (!collection) {
        throw new Error(`Collection ${pluginOptions.extendCollection} not found`)
      }

      config.collections = [
        ...(config.collections.filter((c) => c.slug !== pluginOptions.extendCollection) || []),
        deepMerge(MuxVideo(mux, pluginOptions), collection),
      ]
    } else {
      config.collections = [...(config.collections || []), MuxVideo(mux, pluginOptions)]
    }

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
        handler: muxWebhooksHandler(mux, pluginOptions),
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
