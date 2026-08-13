import type { Asset } from '@mux/mux-node/resources/video/assets.mjs'

type MuxAssetMetadata = {
  aspectRatio?: string
  duration?: number
  maxHeight?: number
  maxWidth?: number
  playbackOptions?: Array<{
    playbackId: string
    playbackPolicy: 'public' | 'signed'
  }>
}

export const getAssetMetadata = (asset: Asset): MuxAssetMetadata => {
  const videoTrack = asset.tracks?.find((track) => track.type === 'video')

  return {
    ...(asset.playback_ids
      ? {
          playbackOptions: asset.playback_ids
            .filter(
              (value): value is typeof value & { policy: 'public' | 'signed' } =>
                value.policy === 'public' || value.policy === 'signed',
            )
            .map((value) => ({
              playbackId: value.id,
              playbackPolicy: value.policy,
            })),
        }
      : {}),
    /* Reformat Mux's aspect ratio (e.g. 16:9) to be CSS-friendly (e.g. 16/9) */
    ...(asset.aspect_ratio ? { aspectRatio: asset.aspect_ratio.replace(':', '/') } : {}),
    ...(typeof asset.duration === 'number' ? { duration: asset.duration } : {}),
    ...(videoTrack
      ? {
          maxWidth: videoTrack.max_width,
          maxHeight: videoTrack.max_height,
        }
      : {}),
  }
}
