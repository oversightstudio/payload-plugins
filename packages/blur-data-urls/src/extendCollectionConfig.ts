import { CollectionConfig, CollectionBeforeChangeHook } from 'payload'
import { createBeforeChangeHook } from './hooks/beforeChange'
import { BlurDataUrlsPluginOptions } from './types'

const extendCollectionConfig = (
  collection: CollectionConfig,
  hook: CollectionBeforeChangeHook,
): CollectionConfig => {
  return {
    ...collection,
    fields: [
      ...collection.fields,
      {
        name: 'blurDataUrl',
        type: 'text',
        admin: {
          readOnly: true,
        },
      },
    ],
    hooks: {
      ...collection.hooks,
      beforeChange: [...(collection.hooks?.beforeChange ?? []), hook],
    },
  }
}

export const extendCollectionsConfig = (
  incomingCollections: CollectionConfig[],
  options: BlurDataUrlsPluginOptions,
) => {
  return incomingCollections.map((collection) => {
    const foundInConfig = options.collections.some(({ slug }) => slug === collection.slug)

    if (!foundInConfig) return collection

    return extendCollectionConfig(collection, createBeforeChangeHook(options.blurOptions))
  })
}
