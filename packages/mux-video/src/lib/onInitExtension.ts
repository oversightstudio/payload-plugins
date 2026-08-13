import type Mux from '@mux/mux-node'
import type { Asset } from '@mux/mux-node/resources/video/assets.mjs'
import type { Payload } from 'payload'
import type { MuxVideoRuntimeOptions } from '../types'
import { getAssetMetadata } from './getAssetMetadata'

const createReconciliationContext = {
  skipMuxVideoBeforeChangeSync: true,
}

const deleteReconciliationContext = {
  skipMuxVideoAfterDeleteSync: true,
}

type MuxVideoDocument = Record<string, unknown> & {
  assetId?: string
  id: number | string
}

const isNotFoundError = (err: unknown): boolean => {
  if (!err || typeof err !== 'object') {
    return false
  }

  const error = err as {
    error?: { error?: { type?: string }; type?: string }
    status?: number
    type?: string
  }

  return (
    error.status === 404 ||
    error.type === 'not_found' ||
    error.error?.type === 'not_found' ||
    error.error?.error?.type === 'not_found'
  )
}

export const reconcileMuxVideos = async (
  pluginOptions: MuxVideoRuntimeOptions,
  payload: Payload,
  mux: Mux,
): Promise<void> => {
  const behavior = pluginOptions.reconcileOnInit

  if (!behavior) {
    return
  }

  try {
    payload.logger.info(`[payload-mux] Starting background reconciliation (${behavior})...`)

    const shouldCreate = behavior === 'createMissing' || behavior === 'createMissingAndDeleteStale'
    const shouldDelete = behavior === 'deleteStale' || behavior === 'createMissingAndDeleteStale'
    const collection = (pluginOptions.extendCollection as string) ?? 'mux-video'
    const muxVideos = new Map<string, Asset>()
    let createdCount = 0
    let deletedCount = 0

    // Mux's async iterator follows every page. Complete the remote snapshot before mutating
    // Payload so a partial list can never be mistaken for deleted remote assets.
    for await (const video of mux.video.assets.list()) {
      muxVideos.set(video.id, video)
    }

    const existingVideos = (await payload.find({
      collection,
      depth: 0,
      overrideAccess: true,
      pagination: false,
    } as never)) as unknown as { docs: MuxVideoDocument[] }
    const existingAssetIds = new Set(
      existingVideos.docs
        .map((video) => video.assetId)
        .filter((assetId): assetId is string => typeof assetId === 'string'),
    )

    if (shouldCreate) {
      const missingVideos = [...muxVideos.values()].filter(
        (video) => !existingAssetIds.has(video.id),
      )
      payload.logger.info(
        `[payload-mux] Creating missing Mux video entries (${missingVideos.length})...`,
      )

      for (const video of missingVideos) {
        try {
          await payload.create({
            collection,
            context: createReconciliationContext,
            data: {
              title: `Video ${video.id}`,
              assetId: video.id,
              ...getAssetMetadata(video),
            },
            overrideAccess: true,
          } as never)
          createdCount += 1
        } catch (err) {
          // Multiple app replicas can reconcile simultaneously. The unique asset ID turns a
          // losing create into an expected race; only suppress it if the document now exists.
          const concurrentlyCreated = await payload.find({
            collection,
            depth: 0,
            limit: 1,
            overrideAccess: true,
            where: {
              assetId: {
                equals: video.id,
              },
            },
          } as never)

          if (concurrentlyCreated.totalDocs === 0) {
            throw err
          }
        }
      }
    }

    if (shouldDelete) {
      const extraVideos = existingVideos.docs.filter(
        (video) => typeof video.assetId === 'string' && !muxVideos.has(video.assetId),
      )
      payload.logger.info(
        `[payload-mux] Checking stale Payload video entries (${extraVideos.length})...`,
      )

      for (const video of extraVideos) {
        const assetId = video.assetId as string

        try {
          // Protect against an eventually consistent or stale list result before deleting locally.
          await mux.video.assets.retrieve(assetId)
          continue
        } catch (err) {
          if (!isNotFoundError(err)) {
            payload.logger.error({
              err,
              msg: `[payload-mux] Unable to verify Mux asset ${assetId}; keeping its Payload entry`,
            })
            continue
          }
        }

        try {
          await payload.delete({
            collection,
            context: deleteReconciliationContext,
            id: video.id,
            overrideAccess: true,
          } as never)
          deletedCount += 1
        } catch (err) {
          // Another replica may have removed the same stale entry after our snapshot.
          const stillExists = await payload.find({
            collection,
            depth: 0,
            limit: 1,
            overrideAccess: true,
            where: {
              id: {
                equals: video.id,
              },
            },
          } as never)

          if (stillExists.totalDocs > 0) {
            throw err
          }
        }
      }
    }

    payload.logger.info(
      `[payload-mux] Background reconciliation complete (${createdCount} created, ${deletedCount} deleted)`,
    )
  } catch (err: unknown) {
    payload.logger.error({ err, msg: '[payload-mux] Error during background reconciliation' })
  }
}

export const onInitExtension = (
  pluginOptions: MuxVideoRuntimeOptions,
  payload: Payload,
  mux: Mux,
): void => {
  if (!pluginOptions.reconcileOnInit) {
    return
  }

  void reconcileMuxVideos(pluginOptions, payload, mux)
}
