import type { Config } from 'payload'

import { BlurDataUrlsPluginOptions } from './types'
import { extendCollectionsConfig } from './extendCollectionConfig'

export const blurDataUrlsPlugin =
  (pluginOptions: BlurDataUrlsPluginOptions) =>
  (incomingConfig: Config): Config => {
    if (pluginOptions.enabled === false) return incomingConfig
    if (!pluginOptions.collections?.length) {
      throw new Error('[blur-data-urls] At least one collection is required.')
    }
    const { blur, height, width } = pluginOptions.blurOptions ?? {}
    if (width !== undefined && (!Number.isInteger(width) || width < 1)) {
      throw new Error('[blur-data-urls] blurOptions.width must be a positive integer.')
    }
    if (height !== undefined && height !== 'auto' && (!Number.isInteger(height) || height < 1)) {
      throw new Error('[blur-data-urls] blurOptions.height must be a positive integer or auto.')
    }
    if (blur !== undefined && (!Number.isFinite(blur) || blur < 0.3 || blur > 1000)) {
      throw new Error('[blur-data-urls] blurOptions.blur must be between 0.3 and 1000.')
    }

    const config = { ...incomingConfig }

    config.admin = {
      ...(config.admin || {}),
      components: {
        ...(config.admin?.components || {}),
      },
    }

    if (config.collections) {
      config.collections = extendCollectionsConfig(config.collections, pluginOptions)
    }

    return config
  }
