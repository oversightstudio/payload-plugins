import type { CollectionConfig, TextField } from 'payload'

import { createBeforeChangeHook, isBlurDataUrlsHook } from './hooks/beforeChange'
import type { ResolvedPluginOptions } from './types'

const createPlaceholderField = (options: ResolvedPluginOptions): TextField => ({
  name: options.fieldName,
  type: 'text',
  admin: {
    description:
      options.placeholder.type === 'pixel'
        ? 'Auto-generated pixelated image placeholder. Regenerated whenever the file changes.'
        : 'Auto-generated blurred image placeholder. Regenerated whenever the file changes.',
    hidden: true,
    readOnly: true,
  },
})

const extendCollectionConfig = (
  collection: CollectionConfig,
  options: ResolvedPluginOptions,
): CollectionConfig => {
  if (!collection.upload) {
    throw new Error(`[blur-data-urls] Collection "${collection.slug}" must be upload-enabled.`)
  }

  const existingField = collection.fields.find(
    (field) => 'name' in field && field.name === options.fieldName,
  )
  if (existingField && (existingField.type !== 'text' || existingField.hasMany)) {
    throw new Error(
      `[blur-data-urls] Existing field "${options.fieldName}" in collection "${collection.slug}" must be a single-value text field.`,
    )
  }

  const hooks = collection.hooks?.beforeChange ?? []
  const beforeChange = hooks.some((hook) => isBlurDataUrlsHook(hook, options.fieldName))
    ? hooks
    : [...hooks, createBeforeChangeHook(options)]

  return {
    ...collection,
    fields: existingField
      ? collection.fields
      : [...collection.fields, createPlaceholderField(options)],
    hooks: {
      ...collection.hooks,
      beforeChange,
    },
  }
}

export const extendCollectionsConfig = (
  incomingCollections: CollectionConfig[],
  options: ResolvedPluginOptions,
): CollectionConfig[] => {
  const requested = new Set(options.collections.map(({ slug }) => slug))
  const available = new Set(incomingCollections.map(({ slug }) => slug))
  const missing = [...requested].filter((slug) => !available.has(slug))
  if (missing.length) {
    throw new Error(`[blur-data-urls] Collections not found: ${missing.join(', ')}`)
  }

  return incomingCollections.map((collection) =>
    requested.has(collection.slug) ? extendCollectionConfig(collection, options) : collection,
  )
}
