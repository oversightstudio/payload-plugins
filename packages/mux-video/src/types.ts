import { AssetOptions } from '@mux/mux-node/resources/video/assets.mjs'
import type { TypedCollection, PayloadRequest } from 'payload'

/**
 * Initialization settings for the Mux implementation.
 */
type MuxVideoInitSettings = {
  /**
   * The Mux token ID.
   */
  tokenId: string

  /**
   * The Mux token secret.
   */
  tokenSecret: string

  /**
   * The secret used to validate Mux webhooks.
   */
  webhookSecret: string

  /**
   * Optional JWT signing key.
   * Only required for signed URL setup.
   */
  jwtSigningKey?: string

  /**
   * Optional JWT private key.
   * Only required for signed URL setup.
   */
  jwtPrivateKey?: string
}

/**
 * Settings for creating a new asset on Mux.
 * This extends the base AssetOptions with additional properties.
 */
type MuxVideoNewAssetSettings = AssetOptions & {
  /**
   * Playback policy for the uploaded video.
   * Accepted values are `'public'` or `'signed'`.
   * Although this accepts an array, the recommended default is to use a single value of `'public'`.
   */
  playback_policy?: Array<'public' | 'signed'>
}

/**
 * Settings for uploading videos to Mux.
 */
type MuxVideoUploadSettings = {
  /**
   * The required CORS origin for Mux.
   */
  cors_origin: string

  /**
   * Additional settings passed to Mux when creating a new asset.
   */
  new_asset_settings?: MuxVideoNewAssetSettings
}

/**
 * Options for generating signed URLs for video playback.
 */
type MuxVideoSignedUrlOptions = {
  /**
   * The expiration time for signed URLs.
   *
   * @default "1d"
   */
  expiration?: string
}

/**
 * Configuration options for the Mux Video Plugin.
 */
export type MuxVideoPluginOptions = {
  /**
   * Determines whether the plugin is enabled.
   */
  enabled: boolean

  /**
   * Specifies the type of thumbnail to display for videos in the collection list view.
   * - `"gif"`: Displays an animated GIF preview.
   * - `"image"`: Displays a static image preview.
   * - `"none"`: No thumbnail is displayed.
   *
   * @default "gif"
   */
  adminThumbnail?: 'gif' | 'image' | 'none'

  /**
   * The collection to use for the Mux video plugin.
   */
  extendCollection?: keyof TypedCollection

  /**
   * Initialization settings for the Mux implementation.
   */
  initSettings: MuxVideoInitSettings

  /**
   * Upload settings for creating video assets on Mux.
   */
  uploadSettings: MuxVideoUploadSettings

  /**
   * The image format to use for video posters.
   * 
   * @default "png"
   */
  posterExtension?: 'webp' | 'jpg' | 'png'

  /**
   * The image format to use for animated GIF previews.
   * 
   * @default "gif"
   */
  animatedGifExtension?: 'gif' | 'webp'

  /**
   * An optional function to determine whether the current request is allowed to upload files.
   * Should return a boolean or a Promise resolving to a boolean.
   */
  access?: (request: PayloadRequest) => Promise<boolean> | boolean

  /**
   * Options for generating signed URLs for video playback.
   */
  signedUrlOptions?: MuxVideoSignedUrlOptions
}
