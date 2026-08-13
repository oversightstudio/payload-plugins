import type { CollectionBeforeChangeHook } from 'payload'
import { getIncomingFiles } from '../utilities/getIncomingFiles'
import { generateDataUrl } from '../utilities/generateDataUrl'
import { BlurDataUrlsPluginOptions } from '../types'

export const createBeforeChangeHook = (
  options: BlurDataUrlsPluginOptions['blurOptions'],
): CollectionBeforeChangeHook => {
  return async ({ req, data }) => {
    const files = getIncomingFiles({ data, req })

    // The first item is always the original upload. Generated Payload sizes may
    // follow it, but must not overwrite the canonical placeholder nondeterministically.
    const file = files[0]
    if (file?.mimeType.startsWith('image/')) data.blurDataUrl = await generateDataUrl(file, options)

    return data
  }
}
