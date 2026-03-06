import Mux from '@mux/mux-node'
import type { Payload } from 'payload'
import type { MuxVideoPluginOptions } from '../types'
import { getAssetMetadata } from './getAssetMetadata'

export const onInitExtension = async (
  pluginOptions: MuxVideoPluginOptions,
  payload: Payload,
  mux: Mux,
): Promise<void> => {
  try {
    if (pluginOptions.onInitBehavior === 'none') {
      return
    }

    const videos = await mux.video.assets.list()
    const ids = videos.data.map((video) => video.id)
    const collection = (pluginOptions.extendCollection as string) ?? 'mux-video'

    const existingVideos = await payload.find({
      collection,
      where: {
        assetId: {
          in: ids,
        },
      },
      limit: videos.data.length,
    })

    const shouldCreate =
      pluginOptions.onInitBehavior === 'createOnly' ||
      pluginOptions.onInitBehavior === 'createAndDelete'
    const shouldDelete =
      pluginOptions.onInitBehavior === 'deleteOnly' ||
      pluginOptions.onInitBehavior === 'createAndDelete'

    if (shouldCreate) {
      const missingVideos = videos.data.filter(
        (video) => !existingVideos.docs.find((doc) => doc.assetId === video.id),
      )
      payload.logger.info(
        `[payload-mux] Creating missing Mux video entries (${missingVideos.length})...`,
      )

      for (const video of missingVideos) {
        await payload.create({
          collection,
          data: {
            title: `Video ${video.id}`,
            assetId: video.id,
            ...video,
            ...getAssetMetadata(video),
          },
        })
      }
    }

    if (shouldDelete) {
      const extraVideos = await payload.find({
        collection,
        limit: 100,
        where: {
          assetId: {
            not_in: ids,
          },
        },
      })
      payload.logger.info(
        `[payload-mux] Deleting extra Mux video entries (${extraVideos.docs.length})...`,
      )

      for (const video of extraVideos.docs) {
        if (pluginOptions.onInitBehavior === 'createAndDelete') {
          await payload.delete({
            collection,
            id: video.id,
          })
        }
      }
    }
  } catch (err: unknown) {
    payload.logger.error({ err, msg: 'Error in onInitExtension' })
  }
}
