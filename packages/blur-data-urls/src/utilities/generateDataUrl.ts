import sharp from 'sharp'
import { File } from './getIncomingFiles'
import { BlurDataUrlsPluginOptions } from '../types'

export const generateDataUrl = async (
  file: File,
  options?: BlurDataUrlsPluginOptions['blurOptions'],
): Promise<string> => {
  const { buffer } = file

  const width = options?.width ?? 32
  const height: number | 'auto' = options?.height ?? 'auto'
  const blur = options?.blur ?? 18

  try {
    const sharpImage = sharp(buffer)

    const metadata = await sharpImage.metadata()

    let resizedHeight: number

    if (height === 'auto' && metadata.width && metadata.height) {
      resizedHeight = Math.round((width / metadata.width) * metadata.height)
    } else if (typeof height === 'number') {
      resizedHeight = height
    } else {
      resizedHeight = 32
    }

    const blurDataBuffer = await sharpImage.resize(width, resizedHeight).blur(blur).toBuffer()

    const blurDataURL = `data:image/png;base64,${blurDataBuffer.toString('base64')}`

    return blurDataURL
  } catch (error) {
    console.error('Error generating blurDataURL:', error)
    throw error
  }
}
