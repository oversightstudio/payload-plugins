import assert from 'node:assert/strict'
import test from 'node:test'

import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { PlaceholderImage } from '../src/next/index'

const imageProps = {
  alt: 'Example',
  height: 100,
  src: '/example.jpg',
  width: 200,
} as const

test('blur mode uses the generated data URL through Next Image', () => {
  const dataURL = 'data:image/png;base64,iVBORw0KGgo='
  const markup = renderToStaticMarkup(
    createElement(PlaceholderImage, {
      ...imageProps,
      placeholderDataURL: dataURL,
    }),
  )

  assert.match(markup, /data-nimg="1"/)
  assert.ok(markup.includes(dataURL))
  assert.doesNotMatch(markup, /image-rendering:pixelated/)
})

test('pixel mode renders a hidden real image over an un-smoothed placeholder layer', () => {
  const dataURL = 'data:image/webp;base64,UklGRg=='
  const markup = renderToStaticMarkup(
    createElement(PlaceholderImage, {
      ...imageProps,
      className: 'rounded',
      placeholderClassName: 'placeholder',
      placeholderDataURL: dataURL,
      placeholderStyle: { backgroundColor: 'black' },
      placeholderType: 'pixel',
    }),
  )

  assert.ok(markup.includes(dataURL))
  assert.match(markup, /class="rounded placeholder"/)
  assert.match(markup, /image-rendering:pixelated/)
  assert.match(markup, /background-color:black/)
  assert.match(markup, /opacity:0/)
})

test('missing placeholder data behaves like a regular Next Image in either mode', () => {
  const markup = renderToStaticMarkup(
    createElement(PlaceholderImage, {
      ...imageProps,
      placeholderType: 'pixel',
    }),
  )

  assert.match(markup, /data-nimg="1"/)
  assert.doesNotMatch(markup, /aria-hidden="true"/)
  assert.doesNotMatch(markup, /image-rendering:pixelated/)
  assert.doesNotMatch(markup, /opacity:0/)
})
