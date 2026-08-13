import Mux from '@mux/mux-node'
import { deepMerge, type Config, type Plugin } from 'payload'
import { MuxVideo } from './collections/MuxVideo'
import { createMuxUploadHandler, getMuxUploadHandler } from './endpoints/upload'
import { syncMuxVideoHandler } from './endpoints/sync'
import { muxWebhooksHandler } from './endpoints/webhook'
import { onInitExtension } from './lib/onInitExtension'
import type { MuxVideoPluginOptions } from './types'

export const muxVideoPlugin = (pluginOptions: MuxVideoPluginOptions) =>
  ((incomingConfig: Config): Config => {
    if (pluginOptions.enabled === false) return incomingConfig
    if (!pluginOptions.initSettings?.tokenId || !pluginOptions.initSettings?.tokenSecret) {
      throw new Error('[payload-mux] initSettings.tokenId and tokenSecret are required.')
    }
    if (!pluginOptions.initSettings.webhookSecret) {
      throw new Error('[payload-mux] initSettings.webhookSecret is required.')
    }
    if (!pluginOptions.uploadSettings?.cors_origin) {
      throw new Error('[payload-mux] uploadSettings.cors_origin is required.')
    }

    const options: MuxVideoPluginOptions = {
      ...pluginOptions,
      adminThumbnail: pluginOptions.adminThumbnail ?? 'gif',
    }
    const config = { ...incomingConfig }

    config.admin = {
      ...(config.admin || {}),
      components: {
        ...(config.admin?.components || {}),
      },
    }

    const mux = new Mux(options.initSettings)

    if (options.extendCollection) {
      const collectionIndex =
        config.collections?.findIndex((c) => c.slug === options.extendCollection) ?? -1
      const collection = collectionIndex >= 0 ? config.collections?.[collectionIndex] : undefined

      if (!collection) {
        throw new Error(`[payload-mux] Collection ${String(options.extendCollection)} not found.`)
      }

      config.collections = [...(config.collections ?? [])]
      config.collections[collectionIndex] = deepMerge(MuxVideo(mux, options), collection)
    } else {
      config.collections = [...(config.collections || []), MuxVideo(mux, options)]
    }

    config.endpoints = [
      ...(config.endpoints || []),
      {
        method: 'post',
        path: '/mux/upload',
        handler: createMuxUploadHandler(mux, options),
      },
      {
        method: 'get',
        path: '/mux/upload',
        handler: getMuxUploadHandler(mux, options),
      },
      {
        method: 'post',
        path: '/mux/sync',
        handler: syncMuxVideoHandler(mux, options),
      },
      {
        path: '/mux/webhook',
        method: 'post',
        handler: muxWebhooksHandler(mux, options),
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

      onInitExtension(options, payload, mux)
    }

    return config
  }) satisfies Plugin
