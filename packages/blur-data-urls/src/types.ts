/** A collection that should receive generated placeholder data URLs. */
export type PluginCollectionConfig = {
  slug: string
}

export type BlurPlaceholderOptions = {
  /**
   * Apply a conventional blur to the tiny generated image.
   *
   * @default 'blur'
   */
  type?: 'blur'

  /** @default 32 */
  width?: number

  /**
   * Preserve the source aspect ratio with `'auto'`, or stretch to an
   * explicit height.
   *
   * @default 'auto'
   */
  height?: number | 'auto'

  /** Sharp blur sigma. @default 18 */
  blur?: number

  /**
   * Maximum generated width or height when preserving aspect ratio.
   * This prevents unusually shaped source images from creating large data URLs.
   *
   * @default 256
   */
  maxDimension?: number
}

export type PixelPlaceholderOptions = {
  /** Generate a hard-edged, nearest-neighbor pixel preview. */
  type: 'pixel'

  /** Number of source pixels across the generated preview. @default 32 */
  width?: number

  /** WebP output quality. @default 70 */
  quality?: number

  /**
   * Maximum generated width or height while preserving the source aspect ratio.
   *
   * @default 256
   */
  maxDimension?: number
}

export type PlaceholderOptions = BlurPlaceholderOptions | PixelPlaceholderOptions

export type BlurDataUrlsPluginOptions = {
  /** Enable the plugin. `false` is an exact no-op. @default true */
  enabled?: boolean

  /** Upload collections to extend. */
  collections: PluginCollectionConfig[]

  /** Generated field name. @default 'blurDataUrl' */
  fieldName?: string

  /** Placeholder generator and visual treatment. */
  placeholder?: PlaceholderOptions

  /**
   * Legacy blur configuration. Use `placeholder: { type: 'blur', ... }` for
   * new projects. This remains supported for backwards compatibility.
   */
  blurOptions?: Omit<BlurPlaceholderOptions, 'type' | 'maxDimension'>

  /**
   * Whether image-processing errors reject the upload or only log a warning.
   * Failed replacement uploads clear any stale placeholder in `log` mode.
   *
   * @default 'throw'
   */
  onError?: 'log' | 'throw'
}

export type PlaceholderInput = Buffer | Uint8Array | string

export type ResolvedBlurPlaceholderOptions = {
  blur: number
  height: number | 'auto'
  maxDimension: number
  type: 'blur'
  width: number
}

export type ResolvedPixelPlaceholderOptions = {
  maxDimension: number
  quality: number
  type: 'pixel'
  width: number
}

export type ResolvedPlaceholderOptions =
  ResolvedBlurPlaceholderOptions | ResolvedPixelPlaceholderOptions

export type ResolvedPluginOptions = {
  collections: PluginCollectionConfig[]
  fieldName: string
  onError: 'log' | 'throw'
  placeholder: ResolvedPlaceholderOptions
}
