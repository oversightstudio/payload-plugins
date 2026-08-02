'use client'

import MuxPlayer from '@mux/mux-player-react'
import MuxUploader from '@mux/mux-uploader-react'
import { useConfig, useDocumentInfo, useForm, useFormFields } from '@payloadcms/ui'
import path from 'path'
import { useCallback, useEffect, useRef, useState } from 'react'
import './mux-uploader.scss'

const ENCODING_POLL_INTERVAL = 5000
const ENCODING_POLL_LIMIT = 36
const ENCODING_SYNC_INTERVAL = 10000
const ENCODING_SYNC_EVERY = ENCODING_SYNC_INTERVAL / ENCODING_POLL_INTERVAL

export const MuxUploaderField = () => {
  const { config } = useConfig()
  const apiUrl = config.routes.api
  const { collectionSlug, id } = useDocumentInfo()
  const hasReloadedAfterEncoding = useRef(false)

  const [uploadId, setUploadId] = useState('')
  const { assetId, setAssetId, title, setTitle, setFile, playbackUrl } = useFormFields(
    ([fields, dispatch]) => ({
      assetId: fields.assetId,
      setAssetId: (assetId: string) =>
        dispatch({ type: 'UPDATE', path: 'assetId', value: assetId }),
      title: fields.title,
      setTitle: (title: string) => dispatch({ type: 'UPDATE', path: 'title', value: title }),
      // file: fields.file,
      setFile: (file: File) => dispatch({ type: 'UPDATE', path: 'file', value: file }),
      playbackUrl: fields['playbackOptions.0.playbackUrl']?.value,
    }),
  )

  const { submit, setProcessing } = useForm()

  const getSignedUrl = useCallback(async () => {
    // Fetch the signed URL from the API
    const response = await fetch(`${apiUrl}/mux/upload`, {
      method: 'POST',
    })

    // Parse the JSON response
    const { id, url } = (await response.json()) as { id: string; url: string }

    // Update the upload ID
    setUploadId(id)

    // Return the URL
    return url
  }, [])

  const onUploadStart = (args: any) => {
    const {
      detail: { file },
    } = args

    // Remove the file extension from the name if it comes from the file input
    const resolvedTitle = (title.value as string) || path.parse(file.name).name

    if (!title.value) {
      setTitle(resolvedTitle)
    }

    setFile(
      new File([], resolvedTitle, {
        type: file.type,
        lastModified: file.lastModified,
      }),
    )
  }

  const onSuccess = async (args: any) => {
    /* Show "Creating..." overlay */
    setProcessing(true)

    /* When the upload succeeded, get the Asset ID from the server */
    let upload = await (
      await fetch(`${apiUrl}/mux/upload?id=${uploadId}`, {
        method: 'get',
      })
    ).json()

    /* Sometimes the upload doesn't have the asset_id yet, poll every second until it does (this should only take a moment) */
    while (!upload.asset_id) {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      upload = await (
        await fetch(`${apiUrl}/mux/upload?id=${uploadId}`, {
          method: 'get',
        })
      ).json()
    }

    const { asset_id } = upload

    /* Dispatch the ID field */
    setAssetId(asset_id)

    /* Submit the form, use timeout to ensure setAssetId has been handled */
    setTimeout(async () => {
      await submit({
        overrides: {
          assetId: asset_id,
        },
      })
    }, 0)
  }

  /* When this is rendered, ensure the default .file-field is hidden */
  /* We can't do this in CSS otherwise it hides .file-field(s) in other collections */
  useEffect(() => {
    if (window) {
      const fileField = document.querySelector('.file-field') as HTMLElement
      if (fileField) {
        fileField.style.display = 'none'
      }
    }
  }, [])

  useEffect(() => {
    if (
      !assetId?.value ||
      playbackUrl ||
      !collectionSlug ||
      !id ||
      hasReloadedAfterEncoding.current
    ) {
      return
    }

    let isMounted = true
    let pollCount = 0
    let interval: number | undefined

    const pollForEncodedVideo = async () => {
      if (pollCount >= ENCODING_POLL_LIMIT) {
        if (interval) {
          window.clearInterval(interval)
        }
        return
      }

      pollCount += 1

      try {
        const shouldSyncWithMux = pollCount % ENCODING_SYNC_EVERY === 0
        const response = await fetch(
          shouldSyncWithMux
            ? `${apiUrl}/mux/sync?id=${encodeURIComponent(id)}`
            : `${apiUrl}/${collectionSlug}/${id}?depth=2&draft=false`,
          shouldSyncWithMux ? { method: 'POST' } : undefined,
        )

        if (!response.ok) {
          return
        }

        const video = await response.json()
        const isReady = shouldSyncWithMux
          ? video?.ready === true
          : Array.isArray(video?.playbackOptions) && video.playbackOptions.length > 0

        if (isMounted && isReady && !hasReloadedAfterEncoding.current) {
          hasReloadedAfterEncoding.current = true
          if (interval) {
            window.clearInterval(interval)
          }
          window.location.reload()
        }
      } catch (err) {
        // Keep the admin UI in the encoding state if the temporary poll fails.
      }
    }

    void pollForEncodedVideo()

    interval = window.setInterval(() => {
      void pollForEncodedVideo()
    }, ENCODING_POLL_INTERVAL)

    return () => {
      isMounted = false
      if (interval) {
        window.clearInterval(interval)
      }
    }
  }, [apiUrl, assetId?.value, collectionSlug, id, playbackUrl])

  //  There are three states: before upload, when we show the uploader. When the asset exists, we show the player. And when the asset is preparing, we show a message.
  return (
    <div className="mux-uploader">
      {!assetId?.value && (
        <MuxUploader
          endpoint={getSignedUrl}
          onUploadStart={onUploadStart}
          onSuccess={onSuccess}
        ></MuxUploader>
      )}

      {(assetId as any)?.value && !playbackUrl && (
        <div className="mux-uploader__processing">
          Video is being encoded. This typically takes less than 90 seconds, please refresh the page
          in a moment
        </div>
      )}
      {playbackUrl && (
        <MuxPlayer src={playbackUrl as string} streamType="on-demand" style={{ height: '60vh' }} />
      )}
    </div>
  )
}

export default MuxUploaderField
