# @oversightstudio/mux-video

## 1.3.0

### Minor Changes

- 2b1b2c2: \* **Fix**: Include posterTimestamp in JWT claims for signed thumbnail and GIF playback URLs
  - **Feature**: Add support for configurable file extensions for poster images and animated previews

## 1.2.0

### Minor Changes

- 5dee657: \* **Add `extendCollection` option**: Introduces a new configuration option that allows extending an existing collection with Mux video functionality instead of creating a new "mux-video" collection
  - **Fix webhook endpoint for custom API routes**: Properly account for custom API endpoints configured via `routes.api` in Payload config (by @slavanossar)
  - **Add support for `video.asset.updated` webhook**: Handle Mux `video.asset.updated` webhook events to keep video metadata in sync
  - **Dependencies**: Upgrade package dependencies to latest versions

## 1.1.1

### Patch Changes

- 55e7721: Implement better read-access permissions on the MuxVideo collection

## 1.1.0

### Minor Changes

- 5f369a1: ### Added

  - Added `gifUrl` option to playback options.
  - Introduced `adminThumbnail` option, which can be `'gif'`, `'image'`, or `'none'` (default: `'gif'`).

  ### Breaking Change

  - Removed `gifPreviews` option in favor of `adminThumbnail`.

## 1.0.4

### Patch Changes

- 9ee51ba: Update docs.

## 1.0.3

### Patch Changes

- 22ad09c: Remove csm support

## 1.0.2

### Patch Changes

- 7f8ee60: Change build settings.

## 1.0.1

### Patch Changes

- d64b710: Include use client directive where needed.

## 1.0.0

### Major Changes

- f8956e9: Release the Payload Mux Video plugin.
