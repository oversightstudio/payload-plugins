import type { Config } from 'payload'

import { extendCollectionsConfig } from './extendCollectionConfig'
import { resolvePluginOptions } from './options'
import type { BlurDataUrlsPluginOptions } from './types'

export const blurDataUrlsPlugin =
  (pluginOptions: BlurDataUrlsPluginOptions) =>
  (incomingConfig: Config): Config => {
    if (pluginOptions.enabled === false) return incomingConfig

    const options = resolvePluginOptions(pluginOptions)

    return {
      ...incomingConfig,
      collections: extendCollectionsConfig(incomingConfig.collections ?? [], options),
    }
  }
