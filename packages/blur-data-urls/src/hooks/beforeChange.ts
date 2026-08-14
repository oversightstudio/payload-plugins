import type { CollectionBeforeChangeHook } from 'payload'

import type { ResolvedPluginOptions } from '../types'
import { generateResolvedPlaceholderDataUrl } from '../utilities/generateDataUrl'
import { getIncomingFile } from '../utilities/getIncomingFile'

export const blurDataUrlsHookMarker = Symbol.for('@oversightstudio/blur-data-urls/beforeChange')

type MarkedHook = CollectionBeforeChangeHook & {
  [blurDataUrlsHookMarker]?: string
}

export const isBlurDataUrlsHook = (
  hook: CollectionBeforeChangeHook,
  fieldName?: string,
): boolean => {
  const markedFieldName = (hook as MarkedHook)[blurDataUrlsHookMarker]
  return fieldName ? markedFieldName === fieldName : Boolean(markedFieldName)
}

export const createBeforeChangeHook = (options: ResolvedPluginOptions): MarkedHook => {
  const hook: MarkedHook = async ({ req, data }) => {
    const file = getIncomingFile({ data, req })
    if (!file) return data

    // Every replacement upload invalidates the previous placeholder. Unsupported
    // files and failures in log mode must not retain stale image data.
    data[options.fieldName] = null

    if (!file.mimeType.startsWith('image/')) return data
    if (options.placeholder.type === 'pixel' && file.mimeType === 'image/svg+xml') return data

    try {
      if (!file.input) throw new Error('Uploaded file has no readable buffer or temporary path.')
      data[options.fieldName] = await generateResolvedPlaceholderDataUrl(
        file.input,
        options.placeholder,
      )
    } catch (error) {
      if (options.onError === 'throw') throw error

      const message = error instanceof Error ? error.message : String(error)
      req.payload.logger.warn(
        `[blur-data-urls] Placeholder generation failed for "${file.filename}": ${message}`,
      )
    }

    return data
  }

  Object.defineProperty(hook, blurDataUrlsHookMarker, { value: options.fieldName })
  return hook
}
