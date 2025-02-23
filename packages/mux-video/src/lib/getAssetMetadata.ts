import { Asset } from '@mux/mux-node/resources/video/assets.mjs'

export const getAssetMetadata = (asset: Asset) => {
  const videoTrack = asset.tracks?.find((track: any) => track.type === 'video')!

  return {
    playbackOptions: asset.playback_ids?.map((value) => ({
      playbackId: value.id,
      playbackPolicy: value.policy,
    })),
    /* Reformat Mux's aspect ratio (e.g. 16:9) to be CSS-friendly (e.g. 16/9) */
    aspectRatio: asset.aspect_ratio!.replace(':', '/'),
    duration: asset.duration,
    ...(videoTrack
      ? {
          maxWidth: videoTrack.max_width,
          maxHeight: videoTrack.max_height,
        }
      : {}),
  } as any
}
