/**
 * Copy this file to `src/scripts/backfillImagePlaceholders.ts` in a Payload app.
 * Run it with `tsx src/scripts/backfillImagePlaceholders.ts`.
 */

import {
  generatePlaceholderDataUrl,
  type PlaceholderOptions,
} from '@oversightstudio/blur-data-urls'
import { getPayload, type Payload } from 'payload'
import { loadEnv } from 'payload/node'

loadEnv()

const collections = ['media'] as const
const fieldName = 'blurDataUrl'
const placeholder: PlaceholderOptions = { type: 'blur' }
const batchSize = 50
const concurrency = 4
const overwriteExisting = false
const fetchAttempts = 3

const sleep = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds))

const mapWithConcurrency = async <T>(
  values: T[],
  limit: number,
  task: (value: T) => Promise<void>,
): Promise<void> => {
  let index = 0
  const worker = async () => {
    while (index < values.length) {
      const value = values[index]
      index += 1
      await task(value)
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, worker))
}

const resolveSourceURL = (url: string, payload: Payload): string => {
  if (/^https?:\/\//i.test(url)) return url

  const serverURL = payload.config.serverURL || process.env.NEXT_PUBLIC_SERVER_URL
  if (!serverURL) {
    throw new Error(
      `Cannot resolve relative media URL "${url}". Configure serverURL in Payload or NEXT_PUBLIC_SERVER_URL.`,
    )
  }

  return new URL(url, serverURL).toString()
}

const fetchBuffer = async (url: string): Promise<Buffer> => {
  let lastError: unknown

  for (let attempt = 1; attempt <= fetchAttempts; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(30_000) })
      if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`)
      return Buffer.from(await response.arrayBuffer())
    } catch (error) {
      lastError = error
      if (attempt < fetchAttempts) await sleep(250 * 2 ** (attempt - 1))
    }
  }

  throw lastError
}

const backfillCollection = async (payload: Payload, collection: string): Promise<void> => {
  let page = 1
  let processed = 0
  let skipped = 0
  let failed = 0
  let totalPages = 1

  payload.logger.info(`[image-placeholders] Starting ${collection}`)

  do {
    // The query intentionally includes every supported image rather than only
    // missing placeholders. Updating a placeholder therefore does not change
    // pagination while this script is running.
    const result = await payload.find({
      collection: collection as never,
      depth: 0,
      limit: batchSize,
      overrideAccess: true,
      page,
      sort: 'id',
      where: {
        and: [
          { mimeType: { contains: 'image/' } },
          ...(placeholder.type === 'pixel' ? [{ mimeType: { not_equals: 'image/svg+xml' } }] : []),
        ],
      },
    })

    totalPages = result.totalPages

    await mapWithConcurrency(result.docs as Record<string, unknown>[], concurrency, async (doc) => {
      const id = doc.id
      const existing = doc[fieldName]
      if (!overwriteExisting && typeof existing === 'string' && existing.length > 0) {
        skipped += 1
        return
      }

      try {
        if (typeof doc.url !== 'string' || !doc.url) throw new Error('Document has no media URL.')
        const sourceURL = resolveSourceURL(doc.url, payload)
        const dataURL = await generatePlaceholderDataUrl(await fetchBuffer(sourceURL), placeholder)

        await payload.update({
          collection: collection as never,
          data: { [fieldName]: dataURL } as never,
          id: id as never,
          overrideAccess: true,
        })
        processed += 1
      } catch (error) {
        failed += 1
        payload.logger.warn(
          `[image-placeholders] Failed ${collection}/${String(id)}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        )
      }
    })

    payload.logger.info(
      `[image-placeholders] ${collection} page ${page}/${totalPages} (generated=${processed}, skipped=${skipped}, failed=${failed})`,
    )
    page += 1
  } while (page <= totalPages)

  payload.logger.info(
    `[image-placeholders] Finished ${collection} (generated=${processed}, skipped=${skipped}, failed=${failed})`,
  )
}

const run = async (): Promise<void> => {
  const config = await import('../payload.config').then((module) => module.default)
  const payload = await getPayload({ config })

  for (const collection of collections) {
    await backfillCollection(payload, collection)
  }
}

try {
  await run()
} catch (error) {
  console.error(error)
  process.exitCode = 1
}
