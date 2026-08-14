import { AssetOptions } from '@mux/mux-node/resources/video/assets.mjs'
import type { CollectionConfig, PayloadRequest, TypedCollection } from 'payload'

export type MuxVideoCollectionAccess = Pick<
  NonNullable<CollectionConfig['access']>,
  'create' | 'delete' | 'read' | 'update'
>

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
   * Optionally reconcile Mux assets with Payload entries in the background after initialization.
   * - `"createMissing"`: Create Payload entries for Mux assets that are missing locally.
   * - `"deleteStale"`: Delete Payload entries whose Mux assets no longer exist.
   * - `"createMissingAndDeleteStale"`: Perform both operations.
   *
   * Delete modes only remove Payload entries; they never delete Mux assets.
   *
   * @default false
   */
  reconcileOnInit?: false | 'createMissing' | 'deleteStale' | 'createMissingAndDeleteStale'

  /**
   * A backwards-compatible access function used by the plugin's custom API endpoints
   * and as the generated collection's default read access.
   */
  access?: (request: PayloadRequest) => Promise<boolean> | boolean

  /**
   * Payload-native CRUD access overrides for the generated Mux video collection.
   * Unspecified operations retain Payload's current defaults. A custom `read`
   * replaces the legacy `access` function for collection reads only.
   */
  collectionAccess?: MuxVideoCollectionAccess

  /**
   * Options for generating signed URLs for video playback.
   */
  signedUrlOptions?: MuxVideoSignedUrlOptions

  /**
   * When enabled, the webhook will automatically create a video in Payload
   * when it receives a `video.asset.created`, `video.asset.ready`, or
   * `video.asset.updated` event from Mux for an asset that doesn't exist
   * in Payload.
   *
   * @default false
   */
  autoCreateOnWebhook?: boolean
}

export type MuxVideoRuntimeOptions = Partial<MuxVideoPluginOptions> &
  Pick<MuxVideoPluginOptions, 'uploadSettings'>
