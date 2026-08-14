# Blur Data URLs Payload Plugin

## Install

```sh
pnpm add @oversightstudio/blur-data-urls sharp
```

## About

This headless Payload plugin generates tiny inline image placeholders whenever an image is uploaded. It adds one hidden text field to each selected upload collection and requires no collection or route of its own. An optional, unstyled Next.js image component for pixelated placeholders is available from a separate `/next` export.

Two placeholder styles are available:

- `blur` is the default. It generates a small blurred PNG that works directly with Next.js `Image` using `placeholder="blur"`.
- `pixel` generates a hard-edged nearest-neighbor WebP, inspired by pixel art. The included Next.js component renders it without smoothing the pixels.

Both styles auto-orient photos from EXIF metadata, preserve existing collection hooks, regenerate when a file is replaced, support Payload's in-memory and temporary-file uploads, and bound generated dimensions to keep data URLs compact.

## Payload Setup

Register the plugin with one or more upload-enabled collections. The default configuration generates blurred placeholders in a hidden `blurDataUrl` field:

```tsx
import { blurDataUrlsPlugin } from '@oversightstudio/blur-data-urls'
import { buildConfig } from 'payload'
import { Media } from './collections/Media'

export default buildConfig({
  plugins: [
    blurDataUrlsPlugin({
      collections: [Media],
    }),
  ],
})
```

The plugin preserves a compatible text field if your collection already defines one. Use `fieldName` when a project prefers another name:

```tsx
blurDataUrlsPlugin({
  collections: [Media],
  fieldName: 'placeholderDataURL',
})
```

## Placeholder Styles

### Blurred Placeholders

The defaults are designed to work without additional configuration. Override them only when the project needs a different result:

```tsx
blurDataUrlsPlugin({
  collections: [Media],
  placeholder: {
    type: 'blur',
    width: 32,
    height: 'auto',
    blur: 18,
  },
})
```

Next.js already supports blurred data URLs natively, so pass the generated value directly to `Image`:

```tsx
<Image
  src={image.url}
  alt={image.alt}
  placeholder={image.blurDataUrl ? 'blur' : 'empty'}
  blurDataURL={image.blurDataUrl ?? undefined}
/>
```

### Pixelated Placeholders

Enable hard-edged pixelated placeholders with `type: 'pixel'`:

```tsx
blurDataUrlsPlugin({
  collections: [Media],
  placeholder: {
    type: 'pixel',
    width: 32,
    quality: 70,
  },
})
```

Next.js applies a blur filter to its native placeholder, which would smooth the hard pixel edges. Use the package's `PlaceholderImage` component instead:

```tsx
import { PlaceholderImage } from '@oversightstudio/blur-data-urls/next'
```

It accepts the standard Next.js `Image` props, so it can replace a regular `Image`. Set `placeholderType="pixel"` and pass the generated data URL:

```tsx
<PlaceholderImage
  src={image.url}
  alt={image.alt}
  placeholderDataURL={image.blurDataUrl}
  placeholderType="pixel"
  fill
/>
```

Pixel mode layers the placeholder beneath the real image until the full image has decoded. Its parent must provide a positioned, stable-size box, as it would for a Next.js `Image` using `fill`.

Customize only the temporary pixel layer when needed:

```tsx
<PlaceholderImage
  {...imageProps}
  placeholderDataURL={image.blurDataUrl}
  placeholderType="pixel"
  placeholderClassName="rounded-xl"
  placeholderStyle={{ backgroundColor: '#111' }}
/>
```

Component-specific props:

| Prop                   | Type                | Default  | Description                                            |
| ---------------------- | ------------------- | -------- | ------------------------------------------------------ |
| `placeholderDataURL`   | `string \| null`    | —        | Generated value stored by the Payload plugin.          |
| `placeholderType`      | `'blur' \| 'pixel'` | `'blur'` | Must match the server plugin's placeholder type.       |
| `placeholderClassName` | `string`            | —        | Class name added only to the temporary pixel layer.    |
| `placeholderStyle`     | `CSSProperties`     | —        | Inline styles added only to the temporary pixel layer. |

Every other prop is passed to Next.js `Image`, except `placeholder` and `blurDataURL`, which the component manages.

The component also supports `placeholderType="blur"` for projects that prefer one image abstraction for both modes, although native Next.js `Image` is the simpler recommendation for ordinary blurred placeholders.

Pixel mode intentionally skips SVG uploads because vector artwork does not benefit from a raster pixel preview. Replacing an existing image with an SVG or non-image file clears the previous placeholder.

## Options

| Option                     | Type                       | Default       | Description                                                               |
| -------------------------- | -------------------------- | ------------- | ------------------------------------------------------------------------- |
| `enabled`                  | `boolean`                  | `true`        | Enable the plugin. `false` is an exact no-op.                             |
| `collections`              | `PluginCollectionConfig[]` | Required      | Upload-enabled collections to extend.                                     |
| `fieldName`                | `string`                   | `blurDataUrl` | Generated text field name.                                                |
| `placeholder`              | `PlaceholderOptions`       | Blur defaults | Select and configure the placeholder style.                               |
| `placeholder.type`         | `'blur' \| 'pixel'`        | `'blur'`      | Visual treatment and output format.                                       |
| `placeholder.width`        | `number`                   | `32`          | Target source width.                                                      |
| `placeholder.maxDimension` | `number`                   | `256`         | Bounds auto-sized output for unusually shaped images.                     |
| `placeholder.height`       | `number \| 'auto'`         | `'auto'`      | Blur mode only. Preserve aspect ratio or stretch to an explicit height.   |
| `placeholder.blur`         | `number`                   | `18`          | Blur mode only. Sharp blur sigma from `0.3` to `1000`.                    |
| `placeholder.quality`      | `number`                   | `70`          | Pixel mode only. WebP quality from `1` to `100`.                          |
| `onError`                  | `'throw' \| 'log'`         | `'throw'`     | Reject failed uploads or log the problem and leave the placeholder empty. |
| `blurOptions`              | `object`                   | —             | Backwards-compatible legacy blur configuration.                           |

`placeholder` and legacy `blurOptions` cannot be used together. Existing configurations such as the following continue to work:

```tsx
blurDataUrlsPlugin({
  collections: [Media],
  blurOptions: { width: 32, height: 'auto', blur: 18 },
})
```

## Existing Uploads

The plugin generates placeholders when files are created or replaced; it does not run an automatic deployment-time backfill. This avoids duplicate processing when an application has multiple server replicas.

For existing media, copy the maintained [backfill script](https://github.com/oversightstudio/payload-plugins/blob/main/scripts/blurDataUrlsMigrationScript.ts) into the Payload application. Configure its collections, field name, and placeholder style to match the plugin, then run:

```sh
tsx src/scripts/backfillImagePlaceholders.ts
```

The script uses the same exported `generatePlaceholderDataUrl` utility as the upload hook, paginates without changing its own result set, limits concurrency, retries fetches, and records individual failures without looping over them forever.

## Custom Generation

The server-side generator is exported for migrations, seeds, or other workflows:

```tsx
import { generatePlaceholderDataUrl } from '@oversightstudio/blur-data-urls'

const dataURL = await generatePlaceholderDataUrl(imageBuffer, {
  type: 'pixel',
  width: 24,
  quality: 70,
})
```

It accepts a `Buffer`, `Uint8Array`, or local file path.
