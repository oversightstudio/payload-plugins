# Blur Data URLs Payload Plugin

## Install

```sh
pnpm add @oversightstudio/blur-data-urls sharp
```

## About

This plugin adds a `blurDataUrl` field to selected upload collections and generates a compact PNG placeholder from each newly uploaded original image. Existing collection hooks and configuration are preserved.

## Payload Setup

```tsx
import { blurDataUrlsPlugin } from '@oversightstudio/blur-data-urls'
import { buildConfig } from 'payload'
import { Media } from './collections/Media'

export default buildConfig({
  plugins: [
    blurDataUrlsPlugin({
      collections: [Media],
      blurOptions: { width: 32, height: 'auto', blur: 18 },
    }),
  ],
})
```

## Options

| Option               | Type                       | Default  | Description                                   |
| -------------------- | -------------------------- | -------- | --------------------------------------------- |
| `enabled`            | `boolean`                  | `true`   | Enable the plugin. `false` is an exact no-op. |
| `collections`        | `PluginCollectionConfig[]` | Required | Upload collections to extend.                 |
| `blurOptions.width`  | `number`                   | `32`     | Placeholder width.                            |
| `blurOptions.height` | `number \| 'auto'`         | `'auto'` | Placeholder height or preserved aspect ratio. |
| `blurOptions.blur`   | `number`                   | `18`     | Sharp blur amount.                            |

## Frontend Usage

```tsx
<Image src={image.url} placeholder="blur" blurDataURL={image.blurDataUrl ?? undefined} />
```

To backfill existing uploads, adapt [`scripts/blurDataUrlsMigrationScript.ts`](../../scripts/blurDataUrlsMigrationScript.ts) in your Payload application and run it with `tsx`.
