import type { CollectionConfig, CollectionBeforeChangeHook } from 'payload'
import { createBeforeChangeHook } from './hooks/beforeChange'
import { BlurDataUrlsPluginOptions } from './types'

const extendCollectionConfig = (
  collection: CollectionConfig,
  hook: CollectionBeforeChangeHook,
): CollectionConfig => {
  const hasField = collection.fields.some(
    (field) => 'name' in field && field.name === 'blurDataUrl',
  )
  return {
    ...collection,
    fields: hasField
      ? collection.fields
      : [
          ...collection.fields,
          {
            name: 'blurDataUrl',
            type: 'text',
            admin: { readOnly: true },
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
  const requested = new Set(options.collections.map(({ slug }) => slug))
  const available = new Set(incomingCollections.map(({ slug }) => slug))
  const missing = [...requested].filter((slug) => !available.has(slug))
  if (missing.length) {
    throw new Error(`[blur-data-urls] Collections not found: ${missing.join(', ')}`)
  }

  return incomingCollections.map((collection) => {
    const foundInConfig = requested.has(collection.slug)

    if (!foundInConfig) return collection

    return extendCollectionConfig(collection, createBeforeChangeHook(options.blurOptions))
  })
}
