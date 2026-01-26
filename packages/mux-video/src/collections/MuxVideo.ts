import { CollectionConfig } from 'payload'
import getAfterDeleteMuxVideoHook from '../hooks/afterDelete'
import getBeforeChangeMuxVideoHook from '../hooks/beforeChange'
import Mux from '@mux/mux-node'
import { MuxVideoPluginOptions } from '../types'
import { defaultAccessFunction } from '../lib/defaultAccessFunction'

export const MuxVideo = (mux: Mux, pluginOptions: MuxVideoPluginOptions): CollectionConfig => ({
  slug: (pluginOptions.extendCollection as string) ?? 'mux-video',
  labels: {
    singular: 'Video',
    plural: 'Videos',
  },
  access: {
    read: ({ req }) => pluginOptions.access?.(req) ?? defaultAccessFunction(req),
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'muxUploader', 'duration'],
  },
  hooks: {
    afterDelete: [getAfterDeleteMuxVideoHook(mux)],
    beforeChange: [
      getBeforeChangeMuxVideoHook(mux, (pluginOptions.extendCollection as string) ?? 'mux-video'),
    ],
  },
  fields: [
    {
      name: 'muxUploader',
      label: 'Video Preview',
      type: 'ui',
      admin: {
        components: {
          Field: '@oversightstudio/mux-video/elements#MuxUploaderField',
          Cell:
            pluginOptions.adminThumbnail === 'gif'
              ? '@oversightstudio/mux-video/elements#MuxVideoGifCell'
              : pluginOptions.adminThumbnail === 'image'
                ? '@oversightstudio/mux-video/elements#MuxVideoImageCell'
                : undefined,
        },
      },
    },
    {
      name: 'title',
      type: 'text',
      label: 'Title',
      required: true,
      unique: true,
      admin: {
        description: `A unique title for this video that will help you identify it later.`,
      },
    },
    {
      name: 'assetId',
      type: 'text',
      required: true,
      admin: {
        readOnly: true,
        condition: (data) => data.assetId,
      },
    },
    {
      name: 'duration',
      label: 'Duration',
      type: 'number',
      admin: {
        readOnly: true,
        condition: (data) => data.duration,
      },
    },
    {
      name: 'posterTimestamp',
      type: 'number',
      label: 'Poster Timestamp',
      min: 0,
      admin: {
        description:
          'Pick a timestamp (in seconds) from the video to be used as the poster image. When unset, defaults to the middle of the video.',
        // Only show it when playbackId has been set, so users can pick the poster image using the player
        condition: (data) => data.duration,
        step: 0.25,
      },
      validate: (value: any, { siblingData }: any) => {
        if (!siblingData.duration || !value) {
          return true
        }

        return (
          Boolean(siblingData.duration >= value) ||
          'Poster timestamp must be less than the video duration.'
        )
      },
    },
    {
      name: 'aspectRatio',
      label: 'Aspect Ratio',
      type: 'text',
      admin: {
        readOnly: true,
        condition: (data) => data.aspectRatio,
      },
    },
    {
      name: 'maxWidth',
      type: 'number',
      admin: {
        readOnly: true,
        condition: (data) => data.maxWidth,
      },
    },
    {
      name: 'maxHeight',
      type: 'number',
      admin: {
        readOnly: true,
        condition: (data) => data.maxHeight,
      },
    },
    {
      name: 'playbackOptions',
      type: 'array',
      admin: {
        readOnly: true,
        condition: (data) => !!data.playbackOptions,
      },
      fields: [
        {
          name: 'playbackId',
          label: 'Playback ID',
          type: 'text',
          admin: {
            readOnly: true,
          },
        },
        {
          name: 'playbackPolicy',
          label: 'Playback Policy',
          type: 'select',
          options: [
            {
              label: 'signed',
              value: 'signed',
            },
            {
              label: 'public',
              value: 'public',
            },
          ],
          admin: {
            readOnly: true,
          },
        },
        {
          name: 'playbackUrl',
          label: 'Playback URL',
          type: 'text',
          virtual: true,
          admin: {
            hidden: true,
          },
          hooks: {
            afterRead: [
              async ({ siblingData }) => {
                const playbackId = siblingData?.['playbackId']

                if (!playbackId) {
                  return null
                }

                const url = new URL(`https://stream.mux.com/${playbackId}.m3u8`)

                if (siblingData.playbackPolicy === 'signed') {
                  const token = await mux.jwt.signPlaybackId(playbackId, {
                    expiration: pluginOptions.signedUrlOptions?.expiration ?? '1d',
                    type: 'video',
                  })

                  url.searchParams.set('token', token)
                }

                return url.toString()
              },
            ],
          },
        },
        {
          name: 'posterUrl',
          label: 'Poster URL',
          type: 'text',
          virtual: true,
          admin: {
            hidden: true,
          },
          hooks: {
            afterRead: [
              async ({ data, siblingData }) => {
                const playbackId = siblingData?.['playbackId']
                const posterTimestamp = data?.['posterTimestamp']

                if (!playbackId) {
                  return null
                }

                const extension = pluginOptions.posterExtension ?? 'png'

                const url = new URL(`https://image.mux.com/${playbackId}/thumbnail.${extension}`)

                if (typeof posterTimestamp === 'number') {
                  url.searchParams.set('time', posterTimestamp.toString())
                }

                if (siblingData.playbackPolicy === 'signed') {
                  const token = await mux.jwt.signPlaybackId(playbackId, {
                    expiration: pluginOptions.signedUrlOptions?.expiration ?? '1d',
                    type: 'thumbnail',
                  })

                  url.searchParams.set('token', token)
                }

                return url.toString()
              },
            ],
          },
        },
        {
          name: 'gifUrl',
          label: 'Gif URL',
          type: 'text',
          virtual: true,
          admin: {
            hidden: true,
          },
          hooks: {
            afterRead: [
              async ({ data, siblingData }) => {
                const playbackId = siblingData?.['playbackId']
                const posterTimestamp = data?.['posterTimestamp']

                if (!playbackId) {
                  return null
                }

                const extension = pluginOptions.animatedGifExtension ?? 'gif'

                const url = new URL(`https://image.mux.com/${playbackId}/animated.${extension}`)

                if (typeof posterTimestamp === 'number') {
                  url.searchParams.set('time', posterTimestamp.toString())
                }

                if (siblingData.playbackPolicy === 'signed') {
                  const token = await mux.jwt.signPlaybackId(playbackId, {
                    expiration: pluginOptions.signedUrlOptions?.expiration ?? '1d',
                    type: 'gif',
                  })

                  url.searchParams.set('token', token)
                }

                return url.toString()
              },
            ],
          },
        },
      ],
    },
  ],
})
