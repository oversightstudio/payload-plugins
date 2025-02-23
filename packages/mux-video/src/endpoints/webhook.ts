import { PayloadHandler } from 'payload'
import { getAssetMetadata } from '../lib/getAssetMetadata'
import Mux from '@mux/mux-node'

export const muxWebhooksHandler =
  (mux: Mux): PayloadHandler =>
  async (req) => {
    if (!req.json) {
      return Response.error()
    }

    const body = await req.json()

    if (!body) {
      return Response.error()
    }

    mux.webhooks.verifySignature(JSON.stringify(body), req.headers)

    const event = body

    if (event.type === 'video.asset.ready' || event.type === 'video.asset.deleted') {
      try {
        const assetId = event.object.id
        const videos = await req.payload.find({
          collection: 'mux-video',
          where: {
            assetId: {
              equals: assetId,
            },
          },
          limit: 1,
          pagination: false,
        })

        if (videos.totalDocs === 0) {
          return new Response('Success!', {
            status: 200,
          })
        }

        const video = videos.docs[0]

        if (event.type === 'video.asset.ready') {
          /* Update the video with the playbackId, aspectRatio, and duration */
          const update = await req.payload.update({
            collection: 'mux-video',
            id: video.id,
            data: {
              ...getAssetMetadata(event.data),
            },
          })
        } else if (event.type === 'video.asset.deleted') {
          await req.payload.delete({
            collection: 'mux-video',
            id: video.id,
          })
        }
      } catch (err: any) {
        return new Response('Error', {
          status: 204,
        })
        //   return res.status(err.status).json(err)
      }
    } else if (event.type === 'video.asset.errored') {
      if (event.data?.errors) {
        console.error(`Error with assetId: ${event.object.id}, logging error and returning 204...`)
        console.error(JSON.stringify(event.data.errors, null, 2))
      }
    } else {
    }

    return new Response('Success!', {
      status: 200,
    })
  }
