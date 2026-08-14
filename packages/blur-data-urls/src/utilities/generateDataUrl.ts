import sharp from 'sharp'

import { resolvePlaceholderOptions } from '../options'
import type { PlaceholderInput, PlaceholderOptions, ResolvedPlaceholderOptions } from '../types'

const normalizeInput = (input: PlaceholderInput): Buffer | string =>
  typeof input === 'string' || Buffer.isBuffer(input) ? input : Buffer.from(input)

export const generatePlaceholderDataUrl = async (
  input: PlaceholderInput,
  options?: PlaceholderOptions,
): Promise<string> => generateResolvedPlaceholderDataUrl(input, resolvePlaceholderOptions(options))

export const generateResolvedPlaceholderDataUrl = async (
  input: PlaceholderInput,
  options: ResolvedPlaceholderOptions,
): Promise<string> => {
  const image = sharp(normalizeInput(input)).autoOrient()

  if (options.type === 'pixel') {
    const output = await image
      .resize({
        fit: 'inside',
        height: options.maxDimension,
        kernel: sharp.kernel.nearest,
        width: options.width,
      })
      .webp({ quality: options.quality })
      .toBuffer()

    return `data:image/webp;base64,${output.toString('base64')}`
  }

  const resized =
    options.height === 'auto'
      ? image.resize({
          fit: 'inside',
          height: options.maxDimension,
          width: options.width,
        })
      : image.resize(options.width, options.height, { fit: 'fill' })

  const output = await resized.blur(options.blur).png().toBuffer()
  return `data:image/png;base64,${output.toString('base64')}`
}
