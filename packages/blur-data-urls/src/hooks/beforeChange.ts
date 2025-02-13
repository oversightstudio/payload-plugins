import { CollectionBeforeChangeHook } from 'payload'
import { getIncomingFiles } from '../utilities/getIncomingFiles'
import { generateDataUrl } from '../utilities/generateDataUrl'
import { BlurDataUrlsPluginOptions } from '../types'

export const createBeforeChangeHook = (
  options: BlurDataUrlsPluginOptions['blurOptions'],
): CollectionBeforeChangeHook => {
  return async ({ req, data }) => {
    const files = getIncomingFiles({ data, req })

    for (const file of files) {
      if (!file.mimeType.startsWith('image/')) {
        continue
      }

      data.blurDataUrl = await generateDataUrl(file, options)
    }

    return data
  }
}
