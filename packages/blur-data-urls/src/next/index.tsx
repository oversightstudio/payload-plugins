'use client'

import NextImage, { type ImageProps } from 'next/image.js'
import { useState, type CSSProperties } from 'react'

export type PlaceholderType = 'blur' | 'pixel'

export type PlaceholderImageProps = Omit<ImageProps, 'blurDataURL' | 'placeholder'> & {
  /** Class name added only to the pixel placeholder layer. */
  placeholderClassName?: string

  /** Generated data URL from the configured Payload field. */
  placeholderDataURL?: null | string

  /** Styles added only to the pixel placeholder layer. */
  placeholderStyle?: CSSProperties

  /** Visual treatment used by the server plugin. @default 'blur' */
  placeholderType?: PlaceholderType
}

// Next's CommonJS entry wraps its default export when loaded directly in Node,
// while the Next bundler exposes the component itself. Support both shapes.
const Image =
  typeof NextImage === 'object' && NextImage !== null && 'default' in NextImage
    ? (NextImage as { default: typeof NextImage }).default
    : NextImage

const joinClassNames = (...values: (string | undefined)[]): string | undefined => {
  const className = values.filter(Boolean).join(' ')
  return className || undefined
}

const getSourceKey = (src: ImageProps['src']): string => {
  if (typeof src === 'string') return src
  return 'default' in src ? src.default.src : src.src
}

export function PlaceholderImage({
  alt,
  className,
  onLoad,
  placeholderClassName,
  placeholderDataURL,
  placeholderStyle,
  placeholderType = 'blur',
  src,
  style,
  ...imageProps
}: PlaceholderImageProps) {
  const sourceKey = getSourceKey(src)
  const [loadedSource, setLoadedSource] = useState<string>()

  if (placeholderType === 'blur') {
    return (
      <Image
        {...imageProps}
        alt={alt}
        blurDataURL={placeholderDataURL ?? undefined}
        className={className}
        onLoad={onLoad}
        placeholder={placeholderDataURL ? 'blur' : 'empty'}
        src={src}
        style={style}
      />
    )
  }

  const showPlaceholder = Boolean(placeholderDataURL && loadedSource !== sourceKey)

  return (
    <>
      {showPlaceholder && (
        // The parent must provide a positioned, stable-size box, just as it
        // would for a Next Image using `fill`.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt=""
          aria-hidden="true"
          className={joinClassNames(className, placeholderClassName)}
          src={placeholderDataURL!}
          style={{
            borderRadius: style?.borderRadius,
            height: '100%',
            imageRendering: 'pixelated',
            inset: 0,
            objectFit: style?.objectFit ?? 'cover',
            objectPosition: style?.objectPosition,
            pointerEvents: 'none',
            position: 'absolute',
            width: '100%',
            ...placeholderStyle,
          }}
        />
      )}

      <Image
        {...imageProps}
        alt={alt}
        className={className}
        onLoad={(event) => {
          event.currentTarget
            .decode()
            .catch(() => undefined)
            .finally(() => setLoadedSource(sourceKey))
          onLoad?.(event)
        }}
        src={src}
        style={{
          ...style,
          opacity: showPlaceholder ? 0 : style?.opacity,
        }}
      />
    </>
  )
}
