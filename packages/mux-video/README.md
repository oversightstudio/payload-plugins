# Mux Video Payload Plugin

## Install

```sh
pnpm add @oversightstudio/mux-video @mux/mux-player-react
```

## About

This plugin adds a Payload video collection backed by Mux, direct uploads, verified webhooks, public or signed playback, admin thumbnails, and optional startup reconciliation.

## Payload Setup

Create Mux API credentials and a webhook pointing to `/api/mux/webhook` (or your custom Payload API prefix).

```tsx
import { muxVideoPlugin } from '@oversightstudio/mux-video'
import { buildConfig } from 'payload'

export default buildConfig({
  plugins: [
    muxVideoPlugin({
      enabled: true,
      initSettings: {
        tokenId: process.env.MUX_TOKEN_ID!,
        tokenSecret: process.env.MUX_TOKEN_SECRET!,
        webhookSecret: process.env.MUX_WEBHOOK_SIGNING_SECRET!,
      },
      uploadSettings: {
        cors_origin: process.env.NEXT_PUBLIC_SERVER_URL!,
        new_asset_settings: { playback_policy: ['public'] },
      },
    }),
  ],
})
```

For signed playback, also provide `jwtSigningKey` and `jwtPrivateKey`, then use `playback_policy: ['signed']`.

## Options

| Option                 | Type                         | Default                | Description                                                    |
| ---------------------- | ---------------------------- | ---------------------- | -------------------------------------------------------------- |
| `enabled`              | `boolean`                    | Required               | Enable the plugin. `false` is an exact no-op.                  |
| `initSettings`         | `MuxVideoInitSettings`       | Required               | Mux API, webhook, and optional signing credentials.            |
| `uploadSettings`       | `MuxVideoUploadSettings`     | Required               | Direct upload settings, including an exact CORS origin.        |
| `extendCollection`     | `string`                     | —                      | Extend an existing collection instead of creating `mux-video`. |
| `access`               | `function`                   | Authenticated users    | Decide who can upload.                                         |
| `signedUrlOptions`     | `object`                     | `{ expiration: '1d' }` | Configure signed playback URLs.                                |
| `posterExtension`      | `'webp' \| 'jpg' \| 'png'`   | `'png'`                | Poster format.                                                 |
| `animatedGifExtension` | `'gif' \| 'webp'`            | `'gif'`                | Animated preview format.                                       |
| `adminThumbnail`       | `'gif' \| 'image' \| 'none'` | `'gif'`                | Collection-list thumbnail type.                                |
| `reconcileOnInit`      | reconciliation mode          | `false`                | Reconcile Payload records with Mux at startup.                 |
| `autoCreateOnWebhook`  | `boolean`                    | `false`                | Create missing Payload records from verified Mux events.       |

## Collection and Frontend Usage

Relate other documents to the generated `mux-video` collection, then pass its playback ID or URL to Mux Player.

```tsx
import MuxPlayer from '@mux/mux-player-react'

;<MuxPlayer playbackId={video.playbackOptions?.[0]?.playbackId} />
```

Deleting a Payload video also deletes its Mux asset. Webhook payloads are signature-verified and size-limited; keep the signing secret private and restrict write access appropriately.
