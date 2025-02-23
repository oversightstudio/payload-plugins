# Mux Video Payload Plugin

## Install
`pnpm add @oversightstudio/mux-video @mux/mux-player-react`

## About
This plugin brings Mux Video to Payload! It creates a “Videos” collection within the admin panel, making it simple to upload videos directly to Mux and manage them.

Features include:
- Support for both public and signed playback policies.
- Ensures that videos deleted in the admin panel are automatically deleted from Mux, and vice versa.
- Video gif previews on the videos collection list view, which can be disabled if required.

![muxVideoPreview](/gifs/mux-preview.gif)

## Payload Setup
There are two possible setups for this plugin: The public setup, andthe signed URLs setup. The main difference between the two is that the signed URLs setup requires setting up a little extra configuration, but that's about it.

### Public Setup
```tsx
import { buildConfig } from 'payload'
import { muxVideoPlugin } from '@oversightstudio/mux-video'

export default buildConfig({
  plugins: [
    muxVideoPlugin({
      enabled: true,
      initSettings: {
        tokenId: process.env.MUX_TOKEN_ID || '',
        tokenSecret: process.env.MUX_TOKEN_SECRET || '',
        webhookSecret: process.env.MUX_WEBHOOK_SIGNING_SECRET || '',
      },
      uploadSettings: {
        cors_origin: process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000',
      },
    }),
  ],
})
```

### Signed URLs Setup
```tsx
import { buildConfig } from 'payload'
import { muxVideoPlugin } from '@oversightstudio/mux-video'

export default buildConfig({
  plugins: [
    muxVideoPlugin({
      enabled: true,
      initSettings: {
        tokenId: process.env.MUX_TOKEN_ID || '',
        tokenSecret: process.env.MUX_TOKEN_SECRET || '',
        webhookSecret: process.env.MUX_WEBHOOK_SIGNING_SECRET || '',
        jwtSigningKey: process.env.MUX_JWT_KEY_ID || '',
        jwtPrivateKey: process.env.MUX_JWT_KEY || '',
      },
      uploadSettings: {
        cors_origin: process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000',
        new_asset_settings: {
          playback_policy: ['signed'],
        },
      },
    }),
  ],
})
```

## Options

| Option                    | Type                                             | Default  | Description                                                                                             |
|---------------------------|--------------------------------------------------|----------|---------------------------------------------------------------------------------------------------------|
| `enabled`                  | `boolean`                                        | **Required** | Whether the plugin is enabled.                                                                         |
| `initSettings`             | `MuxVideoInitSettings`                           | **Required** | Initialization settings for the Mux implementation.                                                    |
| `uploadSettings`           | `MuxVideoUploadSettings`                         | **Required** | Upload settings for Mux video assets.                                                                  |
| `access`                   | `(request: PayloadRequest) => Promise<boolean> \| boolean` | *Optional* | An optional function to determine who can upload files. Should return a boolean or a Promise resolving to a boolean. |
| `signedUrlOptions`         | `MuxVideoSignedUrlOptions`                       | *Optional* | Options for signed URL generation.                                                                     |

### `initSettings` Options 

| Option                | Type        | Default  | Description                                               |
|-----------------------|-------------|----------|-----------------------------------------------------------|
| `tokenId`             | `string`    | **Required** | The Mux token ID.                                        |
| `tokenSecret`         | `string`    | **Required** | The Mux token secret.                                    |
| `webhookSecret`       | `string`    | **Required** | The secret used to validate Mux webhooks.                |
| `jwtSigningKey`       | `string`    | *Optional* | Optional JWT signing key, required for signed URL setup. |
| `jwtPrivateKey`       | `string`    | *Optional* | Optional JWT private key, required for signed URL setup. |
| `gifPreviews`         | `boolean`   | `true`   | Determines whether to enable gif previews for videos on the videos collection list view.

### `uploadSettings` Options

| Option                    | Type                  | Default  | Description                                            |
|---------------------------|-----------------------|----------|--------------------------------------------------------|
| `cors_origin`              | `string`              | **Required** | The required CORS origin for Mux.                       |
| `new_asset_settings`      | `MuxVideoNewAssetSettings` | *Optional* | Additional settings for creating assets in Mux. |

### `new_asset_settings` Options

| Option                        | Type                        | Default  | Description                                                 |
|-------------------------------|-----------------------------|----------|-------------------------------------------------------------|
| `playback_policy`              | `Array<'public' | 'signed'>`  | `public` | Controls the playback policy for uploaded videos. Default is `public`. |

### `signedUrlOptions` Options

| Option                        | Type        | Default  | Description                                                 |
|-------------------------------|-------------|----------|-------------------------------------------------------------|
| `expiration`                  | `string`    | `"1d"`   | Expiration time for signed URLs. Default is `"1d"`.          |

## Credits
* Huge shoutout to [jamesvclements](https://github.com/jamesvclements) for building the initial version of this plugin!
* Shoutout to [Paul](https://github.com/paulpopus) for being a real one.