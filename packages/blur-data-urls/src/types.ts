/**
 * Configuration options for the Blur Data URLs plugin in Payload CMS v3.
 */
export type PluginCollectionConfig = {
  /**
   * The slug of the collection where the blurDataUrl should be implemented.
   */
  slug: string
}

export type BlurDataUrlsPluginOptions = {
  /**
   * Determines whether the Blur Data URLs plugin is enabled.
   */
  enabled: boolean

  /**
   * A list of collections where the blurDataUrl field should be added.
   * This should typically be used for Payload's main media collection.
   */
  collections: PluginCollectionConfig[]

  /**
   * Additional settings for generating blurDataUrls.
   */
  blurOptions?: {
    /**
     * The width of the generated blurDataUrl.
     *
     * @default 32
     */
    width?: number

    /**
     * The height of the generated blurDataUrl.
     * If set to `'auto'`, it will maintain the image's aspect ratio
     * and adjust accordingly at generation time.
     *
     * @default 'auto'
     */
    height?: number | 'auto'

    /**
     * The amount of blur applied to the generated blurDataUrl.
     *
     * @default 18
     */
    blur?: number
  }
}
