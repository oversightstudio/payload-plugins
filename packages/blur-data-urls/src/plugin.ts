import type { Config } from 'payload'

import { BlurDataUrlsPluginOptions } from './types'
import { extendCollectionsConfig } from './extendCollectionConfig'

export const blurDataUrlsPlugin =
  (pluginOptions: BlurDataUrlsPluginOptions) =>
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

    if (config.collections) {
      config.collections = extendCollectionsConfig(config.collections, pluginOptions)
    }

    return config
  }
