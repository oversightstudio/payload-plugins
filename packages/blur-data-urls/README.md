# Blur Data URLs Payload Plugin

## Install

`pnpm add @oversightstudio/blur-data-urls sharp`

## About
This plugin automatically assigns URLs for blur data to media collections in Payload. It will automatically add the ``blurDataUrl`` field to the collections you provide and automatically generate and assign a blurDataUrl to the field whenever a media item is uploaded.

## Payload Setup 
```tsx
import { buildConfig } from 'payload'
import { blurDataUrlsPlugin } from '@oversightstudio/blur-data-urls'
import { Media } from './collections/Media'

export default buildConfig({
  plugins: [
    blurDataUrlsPlugin({
        enabled: true,
        collections: [Media],
        // Blur data URLs Settings (Optional) 
        blurOptions: {
            blur: 18,
            width: 32,
            height: "auto",
        }
    }),
  ],
})
```

## Options 

| Option            | Type                             | Default  | Description |
|------------------|--------------------------------|----------|-------------|
| `enabled`       | `boolean`                      | `true`   | Whether the plugin is enabled. |
| `collections`   | `PluginCollectionConfig[]`     | **Required** | A list of collections where `blurDataUrl` should be implemented. Should typically be the main media collection. |
| `blurOptions`   | `object`                       | *Optional* | Additional settings for generating blurDataUrls. |

### `blurOptions` Settings

| Option  | Type              | Default | Description |
|---------|-----------------|---------|-------------|
| `width`  | `number`        | `32`    | Width of the blurDataUrl. |
| `height` | `number` \| `'auto'` | `'auto'` | Height of the blurDataUrl. If `'auto'`, it maintains the image’s aspect ratio. |
| `blur`   | `number`        | `18`    | The amount of blur applied to the generated blurDataUrl. |

## Usage with next/image
```tsx
import Image from 'next/image'

<Image
// Your other image settings
placeholder="blur"
blurDataURL={image.blurDataUrl ?? undefined}
/>
```

## Generating BlurData URLs for Existing Images
If you already have images in your media collection, you might want to generate blurDataUrls for them.

To do so:
1. Place [this script](scripts/generateBlurDataUrls.ts) on your `./src/scripts/ directory`.
2. Make sure you have `tsx` installed either globally or on your project. You can uninstall it after running the script.
3. Modify the plugin configuration **on the script**. You'll be able to set the blur options + which collections to migrate. 
4. Run the script: ``tsx ./src/scripts/blurDataUrlsMigrationScript.ts``
5. Let it cook.

## Credits
* Shoutout to [Paul](https://github.com/paulpopus) for being a real one.