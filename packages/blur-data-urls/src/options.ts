import type {
  BlurDataUrlsPluginOptions,
  PlaceholderOptions,
  ResolvedPlaceholderOptions,
  ResolvedPluginOptions,
} from './types'

const DEFAULT_WIDTH = 32
const DEFAULT_MAX_DIMENSION = 256

const assertPositiveInteger = (value: number, name: string): void => {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`[blur-data-urls] ${name} must be a positive integer.`)
  }
}

export const resolvePlaceholderOptions = (
  options: PlaceholderOptions = {},
): ResolvedPlaceholderOptions => {
  if (options.type !== undefined && options.type !== 'blur' && options.type !== 'pixel') {
    throw new Error('[blur-data-urls] placeholder.type must be blur or pixel.')
  }

  const width = options.width ?? DEFAULT_WIDTH
  const maxDimension = options.maxDimension ?? DEFAULT_MAX_DIMENSION

  assertPositiveInteger(width, 'placeholder.width')
  assertPositiveInteger(maxDimension, 'placeholder.maxDimension')

  if (width > maxDimension) {
    throw new Error('[blur-data-urls] placeholder.width cannot exceed maxDimension.')
  }

  if (options.type === 'pixel') {
    const quality = options.quality ?? 70
    if (!Number.isInteger(quality) || quality < 1 || quality > 100) {
      throw new Error('[blur-data-urls] placeholder.quality must be an integer from 1 to 100.')
    }

    return { maxDimension, quality, type: 'pixel', width }
  }

  const blur = options.blur ?? 18
  const height = options.height ?? 'auto'

  if (height !== 'auto') {
    assertPositiveInteger(height, 'placeholder.height')
    if (height > maxDimension) {
      throw new Error('[blur-data-urls] placeholder.height cannot exceed maxDimension.')
    }
  }
  if (!Number.isFinite(blur) || blur < 0.3 || blur > 1000) {
    throw new Error('[blur-data-urls] placeholder.blur must be between 0.3 and 1000.')
  }

  return { blur, height, maxDimension, type: 'blur', width }
}

export const resolvePluginOptions = (options: BlurDataUrlsPluginOptions): ResolvedPluginOptions => {
  if (!options.collections?.length) {
    throw new Error('[blur-data-urls] At least one collection is required.')
  }
  if (options.placeholder && options.blurOptions) {
    throw new Error('[blur-data-urls] Use either placeholder or blurOptions, not both.')
  }
  if (options.onError !== undefined && options.onError !== 'log' && options.onError !== 'throw') {
    throw new Error('[blur-data-urls] onError must be throw or log.')
  }

  const fieldName = options.fieldName ?? 'blurDataUrl'
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(fieldName)) {
    throw new Error('[blur-data-urls] fieldName must be a valid Payload field identifier.')
  }

  const legacyHeight = options.blurOptions?.height
  const legacyMaxDimension = Math.max(
    DEFAULT_MAX_DIMENSION,
    options.blurOptions?.width ?? 0,
    typeof legacyHeight === 'number' ? legacyHeight : 0,
  )
  const placeholder = options.placeholder
    ? resolvePlaceholderOptions(options.placeholder)
    : resolvePlaceholderOptions({
        type: 'blur',
        ...options.blurOptions,
        maxDimension: legacyMaxDimension,
      })

  return {
    collections: options.collections,
    fieldName,
    onError: options.onError ?? 'throw',
    placeholder,
  }
}
