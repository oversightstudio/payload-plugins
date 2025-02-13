/**
 * Place this script on your ./src/scripts/ directory.
 */

import { getPayload, TypedUploadCollection } from 'payload'
import { loadEnv } from 'payload/node'
import type { GeneratedTypes } from 'payload'
import sharp from 'sharp'

loadEnv()

/**
 * !PLUGIN CONFIGURATION!
 */

const mediaCollections: (keyof GeneratedTypes['collections'])[] = ['media']

const blurOptions = {
  width: 20,
  height: 'auto',
  blur: 18,
}

/**
 * !END OF PLUGIN CONFIGURATION!
 */

export const generateDataUrl = async (buffer: ArrayBuffer): Promise<string> => {
  try {
    const { width, height, blur } = blurOptions

    const metadata = await sharp(buffer).metadata()

    let resizedHeight: number

    if (height === 'auto' && metadata.width && metadata.height) {
      resizedHeight = Math.round((width / metadata.width) * metadata.height)
    } else if (typeof height === 'number') {
      resizedHeight = height
    } else {
      resizedHeight = 32
    }

    const blurDataBuffer = await sharp(buffer).resize(width, resizedHeight).blur(blur).toBuffer()

    const blurDataURL = `data:image/png;base64,${blurDataBuffer.toString('base64')}`

    return blurDataURL
  } catch (error) {
    console.error('Error generating blurDataURL:', error)
    throw error
  }
}

async function migrateBlurDataUrls() {
  const payload = await getPayload({
    config: await import('../payload.config').then((m) => m.default),
  })

  payload.logger.info('Starting...')

  for (const collection of mediaCollections) {
    payload.logger.info(`Going over collection: ${collection}`)

    const media = await payload.find({
      collection,
      where: {
        blurDataUrl: {
          exists: false,
        },
        mimeType: {
          contains: 'image/',
        },
      },
      limit: 999999999,
    })

    const docs = media.docs as unknown as TypedUploadCollection['media'][]

    for (const mediaItem of docs) {
      payload.logger.info(`Processing media item: ${mediaItem.id}`)
      const response = await fetch(`${process.env.PAYLOAD_PUBLIC_SERVER_URL}/${mediaItem.url}`)

      if (response.status !== 200) {
        payload.logger.error(`Error fetching ${mediaItem.url}: ${response.statusText}`)
        continue
      }

      const blurDataURL = await generateDataUrl(await response.arrayBuffer())

      await payload.update({
        collection,
        id: mediaItem.id,
        data: {
          blurDataUrl: blurDataURL,
        },
      })
    }
  }
}

await migrateBlurDataUrls()
process.exit(0)
